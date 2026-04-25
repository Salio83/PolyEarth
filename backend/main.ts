import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const dbConfig = {
  user: "root",
  database: "polyearth",
  hostname: "db",
  password: "root",
  port: 5432,
};

const client = new Client(dbConfig);

async function connectWithRetry() {
  while (true) {
    try {
      await client.connect();
      console.log("✅ Connecté à PostgreSQL");
      break;
    } catch (err) {
      console.error("❌ Échec de la connexion. Nouvelle tentative dans 5s...", err.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

await connectWithRetry();

const router = new Router();

// --- AUTHENTIFICATION ---

router.post("/api/auth/register", async (ctx) => {
  const { name, email, password } = await ctx.request.body().value;
  const hashedPassword = await bcrypt.hash(password);
  const token = crypto.randomUUID();

  try {
    await client.queryObject(
      "INSERT INTO users (name, email, password, verification_token) VALUES ($1, $2, $3, $4)",
      [name, email, hashedPassword, token]
    );
    console.log(`[EMAIL] Lien: http://localhost:8000/api/auth/verify?token=${token}`);
    ctx.response.body = { message: "Compte créé. Vérifiez vos emails." };
  } catch (err) {
    ctx.response.status = 400;
    ctx.response.body = { message: "Erreur lors de l'inscription." };
  }
});

router.post("/api/auth/login", async (ctx) => {
  const { email, password } = await ctx.request.body().value;
  const result = await client.queryObject("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0] as any;

  if (user && await bcrypt.compare(password, user.password)) {
    if (!user.is_verified) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Veuillez vérifier votre email." };
      return;
    }
    ctx.response.body = { id: user.id, name: user.name, email: user.email };
  } else {
    ctx.response.status = 401;
    ctx.response.body = { message: "Identifiants invalides." };
  }
});

router.get("/api/auth/verify", async (ctx) => {
  const token = ctx.request.url.searchParams.get("token");
  const result = await client.queryObject(
    "UPDATE users SET is_verified = true, verification_token = null WHERE verification_token = $1 RETURNING id",
    [token]
  );
  if (result.rows.length > 0) {
    ctx.response.redirect("http://localhost:3000/login?verified=true");
  } else {
    ctx.response.body = "Lien invalide.";
  }
});

// --- API DATA ---

router.get("/api/users", async (ctx) => {
  const result = await client.queryObject("SELECT id, name, email FROM users");
  ctx.response.body = result.rows;
});

router.get("/api/items", async (ctx) => {
  const result = await client.queryObject(`
    SELECT i.*, u.name as owner_name 
    FROM items i 
    JOIN users u ON i.owner_id = u.id
    ORDER BY i.id DESC
  `);
  ctx.response.body = result.rows;
});

router.post("/api/items", async (ctx) => {
  const body = await ctx.request.body().value;
  const userId = ctx.request.headers.get("X-Sharer-User-Id");
  
  if (!userId) {
    ctx.response.status = 400;
    ctx.response.body = { message: "User ID manquant dans les headers." };
    return;
  }

  const result = await client.queryObject(
    "INSERT INTO items (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *",
    [body.name, body.description, parseInt(userId)]
  );
  ctx.response.body = result.rows[0];
});

const app = new Application();

// CORS Middleware
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "*");
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
  } else {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Backend Deno running on http://localhost:8000");
await app.listen({ port: 8000 });
