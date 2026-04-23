import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';

// GET — paginated list with unread count. Defaults to newest first.
export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const unreadOnly = searchParams.get('unread') === '1';

  await connectDB();
  const query: Record<string, unknown> = { userId: user.employeeId };
  if (unreadOnly) query.read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId: user.employeeId, read: false }),
  ]);

  return Response.json({
    notifications: items.map(n => ({
      _id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      priority: n.priority,
      read: n.read,
      readAt: n.readAt,
      actorName: n.actorName,
      createdAt: n.createdAt,
    })),
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
