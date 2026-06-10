/**
 * @file auth.ts
 * @description Middleware d'authentification JWT pour sécuriser les routes de l'API.
 */

import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
import { jwtKey } from "../config.ts";

/**
 * Obtient le token JWT soit depuis l'en-tête Authorization soit depuis le cookie httpOnly.
 * @param ctx Contexte Oak
 * @returns {string|null} Le token ou null
 */
export async function getTokenFromRequest(
  ctx: Context,
): Promise<string | null> {
  // D'abord essayer l'en-tête Authorization
  const authHeader = ctx.request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  // Sinon essayer le cookie (pour les appels API depuis le navigateur)
  return (await ctx.cookies.get("auth_token")) || null;
}

/**
 * Middleware d'authentification pour vérifier le token JWT dans l'en-tête Authorization.
 */
export async function authMiddleware(
  ctx: Context,
  next: () => Promise<unknown>,
) {
  const token = await getTokenFromRequest(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Non autorisé" };
    return;
  }
  try {
    const payload = await verify(token, jwtKey);
    ctx.state.userId = payload.id;
    await next();
  } catch (_err) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Token invalide ou expiré" };
  }
}
