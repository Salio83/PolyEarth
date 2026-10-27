/**
 * @file users.ts
 * @description Routes pour la gestion des profils utilisateurs.
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { query } from "../db.ts";
import {
  isValidEmail,
  isValidName,
  sanitizeString,
} from "../utils/validators.ts";

const router = new Router();

/**
 * Récupère le profil d'un utilisateur par son ID.
 */
router.get("/api/users/:id", async (ctx) => {
  try {
    const r = await query(
      "SELECT id, name, email, school, status, photo_url, rating, transaction_count, is_admin FROM users WHERE id=$1",
      [ctx.params.id],
    );
    ctx.response.body = r.rows[0] as object;
  } catch (e) {
    console.error("❌ Erreur récupération utilisateur:", e);
    ctx.response.status = 404;
    ctx.response.body = { message: "Utilisateur introuvable." };
  }
});

/**
 * Met à jour le profil de l'utilisateur connecté.
 * Vérifie que l'utilisateur ne peut modifier que son propre profil.
 */
router.patch("/api/users/:id", async (ctx) => {
  try {
    const userIdParam = parseInt(ctx.params.id, 10);
    const currentUserId = ctx.state.userId;

    // Vérification de ownership : on ne peut modifier que son propre profil
    if (userIdParam !== currentUserId) {
      ctx.response.status = 403;
      ctx.response.body = {
        message: "Vous ne pouvez modifier que votre propre profil.",
      };
      return;
    }

    const body = await ctx.request.body({ type: "json" }).value as {
      name?: string;
      email?: string;
      school?: string;
      status?: string;
      photo_url?: string;
    } | undefined;
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Corps de requête invalide." };
      return;
    }
    const { name, email, school, status, photo_url } = body;

    // Validation du nom si fourni
    if (name !== undefined && !isValidName(name.trim())) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "Le nom doit contenir entre 2 et 255 caractères.",
      };
      return;
    }

    // Validation de l'email si fourni
    if (email !== undefined && !isValidEmail(email)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'adresse e-mail n'est pas valide." };
      return;
    }

    const sanitizedName = name ? sanitizeString(name.trim()) : null;

    const r = await query(
      "UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), school=COALESCE($3,school), status=COALESCE($4,status), photo_url=COALESCE($5,photo_url) WHERE id=$6 RETURNING id,name,email,school,status,photo_url,rating,transaction_count,is_admin",
      [
        sanitizedName,
        email?.toLowerCase(),
        school,
        status,
        photo_url,
        userIdParam,
      ],
    );

    if (r.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Utilisateur introuvable." };
      return;
    }

    ctx.response.body = r.rows[0] as object;
  } catch (e) {
    console.error("❌ Erreur mise à jour profil:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la mise à jour du profil." };
  }
});

export default router;
