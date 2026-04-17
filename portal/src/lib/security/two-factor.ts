/**
 * TOTP-Based Two-Factor Authentication
 *
 * PURPOSE: Requires all employees and admins to verify with a time-based one-time password.
 * Uses authenticator apps (Google Authenticator, Authy, 1Password) — NOT SMS.
 *
 * WHY TOTP NOT SMS: SMS is vulnerable to SIM-swap attacks. TOTP is cryptographic and local.
 */

import { generateSecret, generateURI, verifySync } from 'otplib';

const ISSUER = 'OnePoint Insurance Portal';

/**
 * Generate a new TOTP secret for a user.
 * Returns the secret and the otpauth URI for QR code generation.
 */
export function generateTOTPSecret(userEmail: string): { secret: string; otpauthUrl: string } {
  const secret = generateSecret();
  const otpauthUrl = generateURI({ issuer: ISSUER, label: userEmail, secret });
  return { secret, otpauthUrl };
}

/**
 * Verify a TOTP token against the user's secret.
 * Allows 1 window tolerance (30 seconds before/after).
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Generate a QR code data URL from the otpauth URI.
 * User scans this with their authenticator app.
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(otpauthUrl);
}
