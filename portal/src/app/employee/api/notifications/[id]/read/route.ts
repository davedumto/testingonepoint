import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();

  // Scoped update — user can only mark their own notifications read.
  const result = await Notification.findOneAndUpdate(
    { _id: id, userId: user.employeeId },
    { $set: { read: true, readAt: new Date() } },
    { new: true },
  );

  if (!result) return Response.json({ error: 'Not found.' }, { status: 404 });

  const unreadCount = await Notification.countDocuments({ userId: user.employeeId, read: false });
  return Response.json({ success: true, unreadCount });
}
