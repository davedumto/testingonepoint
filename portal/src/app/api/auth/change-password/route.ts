import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import { safeValidate, changePasswordSchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const body = await req.json();
  const validation = safeValidate(changePasswordSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { currentPassword, newPassword } = validation.data;

  if (currentPassword === newPassword) {
    return Response.json({ error: 'New password must be different from current.' }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(authUser.userId);
  if (!user) return Response.json({ error: 'User not found.' }, { status: 404 });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    auditLog({ userId: authUser.userId, userEmail: authUser.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_CHANGE, status: 'failure', details: { reason: 'wrong_current_password' } });
    return Response.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  user.password = newPassword;
  await user.save();

  auditLog({ userId: authUser.userId, userEmail: authUser.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.PASSWORD_CHANGE, status: 'success' });

  return Response.json({ success: true, message: 'Password changed successfully.' });
}
