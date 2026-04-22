import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { setEmployeeCookie } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { verifyTOTP } from '@/lib/security/two-factor';
import { decryptPII } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { generateCSRFToken } from '@/lib/security/csrf';
import { clearLoginAttempts } from '@/lib/security/account-lockout';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const PENDING_COOKIE = 'op_employee_pending_2fa';

interface PendingPayload {
  employeeId: string;
  email: string;
  name: string;
  pending2fa: true;
}

export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const cookieStore = await cookies();
    const pendingToken = cookieStore.get(PENDING_COOKIE)?.value;
    if (!pendingToken) {
      return Response.json({ error: 'No pending 2FA session. Please log in again.' }, { status: 401 });
    }

    let pending: PendingPayload;
    try {
      pending = jwt.verify(pendingToken, JWT_SECRET) as PendingPayload;
    } catch {
      cookieStore.delete(PENDING_COOKIE);
      return Response.json({ error: '2FA session expired. Please log in again.' }, { status: 401 });
    }
    if (!pending.pending2fa) {
      return Response.json({ error: 'Invalid 2FA session.' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Code required.' }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findById(pending.employeeId);
    if (!employee || !employee.twoFactorEnabled || !employee.twoFactorSecret) {
      return Response.json({ error: '2FA not configured.' }, { status: 400 });
    }

    // Try TOTP first
    let secret: string;
    try { secret = decryptPII(employee.twoFactorSecret); } catch { secret = employee.twoFactorSecret; }

    const isTotpDigits = /^\d{6}$/.test(token.trim());
    let accepted = false;
    let mode: 'totp' | 'backup' | null = null;

    if (isTotpDigits && verifyTOTP(token.trim(), secret)) {
      accepted = true;
      mode = 'totp';
    } else {
      // Try backup codes. Codes are stored hashed; compare input's hash.
      const normalized = token.trim().toUpperCase();
      const hashed = crypto.createHash('sha256').update(normalized).digest('hex');
      const codes = employee.twoFactorBackupCodes || [];
      const idx = codes.indexOf(hashed);
      if (idx >= 0) {
        // Consume this backup code
        codes.splice(idx, 1);
        employee.twoFactorBackupCodes = codes;
        await employee.save();
        accepted = true;
        mode = 'backup';
      }
    }

    if (!accepted) {
      auditLog({ userId: pending.employeeId, userEmail: pending.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_FAILED, status: 'failure', severity: 'warning', details: { portal: 'employee', context: 'login' } });
      return Response.json({ error: 'Invalid code. Try again.' }, { status: 401 });
    }

    cookieStore.delete(PENDING_COOKIE);

    await clearLoginAttempts(pending.email);
    employee.lastLogin = new Date();
    await employee.save();

    await setEmployeeCookie({
      employeeId: pending.employeeId,
      userId: pending.employeeId,
      email: pending.email,
      name: pending.name,
    });

    await generateCSRFToken();

    auditLog({ userId: pending.employeeId, userEmail: pending.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.TWO_FA_VERIFY, status: 'success', details: { portal: 'employee', context: 'login', mode } });

    return Response.json({
      success: true,
      employee: { name: pending.name, email: pending.email },
      backupCodesRemaining: employee.twoFactorBackupCodes?.length ?? 0,
    });
  } catch (error) {
    logger.error('Employee 2FA login-verify error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
