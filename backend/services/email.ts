/**
 * @file email.ts
 * @description Simulateur d'envoi d'e-mails de vérification.
 */

import { config } from "../config.ts";

/**
 * Simule l'envoi d'un e-mail de vérification de compte.
 * @param email Adresse e-mail du destinataire
 * @param _name Nom du destinataire
 * @param token Token de vérification unique
 */
export async function sendVerificationEmail(
  email: string,
  _name: string,
  token: string,
) {
  const link = `${config.appUrl}/api/auth/verify?token=${token}`;
  console.log(`\n📧 EMAIL envoyé à ${email}\nLien : ${link}\n`);
  // TODO : Intégrer un vrai service d'envoi d'emails (ex: Resend, Mailgun)
  await Promise.resolve();
}
