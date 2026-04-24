import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientMessage from '@/models/ClientMessage';
import User from '@/models/User';
import { publish } from '@/lib/pusher/server';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// Per-client private channel — same naming convention as the employee
// notification channels so the Pusher auth route handles both.
function clientChannel(userId: string) { return `private-user-${userId}`; }

const sendSchema = z.object({
  body: z.string().min(1).max(5000).trim(),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    cloudinaryPublicId: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
  })).max(5).optional(),
});

// GET /api/messages — caller's full message stream
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const messages = await ClientMessage.find({ userId: user.userId }).sort({ createdAt: 1 }).limit(500);

  return Response.json({
    messages: messages.map(m => ({
      _id: m._id.toString(),
      senderType: m.senderType,
      senderName: m.senderName,
      body: m.body,
      attachments: m.attachments,
      readByClient: m.readByClient,
      createdAt: m.createdAt,
    })),
  });
}

// POST /api/messages — client sends a message to the agency
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'client-message');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.api);
  if (!rateResult.allowed) return Response.json({ error: 'Slow down.' }, { status: 429 });

  try {
    const body = await req.json();
    const validation = safeValidate(sendSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    await connectDB();

    const dbUser = await User.findById(user.userId).select('name firstName lastName');
    const senderName = dbUser?.firstName && dbUser?.lastName
      ? `${dbUser.firstName} ${dbUser.lastName}`
      : dbUser?.name || user.email;

    const msg = await ClientMessage.create({
      userId: user.userId,
      senderType: 'client',
      senderId: new mongoose.Types.ObjectId(user.userId),
      senderName,
      body: validation.data.body,
      attachments: validation.data.attachments || [],
      readByClient: true,   // the client is writing it, so it's already "seen" on their side
      readByAgent: false,
    });

    // Live fan-out so an open agent dashboard can pick it up without polling.
    publish(clientChannel(user.userId), 'message:new', {
      _id: msg._id.toString(),
      senderType: msg.senderType,
      senderName: msg.senderName,
      body: msg.body,
      attachments: msg.attachments,
      createdAt: msg.createdAt,
    });

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'client_message_sent', messageId: msg._id.toString() },
    });

    return Response.json({
      success: true,
      message: {
        _id: msg._id.toString(),
        senderType: msg.senderType,
        senderName: msg.senderName,
        body: msg.body,
        attachments: msg.attachments,
        readByClient: msg.readByClient,
        createdAt: msg.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Client message send error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
