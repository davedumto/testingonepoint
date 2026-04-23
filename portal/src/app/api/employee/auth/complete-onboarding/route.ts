import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';

// POST — called from the onboarding tour when the user finishes the last step.
// Idempotent: flipping a true flag to true is a no-op.
export async function POST() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await Employee.findByIdAndUpdate(user.employeeId, { hasCompletedOnboarding: true });

  return Response.json({ success: true });
}
