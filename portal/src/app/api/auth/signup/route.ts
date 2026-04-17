import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, signupSchema } from '@/lib/security/validation';
import { getRequestInfo } from '@/lib/security/request-info';

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit
    const rateKey = getRateLimitKey(ip, 'signup');
    const rateResult = checkRateLimit(rateKey, RATE_LIMITS.signup);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'signup' } });
      return Response.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
    }

    // Validate input
    const body = await req.json();
    const validation = safeValidate(signupSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { name, email, password } = validation.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const user = await User.create({ name, email, password });

    await setAuthCookie({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.SIGNUP, status: 'success' });

    // Send welcome email (non-blocking)
    try {
      const { sendWelcomeEmail } = await import('@/lib/email');
      sendWelcomeEmail(user.email, user.name).catch(console.error);
    } catch { /* Email sending is optional */ }

    return Response.json({
      success: true,
      user: { name: user.name, email: user.email },
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
