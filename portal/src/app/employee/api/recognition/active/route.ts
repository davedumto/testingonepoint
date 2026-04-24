import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import EmployeeOfMonth from '@/models/EmployeeOfMonth';

// GET — returns the currently active Employee of the Month, or null.
// "Active" = newest record whose 24h window hasn't elapsed yet. Powers the
// celebration banner on the employee dashboard.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const now = new Date();

  const active = await EmployeeOfMonth
    .findOne({ expiresAt: { $gt: now } })
    .sort({ publishedAt: -1 })
    .lean();

  if (!active) return Response.json({ active: null });

  return Response.json({
    active: {
      _id: active._id.toString(),
      employeeId: active.employeeId.toString(),
      employeeName: active.employeeName,
      employeePhotoUrl: active.employeePhotoUrl,
      message: active.message,
      publishedAt: active.publishedAt.toISOString(),
      expiresAt: active.expiresAt.toISOString(),
    },
  });
}
