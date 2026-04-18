/**
 * MongoDB-backed Rate Limiter
 *
 * Durable across restarts and serverless instances.
 * Uses atomic findOneAndUpdate with upsert for concurrent safety.
 */

import { connectDB } from '@/lib/db';
import RateLimit from '@/models/RateLimit';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 10 * 60 * 1000 },         // 5 per 10 min
  passwordReset: { maxRequests: 3, windowMs: 15 * 60 * 1000 },  // 3 per 15 min
  oauth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },         // 10 per 15 min
  api: { maxRequests: 60, windowMs: 60 * 1000 },                // 60 per min
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 },         // 3 per hour
  clockInOut: { maxRequests: 30, windowMs: 60 * 1000 },         // 30 per min
  extraHours: { maxRequests: 10, windowMs: 60 * 60 * 1000 },    // 10 per hour
  adminList: { maxRequests: 30, windowMs: 60 * 1000 },          // 30 per min
} as const;

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  await connectDB();

  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Atomic upsert: increment count if within window, reset if expired
  const result = await RateLimit.findOneAndUpdate(
    { key, windowStart: { $gte: windowStart } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!result) {
    // No record in current window — create fresh
    await RateLimit.findOneAndUpdate(
      { key },
      { $set: { windowStart: now, count: 1 } },
      { upsert: true, new: true }
    );
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  const resetIn = Math.max(0, config.windowMs - (now.getTime() - result.windowStart.getTime()));
  const remaining = Math.max(0, config.maxRequests - result.count);

  if (result.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

export function getRateLimitKey(ip: string, endpoint: string): string {
  return `${endpoint}:${ip}`;
}
