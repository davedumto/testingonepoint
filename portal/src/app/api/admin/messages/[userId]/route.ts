import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ClientMessage from '@/models/ClientMessage';
import User from '@/models/User';
import { publish } from '@/lib/pusher/server';
import { dispatchClientNotification } from '@/lib/client-notifications';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

function clientChannel(userId: string) { return `private-user-${userId}`; }

// POST /api/admin/messages/[userId] — admin / agent sends a message into a
// specific client's inbox. Also fires an `agent_message` notification so the
// client sees the red badge on the bell even if they're not on the inbox tab.
const schema = z.object({
  body: z.string().min(1).max(5000).trim(),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    cloudinaryPublicId: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
  })).max(5).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { userId } = await params;
    if (!mongoose.isValidObjectId(userId)) return Response.json({ error: 'Invalid client id.' }, { status: 400 });

    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    await connectDB();

    // Confirm the target is a client — don't let admins scribble into
    // employee/admin records by typo'ing a userId.
    const client = await User.findOne({ _id: userId, role: 'client' }).select('_id firstName name');
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });

    const msg = await ClientMessage.create({
      userId: client._id,
      senderType: 'admin',
      senderId: new mongoose.Types.ObjectId(admin.userId),
      senderName: admin.name || 'OnePoint',
      body: validation.data.body,
      attachments: validation.data.attachments || [],
      readByClient: false,   // client hasn't seen it yet — drives the bell badge
      readByAgent: true,     // the agent just wrote it
    });

    // Live push — the client's inbox page will merge this if open.
    publish(clientChannel(client._id.toString()), 'message:new', {
      _id: msg._id.toString(),
      senderType: msg.senderType,
      senderName: msg.senderName,
      body: msg.body,
      attachments: msg.attachments,
      readByClient: false,
      createdAt: msg.createdAt,
    });

    // Bell notification so the client sees it even when they're not on /messages
    await dispatchClientNotification({
      userId: client._id,
      type: 'agent_message',
      title: `${admin.name || 'OnePoint'} sent you a message`,
      body: msg.body.slice(0, 200),
      link: '/dashboard/messages',
      actorName: admin.name,
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'admin_message_sent', clientId: client._id.toString(), messageId: msg._id.toString() },
    });

    return Response.json({
      success: true,
      message: {
        _id: msg._id.toString(),
        senderType: msg.senderType,
        senderName: msg.senderName,
        body: msg.body,
        attachments: msg.attachments,
        createdAt: msg.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Admin message send error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
