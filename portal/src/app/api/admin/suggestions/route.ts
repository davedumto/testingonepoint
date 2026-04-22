import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Suggestion from '@/models/Suggestion';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['new', 'reviewing', 'actioned', 'declined']).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  await connectDB();
  const query = status ? { status } : {};
  const suggestions = await Suggestion.find(query).sort({ createdAt: -1 });

  const counts = await Suggestion.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus: Record<string, number> = { new: 0, reviewing: 0, actioned: 0, declined: 0 };
  counts.forEach(c => { byStatus[c._id] = c.count; });

  return Response.json({ suggestions, counts: byStatus });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(updateSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { id, status, adminNotes } = validation.data;

    await connectDB();
    const update: Record<string, unknown> = { reviewedAt: new Date(), reviewedBy: admin.email };
    if (status !== undefined) update.status = status;
    if (adminNotes !== undefined) update.adminNotes = adminNotes;

    const suggestion = await Suggestion.findByIdAndUpdate(id, update, { new: true });
    if (!suggestion) return Response.json({ error: 'Not found.' }, { status: 404 });

    auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success', details: { context: 'suggestion_review', id, newStatus: status } });

    return Response.json({ success: true, suggestion });
  } catch (error) {
    logger.error('Suggestion update error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
