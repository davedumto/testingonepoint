import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Claim, { type IncidentType } from '@/models/Claim';
import Policy from '@/models/Policy';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

const INCIDENT_TYPES: IncidentType[] = [
  'auto_accident', 'auto_theft', 'property_damage', 'water_damage',
  'fire', 'theft_burglary', 'liability', 'medical', 'business_interruption', 'other',
];

// FNOL (First Notice of Loss) schema. `disclaimerAccepted` is required — the
// client must have clicked through the legal disclaimer for us to record it.
const createSchema = z.object({
  policyId: z.string(),
  incidentType: z.enum(INCIDENT_TYPES as [IncidentType, ...IncidentType[]]),
  dateOfLoss: z.string(),
  description: z.string().min(10).max(5000).trim(),
  locationOfLoss: z.string().max(300).optional().or(z.literal('')),
  disclaimerAccepted: z.literal(true),
  attachments: z.array(z.object({
    name: z.string().max(255),
    url: z.string().url(),
    cloudinaryPublicId: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().optional(),
  })).max(20).optional(),
});

// GET /api/claims — caller's claims list
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const claims = await Claim.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(100);

  return Response.json({
    claims: claims.map(c => ({
      _id: c._id.toString(),
      policyId: c.policyId.toString(),
      carrierClaimNumber: c.carrierClaimNumber,
      incidentType: c.incidentType,
      dateOfLoss: c.dateOfLoss,
      status: c.status,
      description: c.description,
      attachmentCount: c.attachments?.length || 0,
      createdAt: c.createdAt,
      closedAt: c.closedAt,
    })),
  });
}

// POST /api/claims — file a new FNOL. Requires explicit disclaimer acceptance.
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'claim-create');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
  if (!rateResult.allowed) return Response.json({ error: 'Too many submissions. Try again later.' }, { status: 429 });

  try {
    const body = await req.json();
    const validation = safeValidate(createSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    if (!mongoose.isValidObjectId(data.policyId)) return Response.json({ error: 'Invalid policy id.' }, { status: 400 });

    await connectDB();

    const policy = await Policy.findOne({ _id: data.policyId, userId: user.userId });
    if (!policy) return Response.json({ error: 'Policy not found.' }, { status: 404 });

    const dol = new Date(data.dateOfLoss);
    if (Number.isNaN(dol.getTime())) return Response.json({ error: 'Invalid date of loss.' }, { status: 400 });
    // Sanity check: date of loss can't be in the future.
    if (dol.getTime() > Date.now() + 60_000) return Response.json({ error: 'Date of loss cannot be in the future.' }, { status: 400 });

    const now = new Date();
    const claim = await Claim.create({
      userId: user.userId,
      userEmail: user.email,
      policyId: policy._id,
      incidentType: data.incidentType,
      dateOfLoss: dol,
      description: data.description,
      locationOfLoss: data.locationOfLoss || undefined,
      attachments: (data.attachments || []).map(a => ({ ...a, uploadedAt: now })),
      status: 'reported',
      timeline: [{ status: 'reported', setBy: 'client', at: now, note: 'Client filed First Notice of Loss.' }],
      disclaimerAcceptedAt: now,
    });

    // Higher severity than a normal audit line — claims are legally significant.
    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      severity: 'warning',
      details: {
        context: 'claim_fnol_submitted',
        claimId: claim._id.toString(),
        policyId: policy._id.toString(),
        incidentType: data.incidentType,
        dateOfLoss: dol.toISOString(),
      },
    });

    return Response.json({ success: true, claimId: claim._id.toString() }, { status: 201 });
  } catch (error) {
    logger.error('Claim create error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
