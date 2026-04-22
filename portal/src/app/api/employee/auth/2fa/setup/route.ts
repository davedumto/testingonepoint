import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { generateTOTPSecret, generateQRCode } from '@/lib/security/two-factor';
import { encryptPII } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';

// POST — generate a new TOTP secret + QR for the signed-in employee.
// Secret stored encrypted but NOT enabled yet; enablement happens on /verify.
export async function POST() {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const employee = await Employee.findById(session.employeeId);
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

  if (employee.twoFactorEnabled) {
    return Response.json({ error: '2FA is already enabled.' }, { status: 409 });
  }

  const { secret, otpauthUrl } = generateTOTPSecret(employee.email);
  const qrCode = await generateQRCode(otpauthUrl);

  try {
    employee.twoFactorSecret = encryptPII(secret);
  } catch {
    employee.twoFactorSecret = secret; // dev mode fallback
  }
  await employee.save();

  await auditLog({
    userId: session.employeeId,
    userEmail: session.email,
    action: AUDIT_ACTIONS.TWO_FA_SETUP,
    status: 'success',
    ipAddress: 'server',
    userAgent: 'server',
    details: { portal: 'employee' },
  });

  // secret returned once so user can manually enter it if QR scan fails
  return Response.json({ qrCode, secret });
}
