import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { isAccountLocked, recordFailedLogin, clearLoginAttempts } from '@/lib/security/account-lockout';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, loginSchema } from '@/lib/security/validation';
import { getRequestInfo } from '@/lib/security/request-info';

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit check
    const rateKey = getRateLimitKey(ip, 'login');
    const rateResult = checkRateLimit(rateKey, RATE_LIMITS.login);
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

    const user = await User.findOne({ email });
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

    await setAuthCookie({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success' });

    return Response.json({
      success: true,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
