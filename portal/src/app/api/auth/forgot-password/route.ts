import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, forgotPasswordSchema } from '@/lib/security/validation';
import { getRequestInfo } from '@/lib/security/request-info';

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit — stricter for password reset
    const rateKey = getRateLimitKey(ip, 'password-reset');
    const rateResult = checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'forgot-password' } });
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Validate input
    const body = await req.json();
    const validation = safeValidate(forgotPasswordSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { email } = validation.data;

    await connectDB();

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'failure', details: { reason: 'user_not_found' } });
      return Response.json({
        success: true,
        message: 'If an account with that email exists, we sent a password reset link.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetToken = resetTokenHashed;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'success' });

    // Send reset email (non-blocking)
    try {
      const { sendPasswordResetEmail } = await import('@/lib/email');
      sendPasswordResetEmail(user.email, user.name, resetToken).catch(console.error);
    } catch { /* Don't block */ }

    return Response.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
