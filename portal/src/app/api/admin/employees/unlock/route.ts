import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { unlockAccount } from '@/lib/security/account-lockout';
import { hmacEmail } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Email required.' }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findOne({ hmacEmail: hmacEmail(email) });
    if (!employee) {
      return Response.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const unlocked = await unlockAccount(email);

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ACCOUNT_UNLOCKED,
      status: 'success',
      targetResource: employee._id.toString(),
      details: { targetEmail: email, wasLocked: unlocked, portal: 'employee' },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Admin unlock error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
