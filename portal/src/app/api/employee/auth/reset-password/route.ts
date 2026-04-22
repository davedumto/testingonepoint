import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { safeValidate, resetPasswordSchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { clearLoginAttempts } from '@/lib/security/account-lockout';
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

    const employee = await Employee.findOne({
      resetToken: tokenHashed,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!employee) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE, status: 'failure', details: { reason: 'invalid_or_expired_token', portal: 'employee' } });
      return Response.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    employee.password = password;
    employee.resetToken = undefined;
    employee.resetTokenExpiry = undefined;
    await employee.save();

    await clearLoginAttempts(employee.email);

    auditLog({ userId: employee._id.toString(), userEmail: employee.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE, status: 'success', details: { portal: 'employee' } });

    return Response.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    logger.error('Employee reset password error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
