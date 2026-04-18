import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';
import { calculateDuration } from '@/lib/shift-config';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';

// POST — employee clocks out (or auto-logout triggers this)
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const rateResult = await checkRateLimit(getRateLimitKey(ip, 'clock-out'), RATE_LIMITS.clockInOut);
  if (!rateResult.allowed) return Response.json({ error: 'Too many requests.' }, { status: 429 });
  const { logoutType } = await req.json().catch(() => ({ logoutType: 'manual' }));

  await connectDB();

  const activeSession = await TimeSession.findOne({
    userId: user.userId,
    logoutType: 'active',
  });

  if (!activeSession) {
    return Response.json({ error: 'No active session found.' }, { status: 404 });
  }

  const now = new Date();
  const duration = calculateDuration(activeSession.loginAt, now);

  activeSession.logoutAt = now;
  activeSession.duration = duration;
  activeSession.logoutType = logoutType || 'manual';
  await activeSession.save();

  auditLog({ userId: user.userId, userEmail: user.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.CLOCK_OUT, status: 'success', details: { duration, logoutType: activeSession.logoutType } });

  return Response.json({
    success: true,
    session: {
      _id: activeSession._id,
      loginAt: activeSession.loginAt,
      logoutAt: activeSession.logoutAt,
      duration,
      logoutType: activeSession.logoutType,
    },
  });
}
