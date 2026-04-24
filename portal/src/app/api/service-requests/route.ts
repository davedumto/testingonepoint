import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ServiceRequest, { type ServiceRequestType, type Urgency } from '@/models/ServiceRequest';
import Policy from '@/models/Policy';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

const TYPES: ServiceRequestType[] = [
  'policy_change', 'add_vehicle', 'remove_driver', 'address_update',
  'certificate_request', 'billing_issue', 'cancellation_request',
];
const URGENCIES: Urgency[] = ['low', 'normal', 'high', 'urgent'];

const createSchema = z.object({
  type: z.enum(TYPES as [ServiceRequestType, ...ServiceRequestType[]]),
  description: z.string().min(10, 'Please describe your request in at least a sentence.').max(5000).trim(),
  urgency: z.enum(URGENCIES as [Urgency, ...Urgency[]]).optional(),
  policyId: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    cloudinaryPublicId: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
  })).max(10).optional(),
});

// GET /api/service-requests — caller's own requests with optional status filter
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  await connectDB();

  const query: Record<string, unknown> = { userId: user.userId };
  if (status) query.status = status;

  const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).limit(100);

  return Response.json({
    requests: requests.map(r => ({
      _id: r._id.toString(),
      type: r.type,
      description: r.description,
      urgency: r.urgency,
      status: r.status,
      policyId: r.policyId?.toString(),
      assignedTo: r.assignedTo,
      attachmentCount: r.attachments?.length || 0,
      commentCount: r.comments?.length || 0,
      submittedAt: r.submittedAt,
      firstResponseAt: r.firstResponseAt,
      completedAt: r.completedAt,
    })),
  });
}

// POST /api/service-requests — client files a new request
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  // Rate limit: same ceiling as password reset so an attacker can't spam
  // Marcel's queue from one IP. Genuine clients will never hit this.
  const rateKey = getRateLimitKey(ip, 'service-request-create');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
  if (!rateResult.allowed) {
    return Response.json({ error: 'You&apos;ve submitted many requests recently. Try again shortly.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const validation = safeValidate(createSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    await connectDB();

    // If a policyId is supplied, confirm it belongs to the caller before
    // linking — never trust a client-supplied object id.
    let policyId: mongoose.Types.ObjectId | undefined;
    if (data.policyId) {
      if (!mongoose.isValidObjectId(data.policyId)) return Response.json({ error: 'Invalid policy id.' }, { status: 400 });
      const policy = await Policy.findOne({ _id: data.policyId, userId: user.userId });
      if (!policy) return Response.json({ error: 'Policy not found.' }, { status: 404 });
      policyId = policy._id;
    }

    const request = await ServiceRequest.create({
      userId: user.userId,
      userEmail: user.email,
      policyId,
      type: data.type,
      description: data.description,
      urgency: data.urgency || 'normal',
      attachments: (data.attachments || []).map(a => ({ ...a, uploadedAt: new Date() })),
      status: 'submitted',
      submittedAt: new Date(),
    });

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'service_request_submitted', requestId: request._id.toString(), type: data.type, urgency: data.urgency || 'normal' },
    });

    return Response.json({ success: true, requestId: request._id.toString() }, { status: 201 });
  } catch (error) {
    logger.error('Service request create error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
