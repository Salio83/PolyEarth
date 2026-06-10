/**
 * @file reviews.ts
 * @description Routes pour la gestion des évaluations et commentaires post-transaction.
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { client } from "../db.ts";

const router = new Router();

/**
 * Publie une note et un commentaire sur un échange terminé.
 */
router.post("/api/reviews", async (ctx) => {
  try {
    const { transaction_id, reviewee_id, rating, comment } = await ctx.request
      .body({ type: "json" }).value;
    const reviewer_id = ctx.state.userId;

    // Vérifie si une note existe déjà pour cette transaction par ce reviewer
    const existing = await client.queryObject(
      "SELECT id FROM reviews WHERE transaction_id=$1 AND reviewer_id=$2",
      [transaction_id, reviewer_id],
    );
    if (existing.rows.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Vous avez déjà noté cet échange." };
      return;
    }

    // Insertion de la note
    await client.queryObject(
      "INSERT INTO reviews (transaction_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1,$2,$3,$4,$5)",
      [transaction_id, reviewer_id, reviewee_id, rating, comment || null],
    );

    // Mise à jour de la note moyenne de l'utilisateur noté
    const avgRes = await client.queryObject(
      "SELECT AVG(rating) as average FROM reviews WHERE reviewee_id=$1",
      [reviewee_id],
    );
    const newAvg = (avgRes.rows[0] as { average: number | null }).average;

    await client.queryObject(
      "UPDATE users SET rating=$1 WHERE id=$2",
      [newAvg || 3.0, reviewee_id],
    );

    ctx.response.body = { success: true };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la notation." };
  }
});

export default router;
