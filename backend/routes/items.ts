/**
 * @file items.ts
 * @description Routes pour la gestion des annonces d'objets (création, modification, réservation, proposition).
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { client } from "../db.ts";
import { Item, Transaction } from "../types.ts";
import { connectedUsers, notifyUser } from "../services/websocket.ts";

const router = new Router();

/**
 * Liste les annonces avec filtres (catégorie, recherche, type, propriétaire).
 */
router.get("/api/items", async (ctx) => {
  const category = ctx.request.url.searchParams.get("category");
  const search = ctx.request.url.searchParams.get("search");
  const type = ctx.request.url.searchParams.get("type") || "offer";
  const ownerId = ctx.request.url.searchParams.get("owner_id");

  let query =
    `SELECT i.*, u.name as owner_name, u.photo_url as owner_photo, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.status != 'deleted'`;
  const params: unknown[] = [];

  if (ownerId) {
    params.push(parseInt(ownerId, 10));
    query += ` AND i.owner_id=$${params.length}`;
  } else {
    query += ` AND i.status='available'`;
    params.push(type);
    query += ` AND i.type=$${params.length}`;
    if (category && category !== "all") {
      params.push(category);
      query += ` AND i.category=$${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query +=
        ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length})`;
    }
  }

  query += " ORDER BY i.id DESC";
  ctx.response.body = (await client.queryObject(query, params)).rows;
});

/**
 * Crée une nouvelle annonce.
 */
router.post("/api/items", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value as {
      name: string;
      description: string;
      category: string;
      quality?: string;
      photo_url?: string;
      available_from?: string;
      available_until?: string;
      type?: string;
    } | undefined;
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Corps de requête invalide." };
      return;
    }
    const userId = ctx.state.userId;
    const r = await client.queryObject(
      "INSERT INTO items (name,description,owner_id,category,quality,photo_url,available_from,available_until,type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [
        body.name,
        body.description,
        parseInt(userId!, 10),
        body.category,
        body.quality || "good",
        body.photo_url || null,
        body.available_from || null,
        body.available_until || null,
        body.type || "offer",
      ],
    );
    ctx.response.body = r.rows[0] as object;
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la création de l'annonce." };
  }
});

/**
 * Récupère les détails d'une annonce spécifique.
 */
router.get("/api/items/:id", async (ctx) => {
  const r = await client.queryObject(
    `SELECT i.*, u.name as owner_name, u.email as owner_email, u.photo_url as owner_photo, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.id=$1 AND i.status != 'deleted'`,
    [ctx.params.id],
  );
  if (!r.rows[0]) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Objet non trouvé." };
    return;
  }
  ctx.response.body = r.rows[0];
});

/**
 * Met à jour le statut d'une annonce (disponible, réservé, etc.).
 * Vérifie que l'utilisateur est bien le propriétaire.
 */
router.patch("/api/items/:id/status", async (ctx) => {
  try {
    const { status } = await ctx.request.body({ type: "json" }).value;
    const userId = ctx.state.userId;

    // Vérification de la propriété
    const itemRes = await client.queryObject(
      "SELECT owner_id FROM items WHERE id=$1",
      [ctx.params.id],
    );
    if (itemRes.rows.length === 0) {
      ctx.response.status = 404;
      return;
    }
    if ((itemRes.rows[0] as Item).owner_id !== parseInt(userId!, 10)) {
      ctx.response.status = 403;
      return;
    }

    await client.queryObject("UPDATE items SET status=$1 WHERE id=$2", [
      status,
      ctx.params.id,
    ]);
    ctx.response.body = { success: true };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

/**
 * Supprime une annonce (soft delete).
 * Annule également les transactions en cours liées à cet objet.
 */
router.delete("/api/items/:id", async (ctx) => {
  const userId = ctx.state.userId;
  try {
    const itemRes = await client.queryObject(
      "SELECT id, status FROM items WHERE id=$1 AND owner_id=$2",
      [ctx.params.id, userId],
    );
    if (itemRes.rows.length === 0) {
      ctx.response.status = 403;
      ctx.response.body = {
        message: "Vous n'avez pas l'autorisation de supprimer cet objet.",
      };
      return;
    }

    // Suppression logique : changement du statut à 'deleted'
    await client.queryObject("UPDATE items SET status='deleted' WHERE id=$1", [
      ctx.params.id,
    ]);

    // Annulation des transactions en cours (en attente ou acceptées)
    await client.queryObject(
      "UPDATE transactions SET status='rejected' WHERE item_id=$1 AND status IN ('pending', 'accepted')",
      [ctx.params.id],
    );

    ctx.response.body = { message: "Annonce supprimée." };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la suppression." };
  }
});

/**
 * Réserve un objet (crée une demande de prêt).
 * Utilise une transaction SQL pour éviter les race conditions.
 */
router.post("/api/items/:id/reserve", async (ctx) => {
  try {
    const { start_date, end_date } = await ctx.request.body({ type: "json" })
      .value;
    const borrower_id = ctx.state.userId;
    const itemId = parseInt(ctx.params.id, 10);

    // Vérifications de base
    if (isNaN(itemId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID d'objet invalide." };
      return;
    }

    // Démarrer une transaction SQL manuelle
    await client.queryObject("BEGIN");

    try {
      // Verrouiller la ligne de l'item pour la transaction
      const itemRes = await client.queryObject(
        "SELECT owner_id, status FROM items WHERE id=$1 FOR UPDATE",
        [itemId],
      );
      const item = itemRes.rows[0] as Item;

      if (!item) {
        await client.queryObject("ROLLBACK");
        ctx.response.status = 404;
        ctx.response.body = { message: "Objet introuvable." };
        return;
      }
      if (item.status === "deleted") {
        await client.queryObject("ROLLBACK");
        ctx.response.status = 410;
        ctx.response.body = { message: "Cet objet a été supprimé." };
        return;
      }
      if (item.status !== "available") {
        await client.queryObject("ROLLBACK");
        ctx.response.status = 409;
        ctx.response.body = { message: "Cet objet n'est plus disponible." };
        return;
      }
      if (item.owner_id === borrower_id) {
        await client.queryObject("ROLLBACK");
        ctx.response.status = 403;
        ctx.response.body = {
          message: "Vous ne pouvez pas emprunter votre propre objet.",
        };
        return;
      }

      // Vérifier l'absence de demande en cours (avec verrouillage)
      const existing = await client.queryObject(
        "SELECT id FROM transactions WHERE item_id=$1 AND borrower_id=$2 AND status IN ('pending','accepted') FOR UPDATE",
        [itemId, borrower_id],
      );
      if (existing.rows.length > 0) {
        await client.queryObject("ROLLBACK");
        ctx.response.status = 409;
        ctx.response.body = {
          message: "Vous avez déjà une demande en cours pour cet objet.",
        };
        return;
      }

      // Création de la transaction
      const txRes = await client.queryObject(
        "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
        [
          itemId,
          borrower_id,
          item.owner_id,
          start_date || null,
          end_date || null,
        ],
      );
      const newTx = txRes.rows[0] as Transaction;

      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      const msgContent = start_date
        ? `📅 Demande de prêt du ${fmt(start_date)} au ${fmt(end_date)}`
        : "📅 Demande de prêt";
      const meta = JSON.stringify({
        start_date: start_date || null,
        end_date: end_date || null,
      });

      // Envoi du message de notification dans la discussion
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
        [itemId, borrower_id, item.owner_id, msgContent, newTx.id, meta],
      );

      // Valider la transaction
      await client.queryObject("COMMIT");

      // Notification WebSocket en temps réel (après commit)
      notifyUser(item.owner_id, "LOAN_REQUEST", { item_id: itemId });

      ctx.response.body = newTx;
    } catch (e) {
      await client.queryObject("ROLLBACK");
      throw e;
    }
  } catch (e) {
    console.error("❌ Erreur réservation:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la réservation. Veuillez réessayer.",
    };
  }
});

/**
 * Propose un prêt en réponse à une demande d'objet.
 */
router.post("/api/items/:id/propose", async (ctx) => {
  try {
    const {
      item_name,
      item_desc,
      start_date,
      end_date,
      discussion_item_id,
      borrower_id,
    } = await ctx.request.body({ type: "json" }).value;
    const lender_id = ctx.state.userId;
    if (!borrower_id) {
      ctx.response.status = 400;
      return;
    }

    // Création de la transaction
    const txRes = await client.queryObject(
      "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
      [
        ctx.params.id,
        borrower_id,
        lender_id,
        start_date || null,
        end_date || null,
      ],
    );

    const msgContent = `🤝 Proposition de prêt : ${item_name}`;
    const meta = JSON.stringify({
      start_date: start_date || null,
      end_date: end_date || null,
      item_name,
      item_desc,
    });

    // Utilisation de l'ID de discussion fourni (si l'objet prêté n'est pas celui de la discussion originale)
    const messageItemId = discussion_item_id || ctx.params.id;

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
      [
        messageItemId,
        lender_id,
        borrower_id,
        msgContent,
        (txRes.rows[0] as Transaction).id,
        meta,
      ],
    );

    const borrowerSocket = connectedUsers.get(borrower_id);
    if (borrowerSocket) {
      borrowerSocket.send(
        JSON.stringify({
          type: "LOAN_REQUEST",
          data: { item_id: messageItemId },
        }),
      );
    }

    ctx.response.body = {
      message: "Proposition envoyée.",
      loan_id: (txRes.rows[0] as Transaction).id,
    };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

export default router;
