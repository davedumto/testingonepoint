import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { verifyTOTP } from '@/lib/security/two-factor';
import { decryptPII } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// Self-serve 2FA disable. Requires current password AND a valid TOTP code
// to prevent a stolen session from disabling 2FA.
export async function POST(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { password, token } = await req.json();
    if (!password || !token) {
      return Response.json({ error: 'Password and TOTP code required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findById(session.employeeId);
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    if (!employee.twoFactorEnabled || !employee.twoFactorSecret) {
      return Response.json({ error: '2FA is not enabled.' }, { status: 400 });
    }

    const passwordOk = await employee.comparePassword(password);
    if (!passwordOk) {
      auditLog({ userId: session.employeeId, userEmail: session.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_FAILED, status: 'failure', severity: 'warning', details: { reason: 'wrong_password_disable_attempt', portal: 'employee' } });
      return Response.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    let secret: string;
    try { secret = decryptPII(employee.twoFactorSecret); } catch { secret = employee.twoFactorSecret; }
    const totpOk = verifyTOTP(token, secret);
    if (!totpOk) {
      auditLog({ userId: session.employeeId, userEmail: session.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_FAILED, status: 'failure', severity: 'warning', details: { reason: 'wrong_totp_disable_attempt', portal: 'employee' } });
      return Response.json({ error: 'Invalid TOTP code.' }, { status: 401 });
    }

    employee.twoFactorEnabled = false;
    employee.twoFactorSecret = undefined;
    employee.twoFactorBackupCodes = undefined;
    await employee.save();

    auditLog({ userId: session.employeeId, userEmail: session.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_SETUP, status: 'success', details: { disabled: true, portal: 'employee' } });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Employee 2FA disable error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
