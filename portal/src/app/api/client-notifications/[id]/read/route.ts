import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { logger } from '@/lib/logger';

// POST /api/client-notifications/[id]/read — mark one notification as read.
// Only the owning client can mark their own notifications.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    const result = await Notification.findOneAndUpdate(
      { _id: id, userId: user.userId, userModel: 'Client' },
      { $set: { read: true, readAt: new Date() } },
      { new: true },
    );

    if (!result) return Response.json({ error: 'Notification not found.' }, { status: 404 });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Client notification read error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
