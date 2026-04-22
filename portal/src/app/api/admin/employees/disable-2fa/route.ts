import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { hmacEmail } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// Admin emergency disable. Used when an employee loses their phone and has
// burned through all backup codes. Audit-logged.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ hmacEmail: hmacEmail(email) });
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

    const wasEnabled = !!employee.twoFactorEnabled;
    employee.twoFactorEnabled = false;
    employee.twoFactorSecret = undefined;
    employee.twoFactorBackupCodes = undefined;
    await employee.save();

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.TWO_FA_SETUP,
      status: 'success',
      severity: 'warning',
      targetResource: employee._id.toString(),
      details: { targetEmail: email, adminDisabled: true, wasEnabled, portal: 'employee' },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Admin disable-2FA error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
