import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

export async function GET() {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // Fetch fresh data from DB instead of relying on JWT payload
  await connectDB();
  const employee = await Employee.findById(session.employeeId).select('name email timezone twoFactorEnabled twoFactorBackupCodes hasCompletedOnboarding photoUrl');

  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

  // Fallback: if name is somehow empty (stale record, partial setup), show
  // the email prefix so the sidebar never renders "Loading…" forever.
  const displayName = employee.name?.trim() || employee.email.split('@')[0];

  return Response.json({
    employee: {
      employeeId: session.employeeId,
      userId: session.employeeId,
      name: displayName,
      email: employee.email,
      timezone: employee.timezone,
      twoFactorEnabled: !!employee.twoFactorEnabled,
      backupCodesRemaining: employee.twoFactorBackupCodes?.length ?? 0,
      hasCompletedOnboarding: !!employee.hasCompletedOnboarding,
      photoUrl: employee.photoUrl || undefined,
    },
  });
}
