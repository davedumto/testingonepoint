import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getEmployeeUser, setEmployeeCookie } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { isValidTimezone } from '@/lib/timezones';
import { auditLog } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

export async function PUT(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { name, timezone } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return Response.json({ error: 'Name too long.' }, { status: 400 });
    }
    if (timezone && !isValidTimezone(timezone)) {
      return Response.json({ error: 'Invalid timezone.' }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(session.employeeId);
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

    employee.name = name.trim();
    if (timezone) employee.timezone = timezone;
    await employee.save();

    // Refresh cookie so JWT carries current name
    await setEmployeeCookie({
      employeeId: employee._id.toString(),
      userId: employee._id.toString(),
      email: employee.email,
      name: employee.name || '',
    });

    auditLog({
      userId: session.employeeId,
      userEmail: session.email,
      ipAddress: ip,
      userAgent,
      action: 'admin.data_viewed',
      status: 'success',
      details: { action: 'employee_profile_update', portal: 'employee' },
    });

    return Response.json({
      success: true,
      employee: { name: employee.name, email: employee.email, timezone: employee.timezone },
    });
  } catch (error) {
    logger.error('Employee update-profile error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
