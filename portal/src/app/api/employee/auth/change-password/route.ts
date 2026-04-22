import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getEmployeeUser } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { safeValidate, changePasswordSchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

export async function PUT(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(changePasswordSchema, body);
    if (!validation.success) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { currentPassword, newPassword } = validation.data;

    if (currentPassword === newPassword) {
      return Response.json({ error: 'New password must be different from current.' }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(session.employeeId);
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

    const isMatch = await employee.comparePassword(currentPassword);
    if (!isMatch) {
      auditLog({
        userId: session.employeeId,
        userEmail: session.email,
        ipAddress: ip,
        userAgent,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        status: 'failure',
        details: { reason: 'wrong_current_password', portal: 'employee' },
      });
      return Response.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    employee.password = newPassword;
    await employee.save();

    auditLog({
      userId: session.employeeId,
      userEmail: session.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      status: 'success',
      details: { portal: 'employee' },
    });

    return Response.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Employee change-password error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
