import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import EmailCode from '@/models/EmailCode';
import { hmacEmail } from '@/lib/security/encryption';
import { setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { generateCSRFToken } from '@/lib/security/csrf';
import { logger } from '@/lib/logger';

const MAX_ATTEMPTS = 5;

const verifyCodeSchema = z.object({
  email: z.string().email('Invalid email').max(255).toLowerCase().trim(),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be numeric'),
});

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit attempts per IP
    const rateKey = getRateLimitKey(ip, 'verify-code');
    const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.login);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'verify-code' } });
      return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const validation = safeValidate(verifyCodeSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { email, code } = validation.data;

    await connectDB();

    const he = hmacEmail(email);
    const record = await EmailCode.findOne({ hmacEmail: he });

    if (!record) {
      return Response.json({ error: 'Code expired or not found. Request a new one.' }, { status: 400 });
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      await EmailCode.deleteOne({ _id: record._id });
      return Response.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
    }

    // Per-code attempt lockout
    if (record.attempts >= MAX_ATTEMPTS) {
      await EmailCode.deleteOne({ _id: record._id });
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', severity: 'critical', details: { reason: 'otp_max_attempts', portal: 'client' } });
      return Response.json({ error: 'Too many wrong attempts. Request a new code.' }, { status: 429 });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== record.codeHash) {
      record.attempts += 1;
      await record.save();
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', details: { reason: 'wrong_otp', attempt: record.attempts, portal: 'client' } });
      return Response.json({ error: 'Incorrect code. Try again.' }, { status: 401 });
    }

    // Success — consume the code, issue the session
    await EmailCode.deleteOne({ _id: record._id });

    const user = await User.findOne({ hmacEmail: he });
    if (!user) {
      // Shouldn't happen since request-code verified this, but guard anyway
      return Response.json({ error: 'Account not found.' }, { status: 404 });
    }

    await setAuthCookie({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    await generateCSRFToken();

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success', details: { portal: 'client', method: 'otp' } });

    return Response.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (error) {
    logger.error('Verify-code error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
