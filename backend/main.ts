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
      // S'assurer que photo_url est de type TEXT pour les images Base64
      try {
        await client.queryObject("ALTER TABLE items ALTER COLUMN photo_url TYPE TEXT");
      } catch (e) {
        console.log("Migration photo_url déjà effectuée ou non nécessaire.");
      }
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
  const body = await ctx.request.body({ limit: "10mb" }).value;
  const userId = ctx.request.headers.get("X-Sharer-User-Id");
  
  if (!userId) {
    ctx.response.status = 400;
    ctx.response.body = { message: "User ID manquant dans les headers." };
    return;
  }

  const result = await client.queryObject(
    "INSERT INTO items (name, description, owner_id, category, photo_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [body.name, body.description, parseInt(userId), body.category, body.photo_url]
  );
  ctx.response.body = result.rows[0];
});

router.get("/api/items/:id", async (ctx) => {
  const id = ctx.params.id;
  const result = await client.queryObject(`
    SELECT i.*, u.name as owner_name, u.email as owner_email
    FROM items i 
    JOIN users u ON i.owner_id = u.id
    WHERE i.id = $1
  `, [id]);
  
  if (result.rows.length > 0) {
    ctx.response.body = result.rows[0];
  } else {
    ctx.response.status = 404;
    ctx.response.body = { message: "Annonce non trouvée." };
  }
});

router.delete("/api/items/:id", async (ctx) => {
  const id = ctx.params.id;
  const userId = ctx.request.headers.get("X-Sharer-User-Id");

  if (!userId) {
    ctx.response.status = 400;
    ctx.response.body = { message: "User ID manquant." };
    return;
  }

  // Vérifier si l'objet appartient bien à l'utilisateur
  const item = await client.queryObject("SELECT owner_id FROM items WHERE id = $1", [id]);
  
  if (item.rows.length === 0) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Annonce non trouvée." };
    return;
  }

  if ((item.rows[0] as any).owner_id !== parseInt(userId)) {
    ctx.response.status = 403;
    ctx.response.body = { message: "Vous n'êtes pas autorisé à supprimer cette annonce." };
    return;
  }

  await client.queryObject("DELETE FROM items WHERE id = $1", [id]);
  ctx.response.body = { message: "Annonce supprimée avec succès." };
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
