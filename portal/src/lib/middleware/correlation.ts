/**
 * Correlation ID middleware using AsyncLocalStorage.
 * Generates a UUID per request and makes it available to audit logging.
 */

import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

interface RequestContext {
  correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function getCorrelationId(): string | undefined {
  return requestContext.getStore()?.correlationId;
}
