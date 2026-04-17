import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { verifyTOTP } from '@/lib/security/two-factor';
import { decryptPII } from '@/lib/security/encryption';
import { safeValidate, totpVerifySchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';

// POST — verify a TOTP token (enables 2FA on first verify, validates on subsequent logins)
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(totpVerifySchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { token } = validation.data;

  await connectDB();
  const user = await User.findById(authUser.userId);
  if (!user || !user.twoFactorSecret) {
    return Response.json({ error: 'Set up 2FA first.' }, { status: 400 });
  }

  // Decrypt the stored secret
  let secret: string;
  try {
    secret = decryptPII(user.twoFactorSecret);
  } catch {
    secret = user.twoFactorSecret; // Fallback if not encrypted (dev mode)
  }

  const isValid = verifyTOTP(token, secret);

  if (!isValid) {
    await auditLog({
      userId: authUser.userId,
      userEmail: authUser.email,
      action: AUDIT_ACTIONS.TWO_FA_FAILED,
      status: 'failure',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      severity: 'warning',
    });
    return Response.json({ error: 'Invalid code. Try again.' }, { status: 401 });
  }

  // Enable 2FA if not already
  if (!user.twoFactorEnabled) {
    user.twoFactorEnabled = true;
    await user.save();
  }

  await auditLog({
    userId: authUser.userId,
    userEmail: authUser.email,
    action: AUDIT_ACTIONS.TWO_FA_VERIFY,
    status: 'success',
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  });

  return Response.json({ success: true, twoFactorEnabled: true });
}
