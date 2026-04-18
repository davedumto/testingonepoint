import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';
import OAuthEvent from '@/models/EmployeeAuth';
import { auditLog } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';

// GET — admin views all employee sessions with security flags
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const rateResult = await checkRateLimit(getRateLimitKey(ip, 'admin-time'), RATE_LIMITS.adminList);
  if (!rateResult.allowed) return Response.json({ error: 'Too many requests.' }, { status: 429 });

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

  auditLog({ userId: 'admin', userEmail: admin.email, ipAddress: ip, userAgent, action: 'admin.data_viewed', status: 'success', targetResource: 'time_sessions', details: { filter, days, resultCount: totalSessions } });

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
