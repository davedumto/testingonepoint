import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import ConversationPost from '@/models/ConversationPost';
import ConversationReply from '@/models/ConversationReply';
import Employee from '@/models/Employee';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';
import { publish, CHANNELS } from '@/lib/pusher/server';

const replySchema = z.object({ body: z.string().min(1).max(5000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const validation = safeValidate(replySchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    await connectDB();

    const post = await ConversationPost.findById(id);
    if (!post) return Response.json({ error: 'Post not found.' }, { status: 404 });

    const employee = await Employee.findById(user.employeeId).select('name');
    if (!employee) return Response.json({ error: 'Not found.' }, { status: 404 });

    const reply = await ConversationReply.create({
      postId: post._id,
      authorId: employee._id,
      authorName: employee.name || user.email,
      body: validation.data.body,
    });

    post.replyCount = (post.replyCount || 0) + 1;
    post.updatedAt = new Date();
    await post.save();

    publish(CHANNELS.conversations, 'reply:new', {
      postId: post._id.toString(),
      replyCount: post.replyCount,
      reply: {
        _id: reply._id.toString(),
        authorId: reply.authorId.toString(),
        authorName: reply.authorName,
        body: reply.body,
        createdAt: reply.createdAt,
      },
    });

    return Response.json({ success: true, reply }, { status: 201 });
  } catch (error) {
    logger.error('Conversation reply error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
