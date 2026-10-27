/**
 * @file messages.ts
 * @description Routes pour la messagerie instantanée (envoi, lecture, fin de discussion) et le endpoint WebSocket.
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
import { jwtKey } from "../config.ts";
import { query } from "../db.ts";
import { User } from "../types.ts";
import {
  isValidMessageContent,
  MAX_MESSAGE_LENGTH,
} from "../utils/validators.ts";
import {
  connectedUsers,
  notifyUser,
  startHeartbeat,
  userLastPong,
} from "../services/websocket.ts";

const router = new Router();

/**
 * Gère la connexion WebSocket temps réel et l'authentification par token.
 */
router.get("/ws/:userId", async (ctx) => {
  if (!ctx.isUpgradable) ctx.throw(400, "Connexion non upgradable");

  const userId = parseInt(ctx.params.userId, 10);
  const token = ctx.request.url.searchParams.get("token");

  if (!token) {
    ctx.response.status = 401;
    return;
  }

  try {
    const payload = await verify(token, jwtKey);
    if (payload.id !== userId) {
      ctx.response.status = 403;
      return;
    }
  } catch (_err) {
    ctx.response.status = 401;
    return;
  }

  const socket = ctx.upgrade();
  socket.onopen = () => {
    connectedUsers.set(userId, socket);
    userLastPong.set(userId, Date.now());
    startHeartbeat();
    console.log(`✅ WebSocket connecté pour user ${userId}`);
  };
  socket.onclose = () => {
    connectedUsers.delete(userId);
    userLastPong.delete(userId);
    console.log(`🔌 WebSocket déconnecté pour user ${userId}`);
  };
  socket.onerror = (e) => console.error("⚠️ Erreur WS :", e);
  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "pong") {
        userLastPong.set(userId, Date.now());
      }
    } catch (_err) {
      // Ignorer les erreurs de parsing du message pong
    }
  };
});

/**
 * Récupère tous les messages de l'utilisateur connecté.
 */
router.get("/api/messages", async (ctx) => {
  const r = await query(
    `SELECT m.*, 
            u1.name as sender_name, u1.photo_url as sender_photo,
            u2.name as receiver_name, u2.photo_url as receiver_photo,
            i.name as item_name, 
            i.photo_url as item_photo,
            i.owner_id as item_owner_id,
            t.status as loan_status,
            t.end_requested_by as loan_end_requested_by
     FROM messages m 
     JOIN users u1 ON m.sender_id=u1.id 
     JOIN users u2 ON m.receiver_id=u2.id
     JOIN items i ON m.item_id=i.id
     LEFT JOIN transactions t ON m.loan_id = t.id
     WHERE (m.sender_id=$1 OR m.receiver_id=$1) AND i.status NOT IN ('deleted', 'borrowed') 
     ORDER BY m.created_at ASC`,
    [ctx.state.userId],
  );
  ctx.response.body = r.rows;
});

/**
 * Marque un message comme lu.
 */
router.patch("/api/messages/:id/read", async (ctx) => {
  try {
    await query(
      "UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE id=$1 AND receiver_id=$2",
      [ctx.params.id, ctx.state.userId],
    );
    ctx.response.body = { success: true };
  } catch (_err) {
    ctx.response.status = 500;
  }
});

/**
 * Envoie un nouveau message texte.
 */
router.post("/api/messages", async (ctx) => {
  try {
    const { item_id, receiver_id, content } = await ctx.request.body({
      type: "json",
    }).value;
    const sender_id = ctx.state.userId;

    if (!isValidMessageContent(content)) {
      ctx.response.status = 400;
      ctx.response.body = {
        message:
          `Le message doit contenir entre 1 et ${MAX_MESSAGE_LENGTH} caractères.`,
      };
      return;
    }
    if (Number(receiver_id) === Number(sender_id)) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "Vous ne pouvez pas vous envoyer un message à vous-même.",
      };
      return;
    }
    const receiverRes = await query(
      "SELECT id FROM users WHERE id=$1",
      [receiver_id],
    );
    if (receiverRes.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Destinataire introuvable." };
      return;
    }

    // Vérifie si l'objet existe encore
    const itemRes = await query(
      "SELECT id, status FROM items WHERE id=$1",
      [item_id],
    );
    if (itemRes.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        message: "Cet objet n'existe plus. La discussion est fermée.",
      };
      return;
    }
    const item = itemRes.rows[0] as { status: string };
    if (item.status === "deleted") {
      ctx.response.status = 410;
      ctx.response.body = {
        message: "Cet objet a été supprimé. La discussion est fermée.",
      };
      return;
    }

    await query(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content) VALUES ($1,$2,$3,$4)",
      [item_id, sender_id, receiver_id, content],
    );

    // Notification en temps réel au destinataire via WebSocket helper
    const sRes = await query(
      "SELECT name FROM users WHERE id=$1",
      [sender_id],
    );
    const senderName = (sRes.rows[0] as User).name;
    notifyUser(receiver_id, "NEW_MESSAGE", {
      item_id,
      sender_id,
      content,
      sender_name: senderName,
    });
    ctx.response.body = { message: "Message envoyé." };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

/**
 * Marque tous les messages d'une discussion comme lus pour l'utilisateur connecté.
 */
router.post("/api/messages/read-all", async (ctx) => {
  try {
    const { item_id } = await ctx.request.body({ type: "json" }).value;
    const user_id = ctx.state.userId;
    await query(
      "UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE item_id=$1 AND receiver_id=$2 AND is_read=false",
      [item_id, user_id],
    );
    ctx.response.body = { success: true };
  } catch (_err) {
    ctx.response.status = 500;
  }
});

/**
 * Supprime l'historique d'une discussion pour l'utilisateur connecté.
 * L'utilisateur ne peut supprimer que sa propre participation à la discussion.
 */
router.post("/api/messages/end-discussion", async (ctx) => {
  try {
    const { item_id } = await ctx.request.body({ type: "json" }).value;
    const user_id = ctx.state.userId;

    if (!item_id) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'ID de l'objet est obligatoire." };
      return;
    }

    // Supprimer les messages où l'utilisateur est expéditeur ou destinataire pour cet objet.
    await query(
      "DELETE FROM messages WHERE item_id=$1 AND receiver_id=$2",
      [item_id, user_id],
    );
    ctx.response.body = { success: true };
  } catch (e) {
    console.error("❌ Erreur fin discussion:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la suppression de la discussion.",
    };
  }
});

export default router;
