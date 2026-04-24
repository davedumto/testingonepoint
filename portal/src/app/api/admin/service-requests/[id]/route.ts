import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ServiceRequest, { type ServiceRequestStatus } from '@/models/ServiceRequest';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { dispatchClientNotification } from '@/lib/client-notifications';
import { logger } from '@/lib/logger';

// Client-friendly status labels for notifications.
const SR_STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  in_progress: 'In Progress',
  waiting_on_client: 'Waiting on You',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// PATCH /api/admin/service-requests/[id] — admin/ops updates status or adds
// an internal reply. Any status transition is timestamped on the SR so the
// dashboard SLA widgets can render response times without extra joins.
const patchSchema = z.object({
  status: z.enum(['submitted', 'in_progress', 'waiting_on_client', 'completed', 'cancelled']).optional(),
  comment: z.string().min(1).max(5000).trim().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    const body = await req.json();
    const validation = safeValidate(patchSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { status, comment } = validation.data;

    if (!status && !comment) {
      return Response.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    await connectDB();

    const sr = await ServiceRequest.findById(id);
    if (!sr) return Response.json({ error: 'Request not found.' }, { status: 404 });

    const now = new Date();

    if (comment) {
      // First agent touch — record firstResponseAt for SLA reporting.
      if (!sr.firstResponseAt) sr.firstResponseAt = now;
      sr.comments.push({
        authorId: new mongoose.Types.ObjectId(admin.userId),
        authorName: admin.name,
        authorType: 'admin',
        body: comment,
        createdAt: now,
      });
    }

    const statusChanged = status && status !== sr.status;
    if (statusChanged) {
      const prev = sr.status;
      sr.status = status as ServiceRequestStatus;
      if (status === 'in_progress' && !sr.firstResponseAt) sr.firstResponseAt = now;
      if (status === 'completed') sr.completedAt = now;
      if (status === 'cancelled') sr.cancelledAt = now;

      auditLog({
        userId: admin.userId,
        userEmail: admin.email,
        ipAddress: ip,
        userAgent,
        action: AUDIT_ACTIONS.DATA_ACCESS,
        status: 'success',
        details: { context: 'sr_status_change', requestId: id, from: prev, to: status },
      });
    }

    await sr.save();

    // Notify the client on status changes or new comments. "waiting_on_client"
    // is elevated to high priority so the bell badge is more visible — the
    // client's reply is actively blocking progress.
    if (statusChanged) {
      await dispatchClientNotification({
        userId: sr.userId,
        type: 'sr_update',
        title: `Service request: ${SR_STATUS_LABEL[status as string] || status}`,
        body: `Your ${sr.type.replace(/_/g, ' ')} request${status === 'waiting_on_client' ? ' — we need info from you' : ''}`,
        link: `/dashboard/service-requests/${id}`,
        priority: status === 'waiting_on_client' ? 'high' : 'normal',
        actorName: admin.name,
      });
    } else if (comment) {
      await dispatchClientNotification({
        userId: sr.userId,
        type: 'sr_update',
        title: 'New update on your service request',
        body: comment.slice(0, 200),
        link: `/dashboard/service-requests/${id}`,
        actorName: admin.name,
      });
    }

    return Response.json({ success: true, status: sr.status });
  } catch (error) {
    logger.error('Admin SR update error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
