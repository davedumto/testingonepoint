import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { isAccountLocked, recordFailedLogin, clearLoginAttempts } from '@/lib/security/account-lockout';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, loginSchema } from '@/lib/security/validation';
import { hmacEmail } from '@/lib/security/encryption';
import { getRequestInfo } from '@/lib/security/request-info';
import { generateCSRFToken } from '@/lib/security/csrf';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit check
    const rateKey = getRateLimitKey(ip, 'login');
    const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.login);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'login' } });
      return Response.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateResult.resetIn / 1000)) } }
      );
    }

    // Validate input
    const body = await req.json();
    const validation = safeValidate(loginSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { email, password } = validation.data;

    await connectDB();

    // Account lockout check
    const locked = await isAccountLocked(email);
    if (locked) {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', severity: 'critical', details: { reason: 'account_locked' } });
      return Response.json({ error: 'Account is locked. Contact your administrator.' }, { status: 423 });
    }

    const user = await User.findOne({ hmacEmail: hmacEmail(email) });
    if (!user) {
      await recordFailedLogin(email);
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', details: { reason: 'user_not_found' } });
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const lockResult = await recordFailedLogin(email);
      if (lockResult.locked) {
        auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ACCOUNT_LOCKED, status: 'failure', severity: 'critical' });
      } else {
        auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', details: { attemptsLeft: lockResult.attemptsLeft } });
      }
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Success — clear lockout counter
    await clearLoginAttempts(email);

    // Check if 2FA is enabled — if so, issue pending token instead of session
    if (user.twoFactorEnabled) {
      const pendingToken = jwt.sign(
        { userId: user._id.toString(), email: user.email, name: user.name, pending2fa: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      const cookieStore = await cookies();
      cookieStore.set('op_pending_2fa', pendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 minutes
        path: '/',
      });

      auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success', details: { requires2FA: true } });

      return Response.json({ success: true, requires2FA: true });
    }

    // No 2FA — issue session directly
    await setAuthCookie({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    await generateCSRFToken();

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success' });

    return Response.json({
      success: true,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    logger.error('Login error', { error: String(error) });
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
