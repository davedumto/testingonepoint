import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TimeSession from '@/models/TimeSession';

// GET — employee's own time sessions (last 30 days)
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = await TimeSession.find({
    userId: user.userId,
    loginAt: { $gte: thirtyDaysAgo },
  }).sort({ loginAt: -1 });

  // Calculate totals
  const activeSession = sessions.find(s => s.logoutType === 'active');
  const completedSessions = sessions.filter(s => s.logoutType !== 'active' && s.duration);
  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  // This week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekSessions = completedSessions.filter(s => new Date(s.loginAt) >= startOfWeek);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const weekHours = Math.round(weekMinutes / 60 * 10) / 10;

  return Response.json({
    sessions,
    activeSession: activeSession || null,
    stats: {
      totalHours,
      weekHours,
      sessionCount: sessions.length,
      flaggedCount: sessions.filter(s => s.flagged).length,
    },
  });
}
