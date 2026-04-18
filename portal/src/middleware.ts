/**
 * Next.js Middleware — Security Headers + CSRF Validation
 *
 * Applies security headers to every response.
 * Validates CSRF tokens on all POST/PUT/PATCH/DELETE requests to /api and /employee/api.
 * Exempts login, signup, webhook, and 2FA-verify routes (they issue tokens, not consume them).
 */

import { NextRequest, NextResponse } from 'next/server';

const CSRF_COOKIE = 'op_csrf';
const CSRF_HEADER = 'x-csrf-token';

// Routes that are exempt from CSRF validation (they create sessions / are external)
const CSRF_EXEMPT = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/admin-login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/2fa/login-verify',
  '/api/employee/auth/login',
  '/api/employee/auth/setup-password',
  '/api/webhooks/',
];

function isCSRFExempt(pathname: string): boolean {
  return CSRF_EXEMPT.some(exempt => pathname.startsWith(exempt));
}

// Constant-time string comparison without Node.js crypto (Edge Runtime compatible)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(req: NextRequest) {
  const { method, nextUrl: { pathname } } = req;

  // CSRF validation on state-changing requests to API routes
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isAPIRoute = pathname.startsWith('/api/') || pathname.startsWith('/employee/api/');

  if (isStateChanging && isAPIRoute && !isCSRFExempt(pathname)) {
    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get(CSRF_HEADER);

    if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
      return NextResponse.json(
        { error: 'CSRF validation failed.' },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();

  // ── Security Headers ──
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://services.leadconnectorhq.com https://hooks.leadconnectorhq.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
  response.headers.delete('X-Powered-By');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.webp).*)',
  ],
};
