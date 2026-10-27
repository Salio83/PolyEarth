/**
 * @file auth.ts
 * @description Routes pour l'authentification des utilisateurs (inscription, connexion, vérification).
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";
import { config, jwtKey } from "../config.ts";
import { query } from "../db.ts";
import { User } from "../types.ts";
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
  sanitizeString,
} from "../utils/validators.ts";
import { getClientIP, isRateLimited } from "../utils/rate_limit.ts";
const router = new Router();

/**
 * Inscription d'un nouvel utilisateur.
 */
router.post("/api/auth/register", async (ctx) => {
  const clientIP = getClientIP(ctx);
  if (isRateLimited(clientIP)) {
    ctx.response.status = 429;
    ctx.response.body = {
      message: "Trop de requêtes. Veuillez patienter avant de réessayer.",
    };
    return;
  }

  try {
    const { name, email, password, phone } = await ctx.request.body({
      type: "json",
    }).value;

    // VALIDATION DES INPUTS
    if (!name || !email || !password || !phone) {
      ctx.response.status = 400;
      ctx.response.body = {
        message:
          "Tous les champs sont obligatoires (nom, email, mot de passe, téléphone).",
      };
      return;
    }

    const cleanedPhone = phone.replace(/[\s\-\.]/g, "");
    if (!isValidPhone(phone)) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "Le numéro de téléphone n'est pas valide.",
      };
      return;
    }

    const sanitizedName = sanitizeString(name.trim());
    if (!isValidName(sanitizedName)) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "Le nom doit contenir entre 2 et 255 caractères.",
      };
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
    const existingUser = await query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()],
    );
    if (existingUser.rows.length > 0) {
      ctx.response.status = 409;
      ctx.response.body = {
        message: "Un compte avec cette adresse e-mail existe déjà.",
      };
      return;
    }

    const hashed = await bcrypt.hash(password);

    await query(
      "INSERT INTO users (name, email, password, verification_token, is_verified, status, phone) VALUES ($1,$2,$3,$4,$5,'Étudiant',$6)",
      [
        sanitizedName,
        email.toLowerCase(),
        hashed,
        null,
        true,
        cleanedPhone,
      ],
    );

    ctx.response.body = {
      message:
        "Compte créé avec succès. Vous pouvez maintenant vous connecter.",
    };
  } catch (e) {
    console.error("❌ Erreur inscription:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de l'inscription. Veuillez réessayer.",
    };
  }
});

/**
 * Connexion d'un utilisateur.
 * Vérifie les identifiants et retourne un token JWT.
 */
router.post("/api/auth/login", async (ctx) => {
  const clientIP = getClientIP(ctx);
  if (isRateLimited(clientIP)) {
    ctx.response.status = 429;
    ctx.response.body = {
      message: "Trop de requêtes. Veuillez patienter avant de réessayer.",
    };
    return;
  }

  try {
    const { email, password } = await ctx.request.body({ type: "json" }).value;

    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = {
        message: "L'e-mail et le mot de passe sont obligatoires.",
      };
      return;
    }

    const r = await query("SELECT * FROM users WHERE email=$1", [
      email.toLowerCase(),
    ]);
    const user = r.rows[0] as User;

    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects." };
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password || "");
    if (!passwordMatch) {
      ctx.response.status = 401;
      ctx.response.body = { message: "Identifiants incorrects." };
      return;
    }

    if (!user.is_verified) {
      ctx.response.status = 403;
      ctx.response.body = {
        message: "Veuillez vérifier votre compte avant de vous connecter.",
      };
      return;
    }

    const jwt = await create(
      { alg: "HS512", typ: "JWT" },
      { id: user.id, exp: getNumericDate(config.jwtExpirationSeconds) },
      jwtKey,
    );

    ctx.cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      // nginx termine le TLS et transmet en HTTP : sans cette option, Oak lève
      // une exception (et fait planter l'API) au lieu de poser le cookie Secure.
      ignoreInsecure: true,
      sameSite: "lax",
      maxAge: config.jwtExpirationSeconds,
      path: "/",
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
        transaction_count: user.transaction_count,
        is_admin: user.is_admin,
      },
    };
  } catch (e) {
    console.error("❌ Erreur connexion:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      message: "Erreur lors de la connexion. Veuillez réessayer.",
    };
  }
});

/**
 * Vérifie si une adresse email est déjà enregistrée.
 */
router.get("/api/auth/check-email", async (ctx) => {
  try {
    const email = ctx.request.url.searchParams.get("email");
    if (!email) {
      ctx.response.status = 400;
      ctx.response.body = { message: "L'e-mail est obligatoire." };
      return;
    }

    const r = await query(
      "SELECT id FROM users WHERE email=$1",
      [email.toLowerCase()],
    );
    
    ctx.response.body = { exists: r.rows.length > 0 };
  } catch (e) {
    console.error("❌ Erreur check-email:", e);
    ctx.response.status = 500;
    ctx.response.body = { message: "Erreur serveur lors de la vérification de l'adresse e-mail." };
  }
});

export default router;
