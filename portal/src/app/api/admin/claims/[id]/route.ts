import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Claim, { type ClaimStatus } from '@/models/Claim';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { dispatchClientNotification } from '@/lib/client-notifications';
import { logger } from '@/lib/logger';

const CLAIM_STATUS_LABEL: Record<string, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  closed: 'Closed',
};

// PATCH /api/admin/claims/[id] — admin can transition claim status, set the
// carrier claim number, and assign adjuster contact info. Each update appends
// a timeline entry so the client's tracker shows the history.
//
// Status spec compliance: per §D6 we never expose "approved" as a status
// value. "Closed" covers both settled and denied outcomes.
const patchSchema = z.object({
  status: z.enum(['reported', 'under_review', 'in_progress', 'closed']).optional(),
  note: z.string().max(2000).optional(),
  carrierClaimNumber: z.string().max(100).optional(),
  adjusterName: z.string().max(150).optional().or(z.literal('')),
  adjusterPhone: z.string().max(40).optional().or(z.literal('')),
  adjusterEmail: z.string().email().max(255).optional().or(z.literal('')),
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
    const data = validation.data;

    await connectDB();

    const claim = await Claim.findById(id);
    if (!claim) return Response.json({ error: 'Claim not found.' }, { status: 404 });

    const now = new Date();
    const changedFields: string[] = [];

    if (data.carrierClaimNumber !== undefined && claim.carrierClaimNumber !== data.carrierClaimNumber) {
      claim.carrierClaimNumber = data.carrierClaimNumber;
      changedFields.push('carrierClaimNumber');
    }
    if (data.adjusterName !== undefined) { claim.adjusterName = data.adjusterName || undefined; changedFields.push('adjusterName'); }
    if (data.adjusterPhone !== undefined) { claim.adjusterPhone = data.adjusterPhone || undefined; changedFields.push('adjusterPhone'); }
    if (data.adjusterEmail !== undefined) { claim.adjusterEmail = data.adjusterEmail || undefined; changedFields.push('adjusterEmail'); }

    // Status change -> append timeline entry (§D6 compliance: note uses
    // neutral language, never "approved")
    if (data.status && data.status !== claim.status) {
      const prev = claim.status;
      claim.status = data.status as ClaimStatus;
      claim.timeline.push({
        status: data.status,
        note: data.note || `Status changed by ${admin.name}`,
        setBy: 'admin',
        at: now,
      });
      if (data.status === 'closed') claim.closedAt = now;
      changedFields.push(`status:${prev}→${data.status}`);
    } else if (data.note) {
      // Note without status change still gets a timeline entry so clients
      // see the admin update activity.
      claim.timeline.push({
        status: claim.status,
        note: data.note,
        setBy: 'admin',
        at: now,
      });
    }

    if (changedFields.length === 0 && !data.note) {
      return Response.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    await claim.save();

    // Notify the client on material changes. Adjuster assignment is worth a
    // specific notification — they'll want that contact info.
    const statusChange = changedFields.find(f => f.startsWith('status:'));
    const adjusterChange = changedFields.includes('adjusterName') || changedFields.includes('adjusterPhone') || changedFields.includes('adjusterEmail');

    if (statusChange || adjusterChange) {
      await dispatchClientNotification({
        userId: claim.userId,
        type: 'claim_update',
        title: statusChange
          ? `Claim status: ${CLAIM_STATUS_LABEL[claim.status]}`
          : 'Adjuster assigned to your claim',
        body: data.note || (adjusterChange && claim.adjusterName ? `Contact: ${claim.adjusterName}` : undefined),
        link: `/dashboard/claims/${id}`,
        priority: 'normal',
        actorName: admin.name,
      });
    } else if (data.note) {
      await dispatchClientNotification({
        userId: claim.userId,
        type: 'claim_update',
        title: 'New update on your claim',
        body: data.note.slice(0, 200),
        link: `/dashboard/claims/${id}`,
        actorName: admin.name,
      });
    }

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      severity: 'warning', // claim edits are legally significant
      details: { context: 'admin_claim_update', claimId: id, changed: changedFields },
    });

    return Response.json({ success: true, status: claim.status });
  } catch (error) {
    logger.error('Admin claim update error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
