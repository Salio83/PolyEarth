/**
 * @file rate_limit.ts
 * @description Système de limitation du débit des requêtes (Rate Limiting) basé sur l'IP.
 */

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
export function isRateLimited(ip: string): boolean {
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

import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

/**
 * Obtenir l'adresse IP d'une requête Oak.
 */
export function getClientIP(ctx: Context): string {
  return ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ctx.request.headers.get("x-real-ip") ||
    "unknown";
}
