import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateTOTPSecret, generateQRCode } from '@/lib/security/two-factor';
import { encryptPII } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';

// POST — generate 2FA secret + QR code for the user
export async function POST() {
  const authUser = await getAuthUser();
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const user = await User.findById(authUser.userId);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  if (user.twoFactorEnabled) {
    return Response.json({ error: '2FA is already enabled.' }, { status: 409 });
  }

  const { secret, otpauthUrl } = generateTOTPSecret(user.email);
  const qrCode = await generateQRCode(otpauthUrl);

  // Store encrypted secret (not yet enabled — user must verify first)
  try {
    user.twoFactorSecret = encryptPII(secret);
  } catch {
    // If encryption keys not set, store raw (dev mode)
    user.twoFactorSecret = secret;
  }
  await user.save();

  await auditLog({
    userId: authUser.userId,
    userEmail: authUser.email,
    action: AUDIT_ACTIONS.TWO_FA_SETUP,
    status: 'success',
    ipAddress: 'server',
    userAgent: 'server',
  });

  return Response.json({ qrCode, secret }); // secret shown once so user can manually enter
}
