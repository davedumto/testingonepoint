import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getEmployeeUser, setEmployeeCookie } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { isValidTimezone } from '@/lib/timezones';
import { safeValidate } from '@/lib/security/validation';
import { auditLog } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const schema = z.object({
  name: z.string().min(1).max(100).trim(),
  timezone: z.string().optional(),
  jobTitle: z.string().max(120).optional().or(z.literal('')),
  department: z.string().max(120).optional().or(z.literal('')),
  bio: z.string().max(1000).optional().or(z.literal('')),
  photoUrl: z.string().url().max(2000).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  birthday: z.string().optional().or(z.literal('')),
  hireDate: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(40).optional().or(z.literal('')),
  emergencyContactRelation: z.string().max(60).optional().or(z.literal('')),
  shareEmergencyContactWithTeam: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    if (data.timezone && !isValidTimezone(data.timezone)) {
      return Response.json({ error: 'Invalid timezone.' }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findById(session.employeeId);
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

    employee.name = data.name.trim();
    if (data.timezone) employee.timezone = data.timezone;

    // Optional fields: empty string means "clear this field"
    if (data.jobTitle !== undefined) employee.jobTitle = data.jobTitle || undefined;
    if (data.department !== undefined) employee.department = data.department || undefined;
    if (data.bio !== undefined) employee.bio = data.bio || undefined;
    if (data.photoUrl !== undefined) employee.photoUrl = data.photoUrl || undefined;
    if (data.phone !== undefined) employee.phone = data.phone || undefined;
    if (data.birthday !== undefined) employee.birthday = data.birthday ? new Date(data.birthday) : undefined;
    if (data.hireDate !== undefined) employee.hireDate = data.hireDate ? new Date(data.hireDate) : undefined;
    if (data.emergencyContactName !== undefined) employee.emergencyContactName = data.emergencyContactName || undefined;
    if (data.emergencyContactPhone !== undefined) employee.emergencyContactPhone = data.emergencyContactPhone || undefined;
    if (data.emergencyContactRelation !== undefined) employee.emergencyContactRelation = data.emergencyContactRelation || undefined;
    if (data.shareEmergencyContactWithTeam !== undefined) employee.shareEmergencyContactWithTeam = data.shareEmergencyContactWithTeam;

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

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Employee update-profile error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
