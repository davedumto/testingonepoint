import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import TeamMeeting from '@/models/TeamMeeting';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { publishHubChanged } from '@/lib/pusher/server';

const createSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  group: z.enum(['general', 'quoting', 'sales', 'digital', 'training', 'other']).default('general'),
  teamsUrl: z.string().url().max(2000),
  scheduleLabel: z.string().min(1).max(200),
  description: z.string().max(500).optional().or(z.literal('')),
  host: z.string().max(100).optional().or(z.literal('')),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const meetings = await TeamMeeting.find().sort({ active: -1, order: 1, createdAt: 1 });
  return Response.json({ meetings });
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
    const meeting = await TeamMeeting.create({
      name: data.name,
      group: data.group,
      teamsUrl: data.teamsUrl,
      scheduleLabel: data.scheduleLabel,
      description: data.description || undefined,
      host: data.host || undefined,
      order: data.order,
      active: data.active,
    });

    auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success', details: { context: 'meeting_create', id: meeting._id.toString() } });

    publishHubChanged('meetings');
    return Response.json({ success: true, meeting }, { status: 201 });
  } catch (error) {
    logger.error('Meeting create error', { error: String(error) });
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
    const { id, description, host, ...rest } = validation.data;

    await connectDB();
    const update: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (description !== undefined) update.description = description || undefined;
    if (host !== undefined) update.host = host || undefined;

    const meeting = await TeamMeeting.findByIdAndUpdate(id, update, { new: true });
    if (!meeting) return Response.json({ error: 'Not found.' }, { status: 404 });
    publishHubChanged('meetings');
    return Response.json({ success: true, meeting });
  } catch (error) {
    logger.error('Meeting update error', { error: String(error) });
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
  await TeamMeeting.findByIdAndDelete(id);
  publishHubChanged('meetings');
  return Response.json({ success: true });
}
