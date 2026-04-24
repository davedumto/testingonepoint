import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Policy from '@/models/Policy';
import User from '@/models/User';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// POST /api/admin/policies — admin creates a policy for a client. Needed for
// manual entry when CSV import / GHL webhook doesn't cover a case.
// Tier recomputes automatically via the Policy post-save hook.

const createSchema = z.object({
  userId: z.string(),
  productName: z.string().min(1).max(200).trim(),
  productCategory: z.enum(['auto', 'home', 'health', 'life', 'disability', 'business']),
  carrier: z.string().min(1).max(200).trim(),
  policyNumber: z.string().min(1).max(100).trim(),
  status: z.enum(['active', 'pending', 'expired', 'cancelled', 'reinstatement_needed']).optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  premium: z.number().nonnegative().optional(),
  billingType: z.enum(['carrier_direct', 'agency_billed', 'unknown']).optional(),
  nextDraftDate: z.string().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(createSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    if (!mongoose.isValidObjectId(data.userId)) return Response.json({ error: 'Invalid client id.' }, { status: 400 });

    await connectDB();

    const client = await User.findOne({ _id: data.userId, role: 'client' }).select('_id email');
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });

    const policy = await Policy.create({
      userId: client._id,
      userEmail: client.email,
      productName: data.productName,
      productCategory: data.productCategory,
      carrier: data.carrier,
      policyNumber: data.policyNumber,
      status: data.status || 'active',
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      premium: data.premium,
      billingType: data.billingType || 'unknown',
      nextDraftDate: data.nextDraftDate ? new Date(data.nextDraftDate) : undefined,
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'admin_policy_create', clientId: client._id.toString(), policyId: policy._id.toString(), productCategory: data.productCategory },
    });

    return Response.json({ success: true, policyId: policy._id.toString() }, { status: 201 });
  } catch (error) {
    logger.error('Admin policy create error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
