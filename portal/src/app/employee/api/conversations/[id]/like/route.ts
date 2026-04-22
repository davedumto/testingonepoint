import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import ConversationPost from '@/models/ConversationPost';
import { logger } from '@/lib/logger';
import { publish, CHANNELS } from '@/lib/pusher/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    await connectDB();

    const post = await ConversationPost.findById(id);
    if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 });

    const uid = new mongoose.Types.ObjectId(user.employeeId);
    const idx = post.likes.findIndex((l: mongoose.Types.ObjectId) => l.toString() === user.employeeId);
    if (idx >= 0) post.likes.splice(idx, 1); else post.likes.push(uid);
    await post.save();

    const liked = idx < 0;
    publish(CHANNELS.conversations, 'like:update', {
      postId: post._id.toString(),
      likeCount: post.likes.length,
      likerId: user.employeeId,
      liked,
    });

    return Response.json({ success: true, liked, likeCount: post.likes.length });
  } catch (error) {
    logger.error('Conversation like error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
