/**
 * Rate Limiter
 *
 * PURPOSE: Prevents brute force attacks on login, OAuth, and password reset endpoints.
 * In-memory store — for production, use Redis.
 *
 * WHY: Login = 5 per 10 min, OAuth = 10 per 15 min, General API = 60 per min.
 * Stricter limits on sensitive endpoints reduce attack surface.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now > record.resetAt) store.delete(key);
  }
}, 300000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 10 * 60 * 1000 },       // 5 per 10 min
  passwordReset: { maxRequests: 3, windowMs: 15 * 60 * 1000 }, // 3 per 15 min
  oauth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },       // 10 per 15 min
  api: { maxRequests: 60, windowMs: 60 * 1000 },              // 60 per min
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 },       // 3 per hour
} as const;

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  record.count++;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetIn = record.resetAt - now;

  if (record.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

export function getRateLimitKey(ip: string, endpoint: string): string {
  return `${endpoint}:${ip}`;
}
