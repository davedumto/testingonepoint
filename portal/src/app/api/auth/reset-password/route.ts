import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { safeValidate, resetPasswordSchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(resetPasswordSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { token, password } = validation.data;

    await connectDB();

    const tokenHashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetToken: tokenHashed,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE, status: 'failure', details: { reason: 'invalid_or_expired_token' } });
      return Response.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    auditLog({ userId: user._id.toString(), userEmail: user.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE, status: 'success' });

    return Response.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    logger.error('Reset password error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
