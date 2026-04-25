import { Application, send } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const app = new Application();

app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  
  // SPA Routing: rediriger les routes inconnues vers index.html
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

console.log("Frontend server running on http://localhost:3000");
await app.listen({ port: 3000 });
