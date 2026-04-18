/**
 * Centralized logger — routes all output through redactSensitive.
 * Ensures no tokens, passwords, or PII leak into logs.
 *
 * Usage: import { logger } from '@/lib/logger';
 *        logger.error('Login failed', { email, error });
 */

import { redactSensitive } from '@/lib/security/encryption';

function formatContext(context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) return '';
  return ' ' + JSON.stringify(redactSensitive(context));
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}${formatContext(context)}`);
  },
  warn(message: string, context?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}${formatContext(context)}`);
  },
  error(message: string, context?: Record<string, unknown>) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}${formatContext(context)}`);
  },
};
