import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import LeaderboardSeason from '@/models/LeaderboardSeason';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// POST — ends the named season (freezes the leaderboard). Used when admin
// wants to lock in winners without immediately starting another cycle.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

  await connectDB();
  const season = await LeaderboardSeason.findById(id);
  if (!season) return Response.json({ error: 'Season not found.' }, { status: 404 });
  if (season.endedAt) return Response.json({ error: 'Season already ended.' }, { status: 409 });

  season.endedAt = new Date();
  season.endedBy = admin.email;
  await season.save();

  auditLog({
    userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent,
    action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success',
    details: { context: 'games_season_end', seasonId: id },
  });

  return Response.json({ success: true });
}
