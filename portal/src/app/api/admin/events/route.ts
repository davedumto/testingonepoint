import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import HubEvent from '@/models/HubEvent';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { publishHubChanged } from '@/lib/pusher/server';

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  category: z.enum(['birthday', 'holiday', 'event', 'work_anniversary', 'training']).default('event'),
  date: z.string().min(1),
  allDay: z.boolean().default(true),
  timeLabel: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')),
});

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const events = await HubEvent.find().sort({ date: 1 });
  return Response.json({ events });
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
    const event = await HubEvent.create({
      title: data.title,
      category: data.category,
      date: new Date(data.date),
      allDay: data.allDay,
      timeLabel: data.timeLabel || undefined,
      description: data.description || undefined,
      imageUrl: data.imageUrl || undefined,
      employeeId: data.employeeId || undefined,
      createdBy: admin.email,
    });

    auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success', details: { context: 'event_create', id: event._id.toString() } });

    publishHubChanged('events');
    return Response.json({ success: true, event }, { status: 201 });
  } catch (error) {
    logger.error('Event create error', { error: String(error) });
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
    const { id, date, timeLabel, description, imageUrl, employeeId, ...rest } = validation.data;

    await connectDB();
    const update: Record<string, unknown> = { ...rest };
    if (date !== undefined) update.date = new Date(date);
    if (timeLabel !== undefined) update.timeLabel = timeLabel || undefined;
    if (description !== undefined) update.description = description || undefined;
    if (imageUrl !== undefined) update.imageUrl = imageUrl || undefined;
    if (employeeId !== undefined) update.employeeId = employeeId || undefined;

    const event = await HubEvent.findByIdAndUpdate(id, update, { new: true });
    if (!event) return Response.json({ error: 'Not found.' }, { status: 404 });
    publishHubChanged('events');
    return Response.json({ success: true, event });
  } catch (error) {
    logger.error('Event update error', { error: String(error) });
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
  await HubEvent.findByIdAndDelete(id);
  publishHubChanged('events');
  return Response.json({ success: true });
}
