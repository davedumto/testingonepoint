import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import LeaderboardSeason from '@/models/LeaderboardSeason';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// GET — admin sees all seasons, newest first.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const seasons = await LeaderboardSeason.find({}).sort({ startedAt: -1 }).lean();
  return Response.json({
    seasons: seasons.map(s => ({
      _id: s._id.toString(),
      name: s.name,
      startedBy: s.startedBy,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      endedBy: s.endedBy,
    })),
  });
}

// POST — start a new season. Ends the active one first (if any) so there's
// always at most one open.
const startSchema = z.object({ name: z.string().min(1).max(120).trim() });

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  const body = await req.json();
  const validation = safeValidate(startSchema, body);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

  await connectDB();
  const now = new Date();

  await LeaderboardSeason.updateMany(
    { endedAt: { $exists: false } },
    { $set: { endedAt: now, endedBy: admin.email } },
  );

  const season = await LeaderboardSeason.create({
    name: validation.data.name,
    startedBy: admin.email,
    startedAt: now,
  });

  auditLog({
    userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent,
    action: AUDIT_ACTIONS.ADMIN_ACTION, status: 'success',
    details: { context: 'games_season_start', seasonId: season._id.toString() },
  });

  return Response.json({ season: {
    _id: season._id.toString(),
    name: season.name,
    startedBy: season.startedBy,
    startedAt: season.startedAt.toISOString(),
  } });
}
