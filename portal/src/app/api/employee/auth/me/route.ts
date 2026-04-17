import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

export async function GET() {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // Fetch fresh data from DB instead of relying on JWT payload
  await connectDB();
  const employee = await Employee.findById(session.employeeId).select('name email');

  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

  return Response.json({
    employee: {
      employeeId: session.employeeId,
      userId: session.employeeId,
      name: employee.name,
      email: employee.email,
    },
  });
}
