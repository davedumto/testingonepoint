import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Claim from '@/models/Claim';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// GET /api/admin/claims — global claims triage. Joins client names so the
// UI can show who filed each claim without a second round-trip.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  try {
    await connectDB();

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    else query.status = { $ne: 'closed' }; // default: open claims

    const claims = await Claim.find(query).sort({ createdAt: -1 }).limit(200);

    const userIds = [...new Set(claims.map(c => c.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    return Response.json({
      claims: claims.map(c => {
        const client = userMap.get(c.userId.toString());
        return {
          _id: c._id.toString(),
          userId: c.userId.toString(),
          clientName: client?.name || 'Unknown',
          clientEmail: client?.email || '',
          policyId: c.policyId.toString(),
          carrierClaimNumber: c.carrierClaimNumber,
          incidentType: c.incidentType,
          dateOfLoss: c.dateOfLoss,
          description: c.description,
          status: c.status,
          adjusterName: c.adjusterName,
          adjusterPhone: c.adjusterPhone,
          adjusterEmail: c.adjusterEmail,
          createdAt: c.createdAt,
        };
      }),
    });
  } catch (error) {
    logger.error('Admin claims list error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
