import { NextRequest } from 'next/server';
import type { Types } from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import ConversationPost from '@/models/ConversationPost';
import ConversationReply from '@/models/ConversationReply';
import Employee from '@/models/Employee';
import { safeValidate } from '@/lib/security/validation';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { publish, CHANNELS } from '@/lib/pusher/server';

const createSchema = z.object({
  type: z.enum(['discussion', 'question', 'praise']).default('discussion'),
  body: z.string().min(1).max(5000),
  praiseRecipientName: z.string().max(120).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '15')));
  const type = searchParams.get('type');

  await connectDB();

  const query: Record<string, unknown> = {};
  if (type) query.type = type;

  const [posts, total] = await Promise.all([
    ConversationPost.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ConversationPost.countDocuments(query),
  ]);

  // Hydrate each post with its replies (could paginate replies separately for scale)
  const postIds = posts.map(p => p._id);
  const replies = await ConversationReply.find({ postId: { $in: postIds } }).sort({ createdAt: 1 });
  const repliesByPost = new Map<string, typeof replies>();
  replies.forEach(r => {
    const key = r.postId.toString();
    const arr = repliesByPost.get(key) || [];
    arr.push(r);
    repliesByPost.set(key, arr);
  });

  return Response.json({
    posts: posts.map(p => ({
      _id: p._id.toString(),
      authorId: p.authorId.toString(),
      authorName: p.authorName,
      type: p.type,
      body: p.body,
      praiseRecipientName: p.praiseRecipientName,
      likes: p.likes.map((id: Types.ObjectId) => id.toString()),
      likedByMe: p.likes.some((id: Types.ObjectId) => id.toString() === user.employeeId),
      replyCount: p.replyCount,
      createdAt: p.createdAt,
      replies: (repliesByPost.get(p._id.toString()) || []).map(r => ({
        _id: r._id.toString(),
        authorId: r.authorId.toString(),
        authorName: r.authorName,
        body: r.body,
        createdAt: r.createdAt,
      })),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent: _ua } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'conversation-post');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.login);
  if (!rateResult.allowed) {
    return Response.json({ error: 'Slow down. Try in a minute.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const validation = safeValidate(createSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    await connectDB();
    const employee = await Employee.findById(user.employeeId).select('name');
    if (!employee) return Response.json({ error: 'Not found.' }, { status: 404 });

    const post = await ConversationPost.create({
      authorId: employee._id,
      authorName: employee.name || user.email,
      type: data.type,
      body: data.body,
      praiseRecipientName: data.type === 'praise' ? data.praiseRecipientName : undefined,
    });

    // Serialize to match GET shape so subscribers can merge the delta without an extra fetch.
    const serialized = {
      _id: post._id.toString(),
      authorId: post.authorId.toString(),
      authorName: post.authorName,
      type: post.type,
      body: post.body,
      praiseRecipientName: post.praiseRecipientName,
      likes: [],
      likedByMe: false,
      replyCount: 0,
      createdAt: post.createdAt,
      replies: [],
    };
    publish(CHANNELS.conversations, 'post:new', serialized);

    return Response.json({ success: true, post }, { status: 201 });
  } catch (error) {
    logger.error('Conversation post error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
