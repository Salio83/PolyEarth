/**
 * @file main.ts
 * @description Point d'entrée principal du backend PolyEarth (Deno/Oak).
 * Gère l'authentification, les transactions, la messagerie et les notifications WebSocket.
 */

import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

// =============================================================================
// --- TYPES ET INTERFACES ---
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  school: string;
  status: string;
  photo_url: string | null;
  rating: number;
  transaction_count: number;
  is_verified: boolean;
  verification_token: string | null;
}

interface Item {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  category: string;
  quality: string;
  photo_url: string | null;
  status: string;
  type: string;
  available_from: string | null;
  available_until: string | null;
}

interface Transaction {
  id: number;
  item_id: number;
  borrower_id: number;
  owner_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  end_requested_by: number | null;
}

interface Message {
  id: number;
  item_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  type: string;
  loan_id: number | null;
}

// =============================================================================
// --- VALIDATEURS ---
// =============================================================================

/**
 * Validation d'une adresse email.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validation de la force du mot de passe.
 * Minimum 8 caractères, au moins 1 lettre et 1 chiffre.
 */
function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins une lettre." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Le mot de passe doit contenir au moins un chiffre." };
  }
  return { valid: true, message: "" };
}

/**
 * Validation du nom d'utilisateur.
 */
function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 255;
}

/**
 * Échappe les caractères spéciaux pour éviter les injections SQL (defense-in-depth).
 */
function sanitizeString(str: string): string {
  return str.replace(/[<>"'%;()&+]/g, '');
}

// =============================================================================
// --- RATE LIMITING ---
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * Nettoie les entrées expirées du rate limiter.
 */
function cleanRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Vérifie si une IP est rate-limited. Nettoie automatiquement les entrées expirées.
 */
function isRateLimited(ip: string): boolean {
  cleanRateLimitStore();
  
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  entry.count++;
  return false;
}

/**
 * Obtenir l'adresse IP d'une requête Oak.
 */
function getClientIP(ctx: any): string {
  return ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         ctx.request.headers.get("x-real-ip") ||
         "unknown";
}

// =============================================================================
// --- CONFIGURATION JWT (SÉCURISÉE) ---
// =============================================================================

const jwtKeyStr = Deno.env.get("JWT_SECRET");
if (!jwtKeyStr) {
  console.error("❌ ERREUR CRITIQUE : La variable d'environnement JWT_SECRET doit être définie.");
  console.error("   Exemple : JWT_SECRET=votre_secret_tres_long_et_complexe_32_caracteres_minimum");
  Deno.exit(1);
}

if (jwtKeyStr.length < 32) {
  console.error("❌ ERREUR CRITIQUE : JWT_SECRET doit contenir au moins 32 caractères.");
  Deno.exit(1);
}

const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(jwtKeyStr),
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign", "verify"]
);

// Réduction de l'expiration JWT à 24h pour limiter les risques
const JWT_EXPIRATION_SECONDS = 60 * 60 * 24; // 24 heures

/**
 * Obtient le token JWT soit depuis l'en-tête Authorization soit depuis le cookie httpOnly.
 * @param ctx Contexte Oak
 * @returns {string|null} Le token ou null
 */
function getTokenFromRequest(ctx: any): string | null {
  // D'abord essayer l'en-tête Authorization
  const authHeader = ctx.request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  // Sinon essayer le cookie (pour les appels API depuis le navigateur)
  return ctx.cookies.get("auth_token") || null;
}

/**
 * Middleware d'authentification pour vérifier le token JWT dans l'en-tête Authorization.
 * @param ctx Contexte Oak
 * @param next Fonction suivante dans le middleware
 */
async function authMiddleware(ctx: any, next: () => Promise<unknown>) {
  const authHeader = ctx.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Non autorisé" };
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = await verify(token, jwtKey);
    ctx.state.userId = payload.id;
    await next();
  } catch (err) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Token invalide ou expiré" };
  }
}

// Map pour suivre les utilisateurs connectés via WebSocket (userId -> WebSocket)
const connectedUsers = new Map<number, WebSocket>();

// Heartbeat : intervalle de ping pour détecter les connexions mortes (30 secondes)
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 35000;
const userLastPong = new Map<number, number>();

let heartbeatInterval: number | null = null;

function startHeartbeat() {
  if (heartbeatInterval) return;
  
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    for (const [userId, socket] of connectedUsers.entries()) {
      const lastPong = userLastPong.get(userId) || 0;
      if (now - lastPong > HEARTBEAT_TIMEOUT_MS) {
        console.log(`⚠️ WebSocket zombie détecté pour user ${userId}, déconnexion.`);
        socket.close();
        connectedUsers.delete(userId);
        userLastPong.delete(userId);
      } else {
        try {
          socket.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }
    }
  }, HEARTBEAT_INTERVAL_MS) as unknown as number;
}

/**
 * Notification WebSocket helper - extrait la logique dupliquée.
 */
function notifyUser(userId: number, eventType: string, data: Record<string, unknown>) {
  const socket = connectedUsers.get(userId);
  if (socket) {
    try {
      socket.send(JSON.stringify({ type: eventType, data }));
    } catch (e) {
      console.error(`⚠️ Erreur d'envoi WS à user ${userId}:`, e);
    }
  }
}

/**
 * Simule l'envoi d'un e-mail de vérification de compte.
 * @param email Adresse e-mail du destinataire
 * @param _name Nom du destinataire
 * @param token Token de vérification unique
 */
async function sendVerificationEmail(email: string, _name: string, token: string) {
  const link = `http://localhost:8000/api/auth/verify?token=${token}`;
  console.log(`\n📧 EMAIL envoyé à ${email}\nLien : ${link}\n`);
  // TODO : Intégrer un vrai service d'envoi d'emails (ex: Resend, Mailgun)
}

// Configuration du client PostgreSQL
const client = new Client({
  user: Deno.env.get("DB_USER") || "root",
  database: Deno.env.get("DB_NAME") || "polyearth",
  hostname: Deno.env.get("DB_HOST") || "db",
  password: Deno.env.get("DB_PASS") || "root",
  port: parseInt(Deno.env.get("DB_PORT") || "5432")
});

/**
 * Établit la connexion à la base de données avec un système de reconnexion automatique.
 * Exécute également les migrations SQL nécessaires.
 */
async function connectWithRetry() {
  while (true) {
    try {
      await client.connect();
      console.log("✅ Connecté à PostgreSQL");
      
      // Liste des migrations pour mettre à jour le schéma de la base de données
      const migrations = [
        `CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, item_id INTEGER REFERENCES items(id), sender_id INTEGER REFERENCES users(id), receiver_id INTEGER REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'offer'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS quality VARCHAR(50) DEFAULT 'good'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS available_from DATE`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS available_until DATE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(255) DEFAULT 'Polytech Montpellier'`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'Étudiant'`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 3.0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'text'`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS loan_id INTEGER`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS end_requested_by INTEGER`,
        `CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, transaction_id INTEGER REFERENCES transactions(id), reviewer_id INTEGER REFERENCES users(id), reviewee_id INTEGER REFERENCES users(id), rating INTEGER, comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `UPDATE items SET status='available' WHERE status IS NULL`,
        `UPDATE items SET quality='good' WHERE quality IS NULL`,
        `UPDATE users SET status='Étudiant' WHERE status IS NULL`,
        `UPDATE users SET rating=3.0 WHERE rating IS NULL`,
        `UPDATE users SET transaction_count=0 WHERE transaction_count IS NULL`,
        `UPDATE users SET is_verified=true WHERE is_verified IS NULL`,
        `UPDATE messages SET is_read=false WHERE is_read IS NULL`,
        `UPDATE messages SET type='text' WHERE type IS NULL`,
      ];
      
      for (const q of migrations) {
        try { 
          await client.queryObject(q); 
        } catch (e) { 
          if (!(e instanceof Error) || !e.message.includes("already exists")) {
            console.warn("⚠️ Migration :", e instanceof Error ? e.message : e); 
          }
        }
      }
      console.log("✅ Migrations terminées avec succès");
      break;
    } catch (err) {
      console.error("❌ Échec de la connexion à la DB, nouvel essai dans 5s...", err instanceof Error ? err.message : err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

await connectWithRetry();
const router = new Router();

// =============================================================================
// --- GESTION DES WEBSOCKETS ---
// =============================================================================
router.get("/ws/:userId", async (ctx) => {
  if (!ctx.isUpgradable) ctx.throw(400, "Connexion non upgradable");
  
  const userId = parseInt(ctx.params.userId);
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
  } catch {
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
    } catch {}
  };
});

// =============================================================================
// --- AUTHENTIFICATION ---
// =============================================================================

/**
 * Inscription d'un nouvel utilisateur.
 * Envoie un e-mail de vérification après la création du compte.
 */
router.post("/api/auth/register", async (ctx) => {
  // Rate limiting
  const clientIP = getClientIP(ctx);
  if (isRateLimited(clientIP)) {
    ctx.response.status = 429;
    ctx.response.body = { message: "Trop de requêtes. Veuillez patienter avant de réessayer." };
    return;
  }

  try {
    const { name, email, password } = await ctx.request.body({ type: "json" }).value;
    
    // VALIDATION DES INPUTS
    if (!name || !email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Tous les champs sont obligatoires." };
      return;
    }
    
    const sanitizedName = sanitizeString(name.trim());
    if (!isValidName(sanitizedName)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le nom doit contenir entre 2 et 255 caractères." };
      return;
    }
    
    if (!isValidEmail(email)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'adresse e-mail n'est pas valide." };
      return;
    }
    
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      ctx.response.status = 400;
      ctx.response.body = { message: passwordValidation.message };
      return;
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await client.queryObject(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()]
    );
    if (existingUser.rows.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Un compte avec cette adresse e-mail existe déjà." };
      return;
    }
    
    // bcrypt.hash utilise le salt par défaut (10 rounds) ou un salt fourni
    const hashed = await bcrypt.hash(password);
    const token = crypto.randomUUID();
    
    await client.queryObject(
      "INSERT INTO users (name, email, password, verification_token, is_verified, status) VALUES ($1,$2,$3,$4,false,'Étudiant')",
      [sanitizedName, email.toLowerCase(), hashed, token]
    );
    
    await sendVerificationEmail(email, sanitizedName, token);
    ctx.response.body = { message: "Compte créé. Veuillez vérifier vos e-mails." };
  } catch (e) { 
    console.error("❌ Erreur inscription:", e);
    ctx.response.status = 500; 
    ctx.response.body = { message: "Erreur lors de l'inscription. Veuillez réessayer." }; 
  }
});

/**
 * Connexion d'un utilisateur.
 * Vérifie les identifiants et retourne un token JWT.
 */
router.post("/api/auth/login", async (ctx) => {
  // Rate limiting
  const clientIP = getClientIP(ctx);
  if (isRateLimited(clientIP)) {
    ctx.response.status = 429;
    ctx.response.body = { message: "Trop de requêtes. Veuillez patienter avant de réessayer." };
    return;
  }

  try {
    const { email, password } = await ctx.request.body({ type: "json" }).value;
    
    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'e-mail et le mot de passe sont obligatoires." };
      return;
    }
    
    const r = await client.queryObject("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
    const user = r.rows[0] as User;
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects." };
      return;
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password || '');
    if (!passwordMatch) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects." };
      return;
    }
    
    if (!user.is_verified) { 
      ctx.response.status = 403; 
      ctx.response.body = { message: "Veuillez vérifier votre compte avant de vous connecter." };
      return; 
    }
    
    // JWT avec expiration réduite à 24h
    const jwt = await create(
      { alg: "HS512", typ: "JWT" }, 
      { id: user.id, exp: getNumericDate(JWT_EXPIRATION_SECONDS) }, 
      jwtKey
    );
    
    // Définir le cookie HTTP-only pour le JWT (sécurisé contre XSS)
    ctx.cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: Deno.env.get("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: JWT_EXPIRATION_SECONDS,
      path: "/"
    });
    
    ctx.response.body = { 
      token: jwt, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        school: user.school, 
        status: user.status, 
        photo_url: user.photo_url, 
        rating: user.rating, 
        transaction_count: user.transaction_count 
      } 
    };
  } catch (e) { 
    console.error("❌ Erreur connexion:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la connexion. Veuillez réessayer." }; 
  }
});

/**
 * Vérification du compte via le token envoyé par e-mail.
 */
router.get("/api/auth/verify", async (ctx) => {
  try {
    const token = ctx.request.url.searchParams.get("token");
    
    if (!token) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Token manquant." };
      return;
    }
    
    const result = await client.queryObject(
      "UPDATE users SET is_verified=true, verification_token=null WHERE verification_token=$1 RETURNING id",
      [token]
    );
    
    if (result.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Token invalide ou expiré." };
      return;
    }
    
    ctx.response.redirect("http://localhost:3000/login?verified=true");
  } catch (e) {
    console.error("❌ Erreur vérification:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la vérification du compte." };
  }
});

// =============================================================================
// --- UTILISATEURS ---
// =============================================================================

/**
 * Récupère le profil d'un utilisateur par son ID.
 */
router.get("/api/users/:id", async (ctx) => {
  try {
    const r = await client.queryObject(
      "SELECT id, name, email, school, status, photo_url, rating, transaction_count FROM users WHERE id=$1",
      [ctx.params.id]
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
    const userIdParam = parseInt(ctx.params.id);
    const currentUserId = ctx.state.userId;
    
    // Vérification de ownership : on ne peut modifier que son propre profil
    if (userIdParam !== currentUserId) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous ne pouvez modifier que votre propre profil." };
      return;
    }
    
    const body = await ctx.request.body({ type: "json" }).value as { name?: string; email?: string; school?: string; status?: string; photo_url?: string } | undefined;
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Corps de requête invalide." };
      return;
    }
    const { name, email, school, status, photo_url } = body;
    
    // Validation du nom si fourni
    if (name !== undefined && !isValidName(name.trim())) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Le nom doit contenir entre 2 et 255 caractères." };
      return;
    }
    
    // Validation de l'email si fourni
    if (email !== undefined && !isValidEmail(email)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'adresse e-mail n'est pas valide." };
      return;
    }
    
    const sanitizedName = name ? sanitizeString(name.trim()) : null;
    
    const r = await client.queryObject(
      "UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), school=COALESCE($3,school), status=COALESCE($4,status), photo_url=COALESCE($5,photo_url) WHERE id=$6 RETURNING id,name,email,school,status,photo_url,rating,transaction_count",
      [sanitizedName, email?.toLowerCase(), school, status, photo_url, userIdParam]
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

// =============================================================================
// --- ANNONCES (ITEMS) ---
// =============================================================================

/**
 * Liste les annonces avec filtres (catégorie, recherche, type, propriétaire).
 */
router.get("/api/items", async (ctx) => {
  const category = ctx.request.url.searchParams.get("category");
  const search = ctx.request.url.searchParams.get("search");
  const type = ctx.request.url.searchParams.get("type") || "offer";
  const ownerId = ctx.request.url.searchParams.get("owner_id");

  let query = `SELECT i.*, u.name as owner_name, u.photo_url as owner_photo, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.status != 'deleted'`;
  const params: unknown[] = [];

  if (ownerId) {
    params.push(parseInt(ownerId));
    query += ` AND i.owner_id=$${params.length}`;
  } else {
    query += ` AND i.status='available'`;
    params.push(type);
    query += ` AND i.type=$${params.length}`;
    if (category && category !== "all") { 
      params.push(category); 
      query += ` AND i.category=$${params.length}`; 
    }
    if (search) { 
      params.push(`%${search}%`); 
      query += ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length})`; 
    }
  }
  
  query += " ORDER BY i.id DESC";
  ctx.response.body = (await client.queryObject(query, params)).rows;
});

/**
 * Crée une nouvelle annonce.
 */
router.post("/api/items", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value as { name: string; description: string; category: string; quality?: string; photo_url?: string; available_from?: string; available_until?: string; type?: string } | undefined;
    if (!body) {
      ctx.response.status = 400;
      ctx.response.body = { message: "Corps de requête invalide." };
      return;
    }
    const userId = ctx.state.userId;
    const r = await client.queryObject(
      "INSERT INTO items (name,description,owner_id,category,quality,photo_url,available_from,available_until,type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [body.name, body.description, parseInt(userId!), body.category, body.quality || "good", body.photo_url || null, body.available_from || null, body.available_until || null, body.type || 'offer']
    );
    ctx.response.body = r.rows[0] as object;
  } catch (e) { 
    console.error(e); 
    ctx.response.status = 500; 
    ctx.response.body = { message: "Erreur lors de la création de l'annonce." }; 
  }
});

/**
 * Récupère les détails d'une annonce spécifique.
 */
router.get("/api/items/:id", async (ctx) => {
  const r = await client.queryObject(
    `SELECT i.*, u.name as owner_name, u.email as owner_email, u.photo_url as owner_photo, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.id=$1 AND i.status != 'deleted'`,
    [ctx.params.id]
  );
  if (!r.rows[0]) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Objet non trouvé." };
    return;
  }
  ctx.response.body = r.rows[0];
});

/**
 * Met à jour le statut d'une annonce (disponible, réservé, etc.).
 * Vérifie que l'utilisateur est bien le propriétaire.
 */
router.patch("/api/items/:id/status", async (ctx) => {
  try {
    const { status } = await ctx.request.body({ type: "json" }).value;
    const userId = ctx.state.userId;
    
    // Vérification de la propriété
    const itemRes = await client.queryObject("SELECT owner_id FROM items WHERE id=$1", [ctx.params.id]);
    if (itemRes.rows.length === 0) { 
      ctx.response.status = 404; 
      return; 
    }
    if ((itemRes.rows[0] as any).owner_id !== parseInt(userId!)) { 
      ctx.response.status = 403; 
      return; 
    }

    await client.queryObject("UPDATE items SET status=$1 WHERE id=$2", [status, ctx.params.id]);
    ctx.response.body = { success: true };
  } catch (e) { 
    console.error(e); 
    ctx.response.status = 500; 
  }
});

/**
 * Supprime une annonce (soft delete).
 * Annule également les transactions en cours liées à cet objet.
 */
router.delete("/api/items/:id", async (ctx) => {
  const userId = ctx.state.userId;
  try {
    const itemRes = await client.queryObject("SELECT id, status FROM items WHERE id=$1 AND owner_id=$2", [ctx.params.id, userId]);
    if (itemRes.rows.length === 0) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'avez pas l'autorisation de supprimer cet objet." };
      return;
    }
    
    // Suppression logique : changement du statut à 'deleted'
    await client.queryObject("UPDATE items SET status='deleted' WHERE id=$1", [ctx.params.id]);
    
    // Annulation des transactions en cours (en attente ou acceptées)
    await client.queryObject("UPDATE transactions SET status='rejected' WHERE item_id=$1 AND status IN ('pending', 'accepted')", [ctx.params.id]);

    ctx.response.body = { message: "Annonce supprimée." };
  } catch (e) { 
    console.error(e); 
    ctx.response.status = 500; 
    ctx.response.body = { message: "Erreur lors de la suppression." }; 
  }
});

// =============================================================================
// --- DEMANDES DE PRÊT (TRANSACTIONS) ---
// =============================================================================

/**
 * Réserve un objet (crée une demande de prêt).
 * Utilise une transaction SQL pour éviter les race conditions.
 */
router.post("/api/items/:id/reserve", async (ctx) => {
  try {
    const { start_date, end_date } = await ctx.request.body({ type: "json" }).value;
    const borrower_id = ctx.state.userId;
    const itemId = parseInt(ctx.params.id);
    
    // Vérifications de base
    if (isNaN(itemId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID d'objet invalide." };
      return;
    }
    
    // Démarrer une transaction SQL manuelle
    await client.queryObject("BEGIN");
    
    try {
      // Verrouiller la ligne de l'item pour la transaction
      const itemRes = await client.queryObject(
        "SELECT owner_id, status FROM items WHERE id=$1 FOR UPDATE",
        [itemId]
      );
      const item = itemRes.rows[0] as Item;
      
      if (!item) { 
        await client.queryObject("ROLLBACK");
        ctx.response.status = 404; 
        ctx.response.body = { message: "Objet introuvable." }; 
        return; 
      }
      if (item.status === 'deleted') { 
        await client.queryObject("ROLLBACK");
        ctx.response.status = 410; 
        ctx.response.body = { message: "Cet objet a été supprimé." }; 
        return; 
      }
      if (item.status !== 'available') { 
        await client.queryObject("ROLLBACK");
        ctx.response.status = 409; 
        ctx.response.body = { message: "Cet objet n'est plus disponible." }; 
        return; 
      }
      if (item.owner_id === borrower_id) { 
        await client.queryObject("ROLLBACK");
        ctx.response.status = 403; 
        ctx.response.body = { message: "Vous ne pouvez pas emprunter votre propre objet." }; 
        return; 
      }

      // Vérifier l'absence de demande en cours (avec verrouillage)
      const existing = await client.queryObject(
        "SELECT id FROM transactions WHERE item_id=$1 AND borrower_id=$2 AND status IN ('pending','accepted') FOR UPDATE",
        [itemId, borrower_id]
      );
      if (existing.rows.length > 0) { 
        await client.queryObject("ROLLBACK");
        ctx.response.status = 409; 
        ctx.response.body = { message: "Vous avez déjà une demande en cours pour cet objet." }; 
        return; 
      }

      // Création de la transaction
      const txRes = await client.queryObject(
        "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
        [itemId, borrower_id, item.owner_id, start_date || null, end_date || null]
      );
      const newTx = txRes.rows[0] as Transaction;

      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      const msgContent = start_date
        ? `📅 Demande de prêt du ${fmt(start_date)} au ${fmt(end_date)}`
        : "📅 Demande de prêt";
      const meta = JSON.stringify({ start_date: start_date || null, end_date: end_date || null });

      // Envoi du message de notification dans la discussion
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
        [itemId, borrower_id, item.owner_id, msgContent, newTx.id, meta]
      );

      // Valider la transaction
      await client.queryObject("COMMIT");

      // Notification WebSocket en temps réel (après commit)
      notifyUser(item.owner_id, "LOAN_REQUEST", { item_id: itemId });

      ctx.response.body = newTx;
    } catch (e) {
      await client.queryObject("ROLLBACK");
      throw e;
    }
  } catch (e) { 
    console.error("❌ Erreur réservation:", e);
    ctx.response.status = 500; 
    ctx.response.body = { message: "Erreur lors de la réservation. Veuillez réessayer." }; 
  }
});

/**
 * Propose un prêt en réponse à une demande d'objet.
 */
router.post("/api/items/:id/propose", async (ctx) => {
  try {
    const { item_name, item_desc, start_date, end_date, discussion_item_id, borrower_id } = await ctx.request.body({ type: "json" }).value;
    const lender_id = ctx.state.userId;
    if (!borrower_id) { 
      ctx.response.status = 400; 
      return; 
    }

    // Création de la transaction
    const txRes = await client.queryObject(
      "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
      [ctx.params.id, borrower_id, lender_id, start_date || null, end_date || null]
    );

    const msgContent = `🤝 Proposition de prêt : ${item_name}`;
    const meta = JSON.stringify({ start_date: start_date || null, end_date: end_date || null, item_name, item_desc });

    // Utilisation de l'ID de discussion fourni (si l'objet prêté n'est pas celui de la discussion originale)
    const messageItemId = discussion_item_id || ctx.params.id;

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
      [messageItemId, lender_id, borrower_id, msgContent, (txRes.rows[0] as any).id, meta]
    );

    const borrowerSocket = connectedUsers.get(borrower_id);
    if (borrowerSocket) borrowerSocket.send(JSON.stringify({ type: "LOAN_REQUEST", data: { item_id: messageItemId } }));

    ctx.response.body = { message: "Proposition envoyée.", loan_id: (txRes.rows[0] as any).id };
  } catch (e) { 
    console.error(e); 
    ctx.response.status = 500; 
  }
});

/**
 * Récupère tous les prêts (emprunts et dons) d'un utilisateur.
 */
router.get("/api/loans/user/:userId", async (ctx) => {
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, i.photo_url as item_photo, i.status as item_status, 
            ub.name as borrower_name, ub.photo_url as borrower_photo,
            uo.name as owner_name, uo.photo_url as owner_photo
     FROM transactions t JOIN items i ON t.item_id=i.id JOIN users ub ON t.borrower_id=ub.id JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) ORDER BY t.created_at DESC`,
    [ctx.params.userId]
  );
  ctx.response.body = r.rows;
});

/**
 * Met à jour le statut d'un prêt (accepter, refuser, terminer, etc.).
 * Vérifie que l'utilisateur fait partie de la transaction (ownership).
 */
router.patch("/api/loans/:id", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { status } = body;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id);
    
    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }
    
    const txRes0 = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [loanId]);
    const tx = txRes0.rows[0] as Transaction;
    
    if (!tx) { 
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return; 
    }
    
    // VÉRIFICATION DE OWNERSHIP : l'utilisateur doit être soit emprunteur soit propriétaire
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous ne pouvez modifier que vos propres prêts." };
      return;
    }

    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;

    // Retrouve l'ID de l'objet utilisé dans la discussion originale
    const origMsgRes = await client.queryObject(
      "SELECT item_id FROM messages WHERE loan_id=$1 AND type='loan_request' LIMIT 1",
      [loanId]
    );
    const discussionItemId = origMsgRes.rows.length > 0 ? (origMsgRes.rows[0] as Message).item_id : tx.item_id;

    if (status === "accepted") {
      await client.queryObject("UPDATE transactions SET status='accepted' WHERE id=$1", [loanId]);
      await client.queryObject("UPDATE items SET status='reserved' WHERE id=$1", [tx.item_id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [discussionItemId, requester_id, otherId, "✅ Prêt accepté ! Coordonnez la remise de l'objet.", tx.id]
      );
      // Incrémentation du compteur de transactions pour les deux utilisateurs
      await client.queryObject("UPDATE users SET transaction_count=transaction_count+1 WHERE id=$1 OR id=$2", [tx.owner_id, tx.borrower_id]);
      
      notifyUser(otherId, "LOAN_ACCEPTED", { item_id: discussionItemId });
      
    } else if (status === "rejected") {
      await client.queryObject("UPDATE transactions SET status='rejected' WHERE id=$1", [loanId]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [discussionItemId, requester_id, otherId, "❌ Demande de prêt refusée.", tx.id]
      );
      
      notifyUser(otherId, "LOAN_REJECTED", { item_id: discussionItemId });
      
    } else if (status === "request_end") {
      // Demande de fin de prêt initiée par l'un des deux
      await client.queryObject("UPDATE transactions SET end_requested_by=$1 WHERE id=$2", [requester_id, loanId]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'end_request',$5)",
        [discussionItemId, requester_id, otherId, "🏁 Demande de fin de prêt — l'objet a-t-il bien été rendu ?", tx.id]
      );
      
      notifyUser(otherId, "NEW_MESSAGE", { item_id: discussionItemId, sender_name: "un utilisateur" });
      
    } else if (status === "completed") {
      // Fin de prêt confirmée
      await client.queryObject("UPDATE transactions SET status='completed', end_requested_by=NULL WHERE id=$1", [loanId]);
      await client.queryObject("UPDATE items SET status='borrowed' WHERE id=$1", [tx.item_id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'✅ Prêt terminé avec succès. Merci !','system',$4)",
        [discussionItemId, requester_id, otherId, tx.id]
      );
      
      notifyUser(otherId, "DISCUSSION_ENDED", { item_id: discussionItemId, loan_id: tx.id, other_id: requester_id });
    }
    
    ctx.response.body = { success: true };
  } catch (e) { 
    console.error("❌ Erreur mise à jour prêt:", e);
    ctx.response.status = 500; 
    ctx.response.body = { message: "Erreur lors de la mise à jour du prêt. Veuillez réessayer." }; 
  }
});

/**
 * Récupère les prêts en retard pour un utilisateur.
 */
router.get("/api/loans/overdue/:userId", async (ctx) => {
  const today = new Date().toISOString().split('T')[0];
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, ub.name as borrower_name, uo.name as owner_name
     FROM transactions t JOIN items i ON t.item_id=i.id JOIN users ub ON t.borrower_id=ub.id JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) AND t.status='accepted' AND t.end_date IS NOT NULL AND t.end_date < $2
     ORDER BY t.end_date ASC`,
    [ctx.params.userId, today]
  );
  ctx.response.body = r.rows;
});

/**
 * Demande une extension de la durée de prêt.
 * Vérifie que l'utilisateur fait partie de la transaction.
 */
router.post("/api/loans/:id/extend", async (ctx) => {
  try {
    const { new_end_date } = await ctx.request.body({ type: "json" }).value;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id);
    
    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }
    
    const txRes = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [loanId]);
    const tx = txRes.rows[0] as Transaction;
    
    if (!tx) { 
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return; 
    }
    
    // VÉRIFICATION DE OWNERSHIP
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous ne pouvez demander une extension que pour vos propres prêts." };
      return;
    }
    
    if (!new_end_date) {
      ctx.response.status = 400;
      ctx.response.body = { message: "La nouvelle date de fin est obligatoire." };
      return;
    }
    
    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    const meta = JSON.stringify({ new_end_date });
    
    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'extension_request',$5,$6)",
      [tx.item_id, requester_id, otherId, `📅 Extension de prêt demandée jusqu'au ${fmt(new_end_date)}`, tx.id, meta]
    );
    
    notifyUser(otherId, "NEW_MESSAGE", { item_id: tx.item_id, sender_name: "un utilisateur" });
    
    ctx.response.body = { success: true };
  } catch (e) { 
    console.error("❌ Erreur extension:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la demande d'extension. Veuillez réessayer." }; 
  }
});

/**
 * Accepte ou refuse une demande d'extension.
 * Vérifie que l'utilisateur fait partie de la transaction.
 */
router.patch("/api/loans/:id/extend", async (ctx) => {
  try {
    const { action, new_end_date } = await ctx.request.body({ type: "json" }).value;
    const requester_id = ctx.state.userId;
    const loanId = parseInt(ctx.params.id);
    
    if (isNaN(loanId)) {
      ctx.response.status = 400;
      ctx.response.body = { message: "ID de prêt invalide." };
      return;
    }
    
    const txRes = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [loanId]);
    const tx = txRes.rows[0] as Transaction;
    
    if (!tx) { 
      ctx.response.status = 404;
      ctx.response.body = { message: "Prêt introuvable." };
      return; 
    }
    
    // VÉRIFICATION DE OWNERSHIP
    if (tx.owner_id !== requester_id && tx.borrower_id !== requester_id) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous ne pouvez répondre à cette extension que pour vos propres prêts." };
      return;
    }
    
    if (action === 'accept') {
      if (!new_end_date) {
        ctx.response.status = 400;
        ctx.response.body = { message: "La nouvelle date de fin est obligatoire pour accepter." };
        return;
      }
      await client.queryObject("UPDATE transactions SET end_date=$1 WHERE id=$2", [new_end_date, loanId]);
      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'system',$5)",
        [tx.item_id, requester_id, (tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id), `✅ Extension acceptée jusqu'au ${fmt(new_end_date)}`, tx.id]
      );
    } else {
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'❌ Extension refusée.','system',$4)",
        [tx.item_id, requester_id, (tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id), tx.id]
      );
    }
    
    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    notifyUser(otherId, "NEW_MESSAGE", { item_id: tx.item_id, sender_name: "un utilisateur" });
    
    ctx.response.body = { success: true };
  } catch (e) { 
    console.error("❌ Erreur extension:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la réponse à l'extension. Veuillez réessayer." }; 
  }
});

// =============================================================================
// --- MESSAGERIE ---
// =============================================================================

/**
 * Récupère tous les messages d'un utilisateur.
 */
router.get("/api/messages/:userId", async (ctx) => {
  const r = await client.queryObject(
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
    [ctx.params.userId]
  );
  ctx.response.body = r.rows;
});

/**
 * Marque un message comme lu.
 */
router.patch("/api/messages/:id/read", async (ctx) => {
  try {
    await client.queryObject("UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE id=$1", [ctx.params.id]);
    ctx.response.body = { success: true };
  } catch { 
    ctx.response.status = 500; 
  }
});

/**
 * Envoie un nouveau message texte.
 */
router.post("/api/messages", async (ctx) => {
  try {
    const { item_id, receiver_id, content } = await ctx.request.body({ type: "json" }).value;
    const sender_id = ctx.state.userId;
    
    // Vérifie si l'objet existe encore
    const itemRes = await client.queryObject("SELECT id, status FROM items WHERE id=$1", [item_id]);
    if (itemRes.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Cet objet n'existe plus. La discussion est fermée." };
      return;
    }
    const item = itemRes.rows[0] as any;
    if (item.status === 'deleted') {
      ctx.response.status = 410;
      ctx.response.body = { message: "Cet objet a été supprimé. La discussion est fermée." };
      return;
    }

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content) VALUES ($1,$2,$3,$4)",
      [item_id, sender_id, receiver_id, content]
    );
    
    // Notification en temps réel au destinataire via WebSocket helper
    const sRes = await client.queryObject("SELECT name FROM users WHERE id=$1", [sender_id]);
    const senderName = (sRes.rows[0] as User).name;
    notifyUser(receiver_id, "NEW_MESSAGE", { item_id, sender_id, content, sender_name: senderName });
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
    await client.queryObject(
      "UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE item_id=$1 AND receiver_id=$2 AND is_read=false",
      [item_id, user_id]
    );
    ctx.response.body = { success: true };
  } catch { 
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
    // On ne supprime pas les messages de l'autre utilisateur.
    await client.queryObject(
      "DELETE FROM messages WHERE item_id=$1 AND receiver_id=$2",
      [item_id, user_id]
    );
    ctx.response.body = { success: true };
  } catch (e) { 
    console.error("❌ Erreur fin discussion:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la suppression de la discussion." }; 
  }
});

/**
 * Récupère la transaction active (en attente ou acceptée) pour un objet et une paire d'utilisateurs.
 */
router.get("/api/loans/active/:itemId/:userId", async (ctx) => {
  try {
    const { itemId, userId } = ctx.params;
    const otherId = ctx.request.url.searchParams.get("otherId");
    const r = await client.queryObject(
      `SELECT t.* FROM transactions t 
       WHERE t.id IN (
         SELECT loan_id FROM messages 
         WHERE item_id = $1 
         AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
         AND loan_id IS NOT NULL
       )
       AND t.status IN ('pending', 'accepted')
       ORDER BY t.created_at DESC LIMIT 1`,
      [itemId, userId, otherId]
    );
    ctx.response.body = r.rows[0] || {};
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});

// =============================================================================
// --- NOTATIONS (REVIEWS) ---
// =============================================================================

/**
 * Publie une note et un commentaire sur un échange terminé.
 */
router.post("/api/reviews", async (ctx) => {
  try {
    const { transaction_id, reviewee_id, rating, comment } = await ctx.request.body({ type: "json" }).value;
    const reviewer_id = ctx.state.userId;
    
    // Vérifie si une note existe déjà pour cette transaction par ce rewriter
    const existing = await client.queryObject(
      "SELECT id FROM reviews WHERE transaction_id=$1 AND reviewer_id=$2",
      [transaction_id, reviewer_id]
    );
    if (existing.rows.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = { message: "Vous avez déjà noté cet échange." };
      return;
    }

    // Insertion de la note
    await client.queryObject(
      "INSERT INTO reviews (transaction_id, reviewer_id, reviewee_id, rating, comment) VALUES ($1,$2,$3,$4,$5)",
      [transaction_id, reviewer_id, reviewee_id, rating, comment || null]
    );

    // Mise à jour de la note moyenne de l'utilisateur noté
    const avgRes = await client.queryObject(
      "SELECT AVG(rating) as average FROM reviews WHERE reviewee_id=$1",
      [reviewee_id]
    );
    const newAvg = (avgRes.rows[0] as any).average;
    
    await client.queryObject(
      "UPDATE users SET rating=$1 WHERE id=$2",
      [newAvg, reviewee_id]
    );

    ctx.response.body = { success: true };
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur lors de la notation." };
  }
});

// =============================================================================
// --- CONFIGURATION DE L'APPLICATION ---
// =============================================================================

const app = new Application();

// Middleware CORS et Gestion des erreurs/auth globale
app.use(async (ctx, next) => {
  // Configuration CORS
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
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
    const token = getTokenFromRequest(ctx);
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Non autorisé" };
      return;
    }
    try {
      const payload = await verify(token, jwtKey);
      ctx.state.userId = payload.id;
      await next();
    } catch (err) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Token invalide ou expiré" };
    }
  } else {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Backend démarré sur http://localhost:8000");
await app.listen({ port: 8000 });
