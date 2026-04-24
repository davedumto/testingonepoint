import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';

// POST /api/client-notifications/read-all — mark every unread client
// notification for this user as read. Clears the bell badge in one shot.
export async function POST() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    await Notification.updateMany(
      { userId: user.userId, userModel: 'Client', read: false },
      { $set: { read: true, readAt: new Date() } },
    );
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Client notifications read-all error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
