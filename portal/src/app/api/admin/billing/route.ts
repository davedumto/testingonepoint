import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import BillingRecord from '@/models/BillingRecord';
import Policy from '@/models/Policy';
import User from '@/models/User';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// POST /api/admin/billing — admin creates a billing record manually. Used when
// carrier feeds aren't wired up yet or when reconciling a one-off charge.

const createSchema = z.object({
  userId: z.string(),
  policyId: z.string(),
  type: z.enum(['invoice', 'payment', 'statement']),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
  dueDate: z.string(),
  paidDate: z.string().optional().or(z.literal('')),
  status: z.enum(['paid', 'pending', 'missed', 'scheduled', 'refunded']),
  billedBy: z.enum(['carrier', 'agency']),
  carrierName: z.string().max(200).optional().or(z.literal('')),
  carrierPortalUrl: z.string().url().max(500).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
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
    if (!mongoose.isValidObjectId(data.policyId)) return Response.json({ error: 'Invalid policy id.' }, { status: 400 });

    const dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime())) return Response.json({ error: 'Invalid due date.' }, { status: 400 });

    await connectDB();

    // Always verify the policy belongs to the target client — never let
    // admin accidentally attach a billing record to the wrong policy.
    const [client, policy] = await Promise.all([
      User.findOne({ _id: data.userId, role: 'client' }).select('_id email'),
      Policy.findOne({ _id: data.policyId, userId: data.userId }).select('_id carrier'),
    ]);
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });
    if (!policy) return Response.json({ error: 'Policy not found for this client.' }, { status: 404 });

    const record = await BillingRecord.create({
      userId: client._id,
      userEmail: client.email,
      policyId: policy._id,
      type: data.type,
      amount: data.amount,
      currency: data.currency || 'USD',
      dueDate,
      paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
      status: data.status,
      billedBy: data.billedBy,
      // Carrier name defaults to policy.carrier when billedBy=carrier and admin
      // didn't explicitly set one, so the clarity label renders correctly.
      carrierName: data.carrierName || (data.billedBy === 'carrier' ? policy.carrier : undefined),
      carrierPortalUrl: data.carrierPortalUrl || undefined,
      description: data.description || undefined,
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'admin_billing_create', recordId: record._id.toString(), clientId: client._id.toString(), amount: data.amount, status: data.status },
    });

    return Response.json({ success: true, recordId: record._id.toString() }, { status: 201 });
  } catch (error) {
    logger.error('Admin billing create error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
