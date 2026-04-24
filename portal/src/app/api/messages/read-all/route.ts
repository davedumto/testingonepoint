import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientMessage from '@/models/ClientMessage';
import { logger } from '@/lib/logger';

// POST /api/messages/read-all — mark every agent-authored message to this
// client as read on the client's side. Clears the unread badge in the sidebar.
export async function POST() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    await ClientMessage.updateMany(
      { userId: user.userId, senderType: { $in: ['agent', 'admin'] }, readByClient: { $ne: true } },
      { $set: { readByClient: true } },
    );
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Messages read-all error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
