/**
 * @file validators.ts
 * @description Fonctions de validation et de nettoyage des entrées utilisateurs.
 */

/**
 * Validation d'une adresse email.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validation de la force du mot de passe.
 * Minimum 8 caractères, au moins 1 lettre et 1 chiffre.
 */
export function isValidPassword(
  password: string,
): { valid: boolean; message: string } {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      message: "Le mot de passe doit contenir au moins une lettre.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Le mot de passe doit contenir au moins un chiffre.",
    };
  }
  return { valid: true, message: "" };
}

/**
 * Validation d'un numéro de téléphone (format international ou français).
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\.]/g, "");
  return /^(\+?[0-9]{7,15})$/.test(cleaned);
}

/**
 * Validation du nom d'utilisateur.
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 255;
}

/**
 * Échappe les caractères spéciaux pour éviter les injections (defense-in-depth).
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>"'%;()&+]/g, "");
}
