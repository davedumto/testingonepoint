import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import { verifyTOTP } from '@/lib/security/two-factor';
import { decryptPII } from '@/lib/security/encryption';
import { safeValidate, totpVerifySchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { generateCSRFToken } from '@/lib/security/csrf';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    // Read the pending 2FA cookie
    const cookieStore = await cookies();
    const pendingToken = cookieStore.get('op_pending_2fa')?.value;

    if (!pendingToken) {
      return Response.json({ error: 'No pending 2FA session. Please log in again.' }, { status: 401 });
    }

    // Verify the pending JWT
    let pending: { userId: string; email: string; name: string; pending2fa: boolean };
    try {
      pending = jwt.verify(pendingToken, JWT_SECRET) as typeof pending;
    } catch {
      cookieStore.delete('op_pending_2fa');
      return Response.json({ error: '2FA session expired. Please log in again.' }, { status: 401 });
    }

    if (!pending.pending2fa) {
      return Response.json({ error: 'Invalid 2FA session.' }, { status: 401 });
    }

    // Validate TOTP input
    const body = await req.json();
    const validation = safeValidate(totpVerifySchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { token } = validation.data;

    await connectDB();
    const user = await User.findById(pending.userId);
    if (!user || !user.twoFactorSecret) {
      return Response.json({ error: '2FA not configured.' }, { status: 400 });
    }

    // Decrypt the stored TOTP secret
    let secret: string;
    try {
      secret = decryptPII(user.twoFactorSecret);
    } catch {
      secret = user.twoFactorSecret; // Fallback for dev mode
    }

    const isValid = verifyTOTP(token, secret);

    if (!isValid) {
      auditLog({ userId: pending.userId, userEmail: pending.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_FAILED, status: 'failure', severity: 'warning' });
      return Response.json({ error: 'Invalid code. Try again.' }, { status: 401 });
    }

    // 2FA passed — clear pending cookie and issue real session
    cookieStore.delete('op_pending_2fa');

    await setAuthCookie({
      userId: pending.userId,
      email: pending.email,
      name: pending.name,
    });

    await generateCSRFToken();

    auditLog({ userId: pending.userId, userEmail: pending.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_VERIFY, status: 'success', details: { context: 'login' } });

    return Response.json({
      success: true,
      user: { name: pending.name, email: pending.email },
    });
  } catch (error) {
    logger.error('2FA login-verify error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
