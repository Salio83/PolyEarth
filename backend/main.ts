/**
 * @file main.ts
 * @description Point d'entrée principal du backend PolyEarth (Deno/Oak).
 * Gère le cycle de vie de l'application, l'enregistrement des routes et la sécurité.
 */

import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
import { jwtKey } from "./config.ts";
import { connectDb } from "./db.ts";
import { getTokenFromRequest } from "./middleware/auth.ts";

// Import des routeurs
import authRouter from "./routes/auth.ts";
import usersRouter from "./routes/users.ts";
import itemsRouter from "./routes/items.ts";
import loansRouter from "./routes/loans.ts";
import messagesRouter from "./routes/messages.ts";
import reviewsRouter from "./routes/reviews.ts";

// Connexion à la base de données PostgreSQL & migrations
await connectDb();

const app = new Application();
const mainRouter = new Router();

// Enregistrement des sous-routeurs
mainRouter.use(authRouter.routes());
mainRouter.use(authRouter.allowedMethods());

mainRouter.use(usersRouter.routes());
mainRouter.use(usersRouter.allowedMethods());

mainRouter.use(itemsRouter.routes());
mainRouter.use(itemsRouter.allowedMethods());

mainRouter.use(loansRouter.routes());
mainRouter.use(loansRouter.allowedMethods());

mainRouter.use(messagesRouter.routes());
mainRouter.use(messagesRouter.allowedMethods());

mainRouter.use(reviewsRouter.routes());
mainRouter.use(reviewsRouter.allowedMethods());

// Middleware CORS et Gestion des erreurs/auth globale
app.use(async (ctx, next) => {
  // Configuration CORS
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  const path = ctx.request.url.pathname;

  // Routes publiques (sans authentification requise)
  if (
    path.startsWith("/api/auth/") ||
    path.startsWith("/ws/") ||
    (path === "/api/items" && ctx.request.method === "GET") ||
    (path.match(/^\/api\/items\/\d+$/) && ctx.request.method === "GET") ||
    (path.match(/^\/api\/users\/\d+$/) && ctx.request.method === "GET")
  ) {
    await next();
    return;
  }

  // Routes protégées par JWT
  if (path.startsWith("/api/")) {
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
  } else {
    await next();
  }
});

// Enregistrement des routes de l'application
app.use(mainRouter.routes());
app.use(mainRouter.allowedMethods());

console.log("🚀 Backend démarré sur http://localhost:8000");
await app.listen({ port: 8000 });
