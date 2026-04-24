import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Policy from '@/models/Policy';
import ClientDocument from '@/models/ClientDocument';
import { logger } from '@/lib/logger';

// GET /api/policies/[id] — the per-policy mini-dashboard (§4 of the spec)
// Returns the policy itself + the docs linked to it, so the detail page
// can render everything in one round-trip.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid policy id.' }, { status: 400 });

    await connectDB();

    const policy = await Policy.findOne({ _id: id, userId: user.userId });
    if (!policy) return Response.json({ error: 'Policy not found.' }, { status: 404 });

    // Pull all non-archived documents linked to this policy. Grouped in the
    // UI by kind (ID cards / DEC / endorsements / renewals).
    const docs = await ClientDocument.find({
      userId: user.userId,
      policyId: policy._id,
      deletedAt: { $exists: false },
    }).sort({ isPinned: -1, createdAt: -1 });

    // Map -> plain object for serialization (preserves getters). Mongoose's
    // default toJSON unwraps the Map field as an object, which is what we want.
    const policyJson = policy.toJSON() as Record<string, unknown>;

    return Response.json({
      policy: policyJson,
      documents: docs.map(d => ({
        _id: d._id.toString(),
        kind: d.kind,
        name: d.name,
        url: d.url,
        mimeType: d.mimeType,
        isPinned: d.isPinned,
        uploadedAt: d.uploadedAt,
        status: d.status,
      })),
    });
  } catch (error) {
    logger.error('Policy detail error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
