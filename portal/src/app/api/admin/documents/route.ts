import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import DocumentLink from '@/models/DocumentLink';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { publishHubChanged } from '@/lib/pusher/server';

const createSchema = z.object({
  name: z.string().min(1).max(250).trim(),
  url: z.string().url().max(2000),
  category: z.enum(['marketing', 'training', 'compliance', 'forms', 'quotes', 'resources', 'other']).default('other'),
  description: z.string().max(500).optional().or(z.literal('')),
});

const updateSchema = createSchema.partial().extend({ id: z.string().min(1) });

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const documents = await DocumentLink.find().sort({ postedAt: -1 });
  return Response.json({ documents });
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
    const doc = await DocumentLink.create({
      name: data.name,
      url: data.url,
      category: data.category,
      description: data.description || undefined,
      postedBy: admin.email,
    });

    auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success', details: { context: 'document_create', id: doc._id.toString() } });

    publishHubChanged('documents');
    return Response.json({ success: true, document: doc }, { status: 201 });
  } catch (error) {
    logger.error('Document create error', { error: String(error) });
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
    const { id, description, ...rest } = validation.data;

    await connectDB();
    const update: Record<string, unknown> = { ...rest };
    if (description !== undefined) update.description = description || undefined;

    const doc = await DocumentLink.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return Response.json({ error: 'Not found.' }, { status: 404 });
    publishHubChanged('documents');
    return Response.json({ success: true, document: doc });
  } catch (error) {
    logger.error('Document update error', { error: String(error) });
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
  await DocumentLink.findByIdAndDelete(id);
  publishHubChanged('documents');
  return Response.json({ success: true });
}
