/**
 * @file server.ts
 * @description Serveur frontend minimal pour l'application PolyEarth (Deno/Oak).
 * Gère le service des fichiers statiques et le routage SPA (Single Page Application).
 */

import { Application, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const app = new Application();

app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  
  // Routage SPA : tente de servir le fichier demandé, sinon redirige vers index.html
  try {
    await send(ctx, path, {
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await send(ctx, "/", {
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  }
});

console.log("🚀 Serveur frontend démarré sur http://localhost:3000");
await app.listen({ port: 3000 });
