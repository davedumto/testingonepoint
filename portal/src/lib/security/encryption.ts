/**
 * AES-256-GCM Encryption Module
 *
 * PURPOSE: Encrypts sensitive data at rest — OAuth tokens, PII fields.
 * Uses two separate keys: one for OAuth tokens, one for PII.
 * Keys stored in env vars, never in code or git.
 *
 * WHY AES-256-GCM: Authenticated encryption — provides both confidentiality
 * and integrity. The auth tag ensures tampered ciphertext is rejected.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Two separate keys for defense in depth
const TOKEN_KEY = process.env.ENCRYPTION_KEY_TOKENS || '';
const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';

function getKeyBuffer(key: string): Buffer {
  if (!key || key.length < 32) {
    throw new Error('Encryption key must be at least 32 characters. Set ENCRYPTION_KEY_TOKENS and ENCRYPTION_KEY_PII in .env.local');
  }
  // Use SHA-256 to normalize key to exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getKeyBuffer(TOKEN_KEY);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encrypted: string): string {
  const key = getKeyBuffer(TOKEN_KEY);
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function encryptPII(plaintext: string): string {
  const key = getKeyBuffer(PII_KEY);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPII(encrypted: string): string {
  const key = getKeyBuffer(PII_KEY);
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted PII format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Redact sensitive values from log output.
 * Call this before logging ANY object that might contain tokens/secrets.
 */
export function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['accessToken', 'refreshToken', 'password', 'secret', 'token', 'apiKey', 'creditCard', 'ssn'];
  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(s => lowerKey.includes(s.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    }
  }

  return redacted;
}
