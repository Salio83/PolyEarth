/**
 * @file loans.ts
 * @description Routes pour la gestion des prêts (acceptation, refus, fin de prêt, retard, demande d'extension).
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { client } from "../db.ts";
import { Message, Transaction } from "../types.ts";
import { notifyUser } from "../services/websocket.ts";

const router = new Router();

/**
 * Récupère tous les prêts (emprunts et dons) d'un utilisateur.
 */
router.get("/api/loans/user/:userId", async (ctx) => {
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, i.photo_url as item_photo, i.status as item_status, 
            ub.name as borrower_name, ub.photo_url as borrower_photo,
            uo.name as owner_name, uo.photo_url as owner_photo
     FROM transactions t 
     LEFT JOIN items i ON t.item_id=i.id 
     LEFT JOIN users ub ON t.borrower_id=ub.id 
     LEFT JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) ORDER BY t.created_at DESC`,
    [ctx.params.userId],
  );
  ctx.response.body = r.rows;
});

/**
 * Met à jour le statut d'un prêt (accepter, refuser, terminer, etc.).
 * Vérifie que l'utilisateur fait partie de la transaction (ownership).
 */
router.patch("/api/loans/:id", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { status } = body;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id, 10);

    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }

    const txRes0 = await client.queryObject(
      "SELECT * FROM transactions WHERE id=$1",
      [loanId],
    );
    const tx = txRes0.rows[0] as Transaction;

    if (!tx) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return;
    }

    // VÉRIFICATION DE OWNERSHIP : l'utilisateur doit être soit emprunteur soit propriétaire
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = {
        message: "Vous ne pouvez modifier que vos propres prêts.",
      };
      return;
    }

    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;

    // Retrouve l'ID de l'objet utilisé dans la discussion originale
    const origMsgRes = await client.queryObject(
      "SELECT item_id FROM messages WHERE loan_id=$1 AND type='loan_request' LIMIT 1",
      [loanId],
    );
    const discussionItemId = origMsgRes.rows.length > 0
      ? (origMsgRes.rows[0] as Message).item_id
      : tx.item_id;

    if (status === "accepted") {
      await client.queryObject(
        "UPDATE transactions SET status='accepted' WHERE id=$1",
        [loanId],
      );
      await client.queryObject(
        "UPDATE items SET status='reserved' WHERE id=$1",
        [tx.item_id],
      );
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [
          discussionItemId,
          requester_id,
          otherId,
          "✅ Prêt accepté ! Coordonnez la remise de l'objet.",
          tx.id,
        ],
      );
      // Incrémentation du compteur de transactions pour les deux utilisateurs
      await client.queryObject(
        "UPDATE users SET transaction_count=transaction_count+1 WHERE id=$1 OR id=$2",
        [tx.owner_id, tx.borrower_id],
      );

      notifyUser(otherId, "LOAN_ACCEPTED", { item_id: discussionItemId });
    } else if (status === "rejected") {
      await client.queryObject(
        "UPDATE transactions SET status='rejected' WHERE id=$1",
        [loanId],
      );
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [
          discussionItemId,
          requester_id,
          otherId,
          "❌ Demande de prêt refusée.",
          tx.id,
        ],
      );

      notifyUser(otherId, "LOAN_REJECTED", { item_id: discussionItemId });
    } else if (status === "request_end") {
      // Demande de fin de prêt initiée par l'un des deux
      await client.queryObject(
        "UPDATE transactions SET end_requested_by=$1 WHERE id=$2",
        [requester_id, loanId],
      );
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'end_request',$5)",
        [
          discussionItemId,
          requester_id,
          otherId,
          "🏁 Demande de fin de prêt — l'objet a-t-il bien été rendu ?",
          tx.id,
        ],
      );

      notifyUser(otherId, "NEW_MESSAGE", {
        item_id: discussionItemId,
        sender_name: "un utilisateur",
      });
    } else if (status === "completed") {
      // Fin de prêt confirmée
      await client.queryObject(
        "UPDATE transactions SET status='completed', end_requested_by=NULL WHERE id=$1",
        [loanId],
      );
      await client.queryObject(
        "UPDATE items SET status='borrowed' WHERE id=$1",
        [tx.item_id],
      );
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'✅ Prêt terminé avec succès. Merci !','system',$4)",
        [discussionItemId, requester_id, otherId, tx.id],
      );

      notifyUser(otherId, "DISCUSSION_ENDED", {
        item_id: discussionItemId,
        loan_id: tx.id,
        other_id: requester_id,
      });
    }

    ctx.response.body = { success: true };
  } catch (e) {
    console.error("❌ Erreur mise à jour prêt:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la mise à jour du prêt. Veuillez réessayer.",
    };
  }
});

/**
 * Récupère les prêts en retard pour un utilisateur.
 */
router.get("/api/loans/overdue/:userId", async (ctx) => {
  const today = new Date().toISOString().split("T")[0];
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, ub.name as borrower_name, uo.name as owner_name
     FROM transactions t 
     LEFT JOIN items i ON t.item_id=i.id 
     LEFT JOIN users ub ON t.borrower_id=ub.id 
     LEFT JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) AND t.status='accepted' AND t.end_date IS NOT NULL AND t.end_date < $2
     ORDER BY t.end_date ASC`,
    [ctx.params.userId, today],
  );
  ctx.response.body = r.rows;
});

/**
 * Demande une extension de la durée de prêt.
 * Vérifie que l'utilisateur fait partie de la transaction.
 */
router.post("/api/loans/:id/extend", async (ctx) => {
  try {
    const { new_end_date } = await ctx.request.body({ type: "json" }).value;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id, 10);

    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }

    const txRes = await client.queryObject(
      "SELECT * FROM transactions WHERE id=$1",
      [loanId],
    );
    const tx = txRes.rows[0] as Transaction;

    if (!tx) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return;
    }

    // VÉRIFICATION DE OWNERSHIP
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = {
        message:
          "Vous ne pouvez demander une extension que pour vos propres prêts.",
      };
      return;
    }

    if (!new_end_date) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "La nouvelle date de fin est obligatoire.",
      };
      return;
    }

    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    const meta = JSON.stringify({ new_end_date });

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'extension_request',$5,$6)",
      [
        tx.item_id,
        requester_id,
        otherId,
        `📅 Extension de prêt demandée jusqu'au ${fmt(new_end_date)}`,
        tx.id,
        meta,
      ],
    );

    notifyUser(otherId, "NEW_MESSAGE", {
      item_id: tx.item_id,
      sender_name: "un utilisateur",
    });

    ctx.response.body = { success: true };
  } catch (e) {
    console.error("❌ Erreur extension:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la demande d'extension. Veuillez réessayer.",
    };
  }
});

/**
 * Accepte ou refuse une demande d'extension.
 * Vérifie que l'utilisateur fait partie de la transaction.
 */
router.patch("/api/loans/:id/extend", async (ctx) => {
  try {
    const { action, new_end_date } = await ctx.request.body({ type: "json" })
      .value;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id, 10);

    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }

    const txRes = await client.queryObject(
      "SELECT * FROM transactions WHERE id=$1",
      [loanId],
    );
    const tx = txRes.rows[0] as Transaction;

    if (!tx) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return;
    }

    // VÉRIFICATION DE OWNERSHIP
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = {
        message:
          "Vous ne pouvez répondre à cette extension que pour vos propres prêts.",
      };
      return;
    }

    if (action === "accept") {
      if (!new_end_date) {
        ctx.response.status = 400;
        ctx.response.body = {
          message: "La nouvelle date de fin est obligatoire pour accepter.",
        };
        return;
      }
      await client.queryObject(
        "UPDATE transactions SET end_date=$1 WHERE id=$2",
        [new_end_date, loanId],
      );
      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'system',$5)",
        [
          tx.item_id,
          requester_id,
          tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id,
          `✅ Extension acceptée jusqu'au ${fmt(new_end_date)}`,
          tx.id,
        ],
      );
    } else {
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'❌ Extension refusée.','system',$4)",
        [
          tx.item_id,
          requester_id,
          tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id,
          tx.id,
        ],
      );
    }

    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    notifyUser(otherId, "NEW_MESSAGE", {
      item_id: tx.item_id,
      sender_name: "un utilisateur",
    });

    ctx.response.body = { success: true };
  } catch (e) {
    console.error("❌ Erreur extension:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la réponse à l'extension. Veuillez réessayer.",
    };
  }
});

/**
 * Récupère la transaction active (en attente ou acceptée) pour un objet et une paire d'utilisateurs.
 */
router.get("/api/loans/active/:itemId/:userId", async (ctx) => {
  try {
    const { itemId, userId } = ctx.params;
    const otherId = ctx.request.url.searchParams.get("otherId");
    const r = await client.queryObject(
      `SELECT t.* FROM transactions t 
       WHERE t.id IN (
         SELECT loan_id FROM messages 
         WHERE item_id = $1 
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
         AND loan_id IS NOT NULL
       )
       AND t.status IN ('pending', 'accepted')
       ORDER BY t.created_at DESC LIMIT 1`,
      [itemId, userId, otherId],
    );
    ctx.response.body = r.rows[0] || {};
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

export default router;
