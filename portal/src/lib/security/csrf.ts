/**
 * CSRF Protection
 *
 * PURPOSE: Prevents cross-site request forgery on all state-changing requests (POST/PUT/DELETE).
 * Uses double-submit cookie pattern — a CSRF token is set in a cookie AND must be sent in the request header.
 *
 * WHY: SameSite cookies alone aren't enough for older browsers. Double-submit pattern adds defense in depth.
 */

import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'op_csrf';
const CSRF_HEADER = 'x-csrf-token';

export async function generateCSRFToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // Client JS needs to read this to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours (matches session)
  });
  return token;
}

export async function validateCSRF(headerToken: string | null): Promise<boolean> {
  if (!headerToken) return false;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  } catch {
    return false;
  }
}
