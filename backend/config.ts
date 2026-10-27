/**
 * @file config.ts
 * @description Centralisation de la configuration de l'application et importation des variables d'environnement.
 */

const jwtSecret = Deno.env.get("JWT_SECRET");
if (!jwtSecret) {
  console.error(
    "❌ ERREUR CRITIQUE : La variable d'environnement JWT_SECRET doit être définie.",
  );
  console.error(
    "   Exemple : JWT_SECRET=votre_secret_tres_long_et_complexe_32_caracteres_minimum",
  );
  Deno.exit(1);
}

if (jwtSecret.length < 32) {
  console.error(
    "❌ ERREUR CRITIQUE : La variable d'environnement JWT_SECRET doit contenir au moins 32 caractères.",
  );
  Deno.exit(1);
}

// Génération de la clé cryptographique pour la signature JWT
export const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(jwtSecret),
  { name: "HMAC", hash: "SHA-512" },
  false,
  ["sign", "verify"],
);

export const config = {
  jwtSecret,
  jwtExpirationSeconds: 60 * 60 * 24, // 24 heures
  nodeEnv: Deno.env.get("NODE_ENV") || "production",
  appUrl: Deno.env.get("APP_URL") || "http://localhost",
  admin: {
    email: Deno.env.get("ADMIN_EMAIL")?.toLowerCase() || null,
    password: Deno.env.get("ADMIN_PASSWORD") || null,
  },
  db: {
    user: Deno.env.get("DB_USER") || "root",
    database: Deno.env.get("DB_NAME") || "polyearth",
    hostname: Deno.env.get("DB_HOST") || "db",
    password: Deno.env.get("DB_PASS") || "root",
    port: parseInt(Deno.env.get("DB_PORT") || "5432", 10),
  },
};
