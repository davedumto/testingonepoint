import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import AuditLog, { auditLog } from '@/lib/security/audit-log';
import TimeSession from '@/models/TimeSession';
import OAuthEvent from '@/models/EmployeeAuth';
import { getRequestInfo } from '@/lib/security/request-info';

/**
 * GET /api/admin/security/anomalies — returns anomaly summary.
 * Super-admin only.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  await connectDB();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

  // 1. Login attempts from new IPs (IPs not seen in past 90 days per user)
  const recentLogins = await AuditLog.find({
    action: 'auth.login',
    status: 'success',
    timestamp: { $gte: twentyFourHoursAgo },
  }).lean();

  const newIpLogins = [];
  for (const login of recentLogins) {
    if (!login.userId || !login.ipAddress) continue;
    const historicalCount = await AuditLog.countDocuments({
      userId: login.userId,
      action: 'auth.login',
      status: 'success',
      ipAddress: login.ipAddress,
      timestamp: { $gte: ninetyDaysAgo, $lt: twentyFourHoursAgo },
    });
    if (historicalCount === 0) {
      newIpLogins.push({ userId: login.userId, userEmail: login.userEmail, ip: login.ipAddress, timestamp: login.timestamp });
    }
  }

  // 2. Multiple failed logins from same IP across different accounts (10 min)
  const recentFails = await AuditLog.find({
    action: 'auth.login_failed',
    timestamp: { $gte: tenMinutesAgo },
  }).lean();

  const failsByIp: Record<string, Set<string>> = {};
  for (const f of recentFails) {
    if (!f.ipAddress) continue;
    if (!failsByIp[f.ipAddress]) failsByIp[f.ipAddress] = new Set();
    if (f.userEmail) failsByIp[f.ipAddress].add(f.userEmail);
  }
  const crossAccountAttacks = Object.entries(failsByIp)
    .filter(([, users]) => users.size >= 2)
    .map(([ipAddr, users]) => ({ ip: ipAddr, accounts: [...users], count: users.size }));

  // 3. Clock-ins without matching clock-outs older than 24 hours
  const orphanedSessions = await TimeSession.find({
    logoutType: 'active',
    loginAt: { $lt: twentyFourHoursAgo },
  }).select('userId userEmail userName loginAt').lean();

  // 4. OAuth authentication bursts (5+ within 60 seconds per employee)
  const recentOAuth = await OAuthEvent.find({
    status: 'completed',
    authenticatedAt: { $gte: sixtySecondsAgo },
  }).lean();

  const oauthByUser: Record<string, number> = {};
  for (const o of recentOAuth) {
    const key = o.userId?.toString() || 'unknown';
    oauthByUser[key] = (oauthByUser[key] || 0) + 1;
  }
  const oauthBursts = Object.entries(oauthByUser)
    .filter(([, count]) => count >= 5)
    .map(([userId, count]) => ({ userId, count }));

  // 5. Flagged sessions (off-hours / weekend in past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const flaggedSessions = await TimeSession.find({
    flagged: true,
    loginAt: { $gte: sevenDaysAgo },
  }).select('userId userEmail userName loginAt flagReason').lean();

  // Log this admin data view
  auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: 'admin.data_viewed', status: 'success', targetResource: 'security_anomalies' });

  return Response.json({
    newIpLogins: { count: newIpLogins.length, items: newIpLogins.slice(0, 20) },
    crossAccountAttacks: { count: crossAccountAttacks.length, items: crossAccountAttacks },
    orphanedSessions: { count: orphanedSessions.length, items: orphanedSessions.slice(0, 20) },
    oauthBursts: { count: oauthBursts.length, items: oauthBursts },
    flaggedSessions: { count: flaggedSessions.length, items: flaggedSessions.slice(0, 20) },
  });
}
