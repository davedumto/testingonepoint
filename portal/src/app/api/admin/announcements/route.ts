import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Announcement from '@/models/Announcement';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { publishHubChanged } from '@/lib/pusher/server';

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(5000),
  category: z.enum(['update', 'birthday', 'general', 'holiday', 'news']).default('general'),
  pinned: z.boolean().default(false),
  imageUrl: z.string().url().optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
});

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const announcements = await Announcement.find().sort({ pinned: -1, postedAt: -1 });
  return Response.json({ announcements });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(createSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    await connectDB();
    const announcement = await Announcement.create({
      title: data.title,
      body: data.body,
      category: data.category,
      pinned: data.pinned,
      imageUrl: data.imageUrl || undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      postedBy: admin.email,
    });

    auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success', details: { context: 'announcement_create', id: announcement._id.toString() } });

    publishHubChanged('announcements');
    return Response.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    logger.error('Announcement create error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validation = safeValidate(updateSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { id, expiresAt, imageUrl, ...rest } = validation.data;

    await connectDB();
    const update: Record<string, unknown> = { ...rest };
    if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (imageUrl !== undefined) update.imageUrl = imageUrl || undefined;

    const announcement = await Announcement.findByIdAndUpdate(id, update, { new: true });
    if (!announcement) return Response.json({ error: 'Not found.' }, { status: 404 });
    publishHubChanged('announcements');
    return Response.json({ success: true, announcement });
  } catch (error) {
    logger.error('Announcement update error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  await connectDB();
  await Announcement.findByIdAndDelete(id);
  publishHubChanged('announcements');
  return Response.json({ success: true });
}
