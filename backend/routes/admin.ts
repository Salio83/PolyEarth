/**
 * @file admin.ts
 * @description Routeur pour les opérations d'administration de PolyEarth.
 */

import { Router, Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { client } from "../db.ts";
import { User } from "../types.ts";

const router = new Router();

/**
 * Middleware pour s'assurer que l'utilisateur est un administrateur.
 */
async function checkAdmin(ctx: Context, next: Next) {
  const userId = ctx.state.userId;
  if (!userId) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Non autorisé" };
    return;
  }

  try {
    const res = await client.queryObject(
      "SELECT is_admin FROM users WHERE id=$1",
      [userId]
    );
    const user = res.rows[0] as User;
    if (!user || user.is_admin !== true) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Accès refusé - Réservé aux administrateurs" };
      return;
    }
    await next();
  } catch (e) {
    console.error("Erreur middleware checkAdmin:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur interne" };
  }
}

// Appliquer le middleware d'admin sur toutes les routes de ce routeur
router.use(checkAdmin);

/**
 * GET /api/admin/users
 * Récupère tous les utilisateurs avec leurs informations privées (téléphone, e-mail).
 */
router.get("/api/admin/users", async (ctx) => {
  try {
    const res = await client.queryObject(
      "SELECT id, name, email, phone, school, status, rating, transaction_count, is_verified, is_admin, created_at FROM users ORDER BY name ASC"
    );
    ctx.response.body = res.rows;
  } catch (e) {
    console.error("Erreur GET /api/admin/users:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la récupération des utilisateurs." };
  }
});

/**
 * GET /api/admin/transactions
 * Récupère toutes les transactions de la plateforme.
 */
router.get("/api/admin/transactions", async (ctx) => {
  try {
    const res = await client.queryObject(
      "SELECT t.*, i.name as item_name, u1.name as owner_name, u2.name as borrower_name FROM transactions t LEFT JOIN items i ON t.item_id=i.id LEFT JOIN users u1 ON t.owner_id=u1.id LEFT JOIN users u2 ON t.borrower_id=u2.id ORDER BY t.created_at DESC"
    );
    ctx.response.body = res.rows;
  } catch (e) {
    console.error("Erreur GET /api/admin/transactions:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la récupération des transactions." };
  }
});

/**
 * GET /api/admin/messages
 * Récupère l'ensemble des messages échangés sur la plateforme.
 */
router.get("/api/admin/messages", async (ctx) => {
  try {
    const res = await client.queryObject(
      "SELECT m.*, i.name as item_name, u1.name as sender_name, u2.name as receiver_name FROM messages m JOIN items i ON m.item_id=i.id JOIN users u1 ON m.sender_id=u1.id JOIN users u2 ON m.receiver_id=u2.id ORDER BY m.created_at DESC"
    );
    ctx.response.body = res.rows;
  } catch (e) {
    console.error("Erreur GET /api/admin/messages:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la récupération des messages." };
  }
});

export default router;
