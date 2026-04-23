import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';

export async function POST() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await Notification.updateMany(
    { userId: user.employeeId, read: false },
    { $set: { read: true, readAt: new Date() } },
  );

  return Response.json({ success: true, unreadCount: 0 });
}
