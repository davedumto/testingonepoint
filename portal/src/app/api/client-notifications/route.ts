import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';

// GET /api/client-notifications — this client's notification feed. Returns
// the last 50 notifications + unread count so the bell badge and the full
// notifications page both get what they need from one round-trip.
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === '1';

  try {
    await connectDB();

    const query: Record<string, unknown> = { userId: user.userId, userModel: 'Client' };
    if (unreadOnly) query.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ userId: user.userId, userModel: 'Client', read: false }),
    ]);

    return Response.json({
      notifications: notifications.map(n => ({
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
    });
  } catch (error) {
    logger.error('Client notifications list error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
