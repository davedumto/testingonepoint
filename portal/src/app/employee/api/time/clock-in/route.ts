import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';
import Employee from '@/models/Employee';
import { checkSecurityFlags, getMinutesUntilShiftEnd } from '@/lib/shift-config';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { DEFAULT_TIMEZONE } from '@/lib/timezones';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { getRequestInfo } from '@/lib/security/request-info';

// POST — employee clocks in
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip: reqIp } = getRequestInfo(req);
  const rateResult = await checkRateLimit(getRateLimitKey(reqIp, 'clock-in'), RATE_LIMITS.clockInOut);
  if (!rateResult.allowed) return Response.json({ error: 'Too many requests.' }, { status: 429 });

  await connectDB();

  // Load employee timezone
  const employee = await Employee.findById(user.employeeId).select('timezone');
  const timezone = employee?.timezone || DEFAULT_TIMEZONE;

  // Check if already clocked in
  const activeSession = await TimeSession.findOne({
    userId: user.userId,
    logoutType: 'active',
  });

  if (activeSession) {
    return Response.json({
      error: 'Already clocked in.',
      session: { loginAt: activeSession.loginAt, _id: activeSession._id },
    }, { status: 409 });
  }

  const now = new Date();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';

  // Check for security flags using employee timezone
  const flags = checkSecurityFlags(now, timezone);

  const session = await TimeSession.create({
    userId: user.userId,
    userEmail: user.email,
    userName: user.name,
    loginAt: now,
    logoutType: 'active',
    ipAddress: ip,
    userAgent: ua,
    flagged: flags.flagged,
    flagReason: flags.reason,
  });

  auditLog({ userId: user.userId, userEmail: user.email, ipAddress: ip, userAgent: ua, action: AUDIT_ACTIONS.CLOCK_IN, status: 'success', details: { flagged: flags.flagged, flagReason: flags.reason, timezone } });

  const minutesLeft = getMinutesUntilShiftEnd(timezone);

  return Response.json({
    success: true,
    session: {
      _id: session._id,
      loginAt: session.loginAt,
      flagged: session.flagged,
      flagReason: session.flagReason,
    },
    minutesUntilShiftEnd: minutesLeft,
    timezone,
  }, { status: 201 });
}
