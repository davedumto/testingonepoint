import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import EmailCode from '@/models/EmailCode';
import { hmacEmail } from '@/lib/security/encryption';
import { namesFuzzyMatch } from '@/lib/name-match';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { sendClientLoginCode } from '@/lib/email';
import { logger } from '@/lib/logger';

const CODE_TTL_MS = 10 * 60 * 1000;

const requestCodeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120).trim(),
  email: z.string().email('Invalid email').max(255).toLowerCase().trim(),
});

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Rate limit by IP to slow down enumeration attempts
    const rateKey = getRateLimitKey(ip, 'request-code');
    const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'request-code' } });
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const validation = safeValidate(requestCodeSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { name, email } = validation.data;

    await connectDB();

    const user = await User.findOne({ hmacEmail: hmacEmail(email) });

    // Shared "not found" path. Same response whether email isn't in DB or name
    // doesn't match — don't leak which. matched=false lets the client show the
    // "become a client" CTA.
    const notFound = () => {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', details: { reason: 'not_a_client', portal: 'client' } });
      return Response.json({ matched: false });
    };

    if (!user) return notFound();
    if (!namesFuzzyMatch(name, user.name)) return notFound();

    // Generate a 6-digit code. Store only the sha256 hash + a 10-min expiry.
    // Prior unexpired codes for this email are superseded.
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const he = hmacEmail(email);

    await EmailCode.deleteMany({ hmacEmail: he });
    await EmailCode.create({
      hmacEmail: he,
      codeHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    auditLog({ userId: user._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'success', details: { portal: 'client', context: 'otp_request' } });

    // Non-blocking email send — don't let SMTP latency block the API.
    sendClientLoginCode(user.email, user.name || 'there', code).catch((err) => {
      logger.error('Client login code email error', { error: String(err) });
    });

    return Response.json({ matched: true });
  } catch (error) {
    logger.error('Request-code error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
