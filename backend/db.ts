/**
 * @file db.ts
 * @description Initialisation de la connexion PostgreSQL et migrations automatiques.
 */

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { config } from "./config.ts";

export const client = new Client({
  user: config.db.user,
  database: config.db.database,
  hostname: config.db.hostname,
  password: config.db.password,
  port: config.db.port,
});

/**
 * Établit la connexion à la base de données avec un système de reconnexion automatique.
 * Exécute également les migrations SQL nécessaires.
 */
export async function connectDb() {
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
        `UPDATE transactions SET owner_id = (SELECT owner_id FROM items WHERE items.id = transactions.item_id) WHERE owner_id IS NULL`,
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
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
        `UPDATE users SET is_admin=true WHERE email='admin@polyearth.com'`,
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

      // S'assurer qu'un utilisateur administrateur par défaut existe
      const adminCheck = await client.queryObject(
        "SELECT id FROM users WHERE email=$1",
        ["admin@polyearth.com"]
      );
      if (adminCheck.rows.length === 0) {
        const bcrypt = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");
        const hashedAdminPassword = await bcrypt.hash("admin123");
        await client.queryObject(
          "INSERT INTO users (name, email, password, is_verified, is_admin, status) VALUES ($1,$2,$3,$4,$5,$6)",
          ["Admin PolyEarth", "admin@polyearth.com", hashedAdminPassword, true, true, "Administrateur"]
        );
        console.log("👤 Utilisateur Administrateur par défaut créé : admin@polyearth.com / admin123");
      }
      break;
    } catch (err) {
      console.error(
        "❌ Erreur de connexion à PostgreSQL (retrying in 5s):",
        err instanceof Error ? err.message : err,
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
