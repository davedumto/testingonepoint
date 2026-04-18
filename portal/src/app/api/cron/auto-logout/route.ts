import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';
import Employee from '@/models/Employee';
import { isPastShiftEnd, calculateDuration, SHIFT_CONFIG } from '@/lib/shift-config';
import { auditLog } from '@/lib/security/audit-log';
import { DEFAULT_TIMEZONE } from '@/lib/timezones';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Vercel Cron job — runs every minute.
 * Finds all active sessions, checks if shift end + grace has passed
 * in each employee's timezone, and auto-logs them out.
 */
export async function GET(req: NextRequest) {
  // Bearer token check — prevents external triggering
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  // Find all active sessions (logoutType === 'active')
  const activeSessions = await TimeSession.find({ logoutType: 'active' });

  if (activeSessions.length === 0) {
    return Response.json({ checked: 0, loggedOut: 0 });
  }

  let loggedOutCount = 0;

  for (const session of activeSessions) {
    // Load the employee's timezone
    const employee = await Employee.findById(session.userId).select('timezone');
    const timezone = employee?.timezone || DEFAULT_TIMEZONE;

    // Check if shift end + grace has passed in the employee's timezone
    const pastEnd = isPastShiftEnd(timezone);

    // Also check max session duration (10 hours regardless of timezone)
    const sessionMinutes = calculateDuration(session.loginAt, new Date());
    const pastMaxDuration = sessionMinutes > SHIFT_CONFIG.maxSessionHours * 60;

    if (pastEnd || pastMaxDuration) {
      const now = new Date();
      const duration = calculateDuration(session.loginAt, now);

      session.logoutAt = now;
      session.duration = duration;
      session.logoutType = 'auto';
      await session.save();

      auditLog({
        userId: session.userId.toString(),
        userEmail: session.userEmail,
        ipAddress: 'cron',
        userAgent: 'auto-logout-job',
        action: 'time.auto_logout',
        status: 'success',
        details: {
          timezone,
          duration,
          reason: pastMaxDuration ? 'max_session_exceeded' : 'shift_end',
          sessionId: session._id.toString(),
        },
      });

      loggedOutCount++;
    }
  }

  return Response.json({ checked: activeSessions.length, loggedOut: loggedOutCount });
}
