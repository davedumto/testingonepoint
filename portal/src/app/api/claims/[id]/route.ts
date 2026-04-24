import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Claim from '@/models/Claim';
import { logger } from '@/lib/logger';

// GET /api/claims/[id] — detail view with full timeline + attachments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    const claim = await Claim.findOne({ _id: id, userId: user.userId });
    if (!claim) return Response.json({ error: 'Claim not found.' }, { status: 404 });

    return Response.json({
      claim: {
        _id: claim._id.toString(),
        policyId: claim.policyId.toString(),
        carrierClaimNumber: claim.carrierClaimNumber,
        incidentType: claim.incidentType,
        dateOfLoss: claim.dateOfLoss,
        description: claim.description,
        locationOfLoss: claim.locationOfLoss,
        attachments: claim.attachments,
        status: claim.status,
        timeline: claim.timeline,
        adjusterName: claim.adjusterName,
        adjusterPhone: claim.adjusterPhone,
        adjusterEmail: claim.adjusterEmail,
        disclaimerAcceptedAt: claim.disclaimerAcceptedAt,
        createdAt: claim.createdAt,
        closedAt: claim.closedAt,
      },
    });
  } catch (error) {
    logger.error('Claim detail error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
