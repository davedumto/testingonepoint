import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getEmployeeUser } from '@/lib/employee-auth';
import { getAdminUser } from '@/lib/admin-auth';
import { uploadBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// POST /api/messages/upload — lightweight upload for message attachments.
// Accepts a single file, returns its Cloudinary URL which the caller then
// includes in the subsequent POST to /api/messages (client) or
// /api/admin/messages/[userId] (agent). Separate from /api/documents because
// message attachments don't become ClientDocument vault entries — they're
// ephemeral transcript assets.
//
// Open to any authenticated user type (client OR agent OR admin) since both
// directions of the conversation need to upload files.

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — smaller than the doc vault cap
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

export async function POST(req: NextRequest) {
  // Accept any authenticated identity — we don't care who, as long as they
  // have SOME valid session. The subsequent message-send route enforces the
  // user/client relationship.
  const [client, employee, admin] = await Promise.all([getAuthUser(), getEmployeeUser(), getAdminUser()]);
  if (!client && !employee && !admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const identity = client?.userId || employee?.employeeId || admin?.userId || 'unknown';
  const { ip } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'msg-attachment');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.api);
  if (!rateResult.allowed) return Response.json({ error: 'Slow down.' }, { status: 429 });

  if (!isCloudinaryConfigured()) {
    return Response.json({ error: 'Upload is not configured on this server.' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) return Response.json({ error: 'No file provided.' }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) return Response.json({ error: 'Unsupported file type.' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'File too large. Max 10 MB.' }, { status: 413 });
    if (file.size < 1) return Response.json({ error: 'Empty file.' }, { status: 400 });

    const isPdf = file.type === 'application/pdf';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadBuffer(buffer, {
      folder: `onepoint-portal/message-attachments/${identity}`,
      resourceType: isPdf ? 'raw' : 'image',
    });

    return Response.json({
      success: true,
      attachment: {
        name: file.name,
        url: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
  } catch (error) {
    logger.error('Message attachment upload error', { error: String(error) });
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 500 });
  }
}
