import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getEmployeeUser } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { uploadBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export async function POST(req: NextRequest) {
  const session = await getEmployeeUser();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  // Rate limit to prevent storage abuse
  const rateKey = getRateLimitKey(ip, 'photo-upload');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
  if (!rateResult.allowed) {
    return Response.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

  if (!isCloudinaryConfigured()) {
    return Response.json({ error: 'Image upload is not configured on this server.' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
      return Response.json({ error: `Unsupported file type. Use JPG, PNG, WebP, GIF, or HEIC.` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File is too large. Max 5 MB.' }, { status: 413 });
    }
    if (file.size < 1) {
      return Response.json({ error: 'Empty file.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Face-aware thumbnail at 400x400, auto format + quality. Deterministic
    // public_id per-employee means re-uploads overwrite the prior photo.
    const result = await uploadBuffer(buffer, {
      folder: 'onepoint-portal/employee-photos',
      publicId: `employee-${session.employeeId}`,
      transformation: [
        { width: 400, height: 400, gravity: 'face', crop: 'thumb' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    await connectDB();
    await Employee.findByIdAndUpdate(session.employeeId, { photoUrl: result.secure_url });

    auditLog({
      userId: session.employeeId,
      userEmail: session.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'profile_photo_upload', publicId: result.public_id, bytes: file.size },
    });

    return Response.json({ success: true, url: result.secure_url });
  } catch (error) {
    logger.error('Photo upload error', { error: String(error) });
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 500 });
  }
}
