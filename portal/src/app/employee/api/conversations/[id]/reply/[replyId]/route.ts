import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import ConversationPost from '@/models/ConversationPost';
import ConversationReply from '@/models/ConversationReply';
import { logger } from '@/lib/logger';
import { publish, CHANNELS } from '@/lib/pusher/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; replyId: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, replyId } = await params;
    await connectDB();

    const reply = await ConversationReply.findById(replyId);
    if (!reply) return Response.json({ error: 'Reply not found.' }, { status: 404 });
    if (reply.postId.toString() !== id) return Response.json({ error: 'Reply does not belong to that post.' }, { status: 400 });

    // Only the author can delete their own reply for now. Admin override can
    // be layered on later via the admin dashboard.
    if (reply.authorId.toString() !== user.employeeId) {
      return Response.json({ error: 'You can only delete your own replies.' }, { status: 403 });
    }

    await reply.deleteOne();

    // Decrement the parent post's denormalized counter so the feed stays in sync.
    const post = await ConversationPost.findById(id);
    if (post) {
      post.replyCount = Math.max(0, (post.replyCount || 0) - 1);
      post.updatedAt = new Date();
      await post.save();
    }

    publish(CHANNELS.conversations, 'reply:delete', {
      postId: id,
      replyId,
      replyCount: post?.replyCount ?? 0,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Conversation reply delete error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
