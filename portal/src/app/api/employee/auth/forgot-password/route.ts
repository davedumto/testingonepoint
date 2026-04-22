import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { safeValidate, forgotPasswordSchema } from '@/lib/security/validation';
import { getRequestInfo } from '@/lib/security/request-info';
import { hmacEmail } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const rateKey = getRateLimitKey(ip, 'employee-password-reset');
    const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
    if (!rateResult.allowed) {
      auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'employee-forgot-password' } });
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const validation = safeValidate(forgotPasswordSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { email } = validation.data;

    await connectDB();

    const employee = await Employee.findOne({ hmacEmail: hmacEmail(email) });

    if (!employee) {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'failure', details: { reason: 'employee_not_found', portal: 'employee' } });
      return Response.json({
        success: true,
        message: 'If an employee account with that email exists, we sent a password reset link.',
      });
    }

    if (!employee.isSetup) {
      auditLog({ userId: employee._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'failure', details: { reason: 'account_not_setup', portal: 'employee' } });
      return Response.json({
        success: true,
        message: 'If an employee account with that email exists, we sent a password reset link.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    employee.resetToken = resetTokenHashed;
    employee.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await employee.save();

    auditLog({ userId: employee._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST, status: 'success', details: { portal: 'employee' } });

    try {
      const { sendEmployeePasswordResetEmail } = await import('@/lib/employee-email');
      sendEmployeePasswordResetEmail(employee.email, employee.name || employee.email.split('@')[0], resetToken).catch((err) => logger.error('Employee password reset email error', { error: String(err) }));
    } catch { /* Don't block */ }

    return Response.json({
      success: true,
      message: 'If an employee account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    logger.error('Employee forgot password error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
