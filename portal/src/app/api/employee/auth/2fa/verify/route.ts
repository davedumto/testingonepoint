import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { verifyTOTP } from '@/lib/security/two-factor';
import { decryptPII } from '@/lib/security/encryption';
import { safeValidate, totpVerifySchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// Generate 10 backup codes (8 chars each, grouped as XXXX-XXXX).
// Returned plaintext once to the user; stored hashed.
function generateBackupCodes(): { plaintext: string[]; hashed: string[] } {
  const plaintext: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    plaintext.push(code);
    hashed.push(crypto.createHash('sha256').update(code).digest('hex'));
  }
  return { plaintext, hashed };
}

// POST — verify a TOTP token. On first successful verify, enables 2FA and
// returns 10 one-time backup codes (shown only once). Subsequent verifies
// are a no-op confirmation (no new codes).
export async function POST(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const body = await req.json();
  const validation = safeValidate(totpVerifySchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { token } = validation.data;

  await connectDB();
  const employee = await Employee.findById(session.employeeId);
  if (!employee || !employee.twoFactorSecret) {
    return Response.json({ error: 'Set up 2FA first.' }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptPII(employee.twoFactorSecret);
  } catch {
    secret = employee.twoFactorSecret; // dev mode fallback
  }

  const isValid = verifyTOTP(token, secret);

  if (!isValid) {
    await auditLog({
      userId: session.employeeId,
      userEmail: session.email,
      action: AUDIT_ACTIONS.TWO_FA_FAILED,
      status: 'failure',
      ipAddress: ip,
      userAgent,
      severity: 'warning',
      details: { portal: 'employee' },
    });
    return Response.json({ error: 'Invalid code. Try again.' }, { status: 401 });
  }

  let backupCodes: string[] | undefined;
  if (!employee.twoFactorEnabled) {
    // First successful verify — enable 2FA and issue backup codes
    const { plaintext, hashed } = generateBackupCodes();
    employee.twoFactorEnabled = true;
    employee.twoFactorBackupCodes = hashed;
    await employee.save();
    backupCodes = plaintext;
  }

  await auditLog({
    userId: session.employeeId,
    userEmail: session.email,
    action: AUDIT_ACTIONS.TWO_FA_VERIFY,
    status: 'success',
    ipAddress: ip,
    userAgent,
    details: { portal: 'employee', firstTime: !!backupCodes },
  });

  return Response.json({ success: true, twoFactorEnabled: true, backupCodes });
}
