import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';
import OAuthEvent from '@/models/EmployeeAuth';

// GET — admin views all employee sessions with security flags
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter'); // 'flagged', 'active', 'all'
  const days = parseInt(searchParams.get('days') || '7');

  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const query: Record<string, unknown> = { loginAt: { $gte: since } };
  if (filter === 'flagged') query.flagged = true;
  if (filter === 'active') query.logoutType = 'active';

  const sessions = await TimeSession.find(query).sort({ loginAt: -1 }).limit(200);

  // Get failed auth attempts
  const failedAuths = await OAuthEvent.find({
    status: 'failed',
    authenticatedAt: { $gte: since },
  }).sort({ authenticatedAt: -1 }).limit(50);

  // Aggregate stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.logoutType === 'active').length;
  const flaggedSessions = sessions.filter(s => s.flagged).length;
  const avgDuration = sessions.filter(s => s.duration).reduce((sum, s) => sum + (s.duration || 0), 0) / Math.max(sessions.filter(s => s.duration).length, 1);

  return Response.json({
    sessions,
    failedAuths,
    stats: {
      totalSessions,
      activeSessions,
      flaggedSessions,
      failedAuthAttempts: failedAuths.length,
      avgDurationMinutes: Math.round(avgDuration),
    },
  });
}
