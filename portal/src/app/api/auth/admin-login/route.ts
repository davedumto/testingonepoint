import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, adminLoginSchema } from '@/lib/security/validation';
import { getRequestInfo } from '@/lib/security/request-info';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit
    const rateKey = getRateLimitKey(ip, 'admin-login');
    const rateResult = checkRateLimit(rateKey, RATE_LIMITS.login);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'critical', details: { endpoint: 'admin-login' } });
      return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    // Validate input
    const body = await req.json();
    const validation = safeValidate(adminLoginSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { email, password } = validation.data;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', severity: 'critical', details: { portal: 'admin' } });
      return Response.json({ error: 'Invalid admin credentials.' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: 'admin', email: ADMIN_EMAIL, name: 'Admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    const cookieStore = await cookies();
    cookieStore.set('op_admin', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4,
      path: '/',
    });

    auditLog({ userId: 'admin', userEmail: ADMIN_EMAIL, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success', details: { portal: 'admin' } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
