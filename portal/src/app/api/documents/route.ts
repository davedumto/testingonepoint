import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientDocument, { KIND_TO_CATEGORY, type DocumentKind, type DocumentCategory, HIPAA_SENSITIVE_KINDS } from '@/models/ClientDocument';
import Policy from '@/models/Policy';
import { uploadBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — room for scanned multi-page DECs
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

// Convention per spec: [PolicyType]_[Carrier]_[Number]_[DocType]_[Date].pdf
// Returns a sanitized filename without extension (caller appends one).
function buildConventionName(parts: { policyType?: string; carrier?: string; policyNumber?: string; kind: DocumentKind; date: Date }): string {
  const slug = (s?: string) => (s || '').trim().replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '') || 'Unknown';
  const d = parts.date;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return [slug(parts.policyType), slug(parts.carrier), slug(parts.policyNumber), slug(parts.kind), dateStr].join('_');
}

// Guard: a kind must be valid AND map to a category we know about.
function isValidKind(k: string): k is DocumentKind {
  return Object.prototype.hasOwnProperty.call(KIND_TO_CATEGORY, k);
}

// GET /api/documents — list the caller's docs with filters
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') as DocumentCategory | null;
  const kind = searchParams.get('kind');
  const policyId = searchParams.get('policyId');
  const search = searchParams.get('q');
  const pinnedOnly = searchParams.get('pinned') === '1';
  const includeArchived = searchParams.get('archived') === '1';

  await connectDB();

  const query: Record<string, unknown> = { userId: user.userId };
  if (!includeArchived) query.deletedAt = { $exists: false };
  if (category) query.category = category;
  if (kind) query.kind = kind;
  if (policyId && mongoose.isValidObjectId(policyId)) query.policyId = policyId;
  if (pinnedOnly) query.isPinned = true;
  if (search?.trim()) query.$text = { $search: search.trim() };

  const docs = await ClientDocument.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(200);

  return Response.json({
    documents: docs.map(d => ({
      _id: d._id.toString(),
      kind: d.kind,
      category: d.category,
      name: d.name,
      conventionName: d.conventionName,
      url: d.url,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      carrier: d.carrier,
      policyType: d.policyType,
      policyNumber: d.policyNumber,
      policyId: d.policyId?.toString(),
      effectiveDate: d.effectiveDate,
      expirationDate: d.expirationDate,
      status: d.status,
      quoteVersion: d.quoteVersion,
      isPinned: d.isPinned,
      tags: d.tags,
      uploaderType: d.uploaderType,
      uploadedAt: d.uploadedAt,
      billedBy: d.billedBy,
    })),
  });
}

// POST /api/documents — client-initiated upload (e.g. driver license, property photo)
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'document-upload');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.passwordReset);
  if (!rateResult.allowed) {
    return Response.json({ error: 'Too many uploads. Try again later.' }, { status: 429 });
  }

  if (!isCloudinaryConfigured()) {
    return Response.json({ error: 'Upload is not configured on this server.' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const kindRaw = formData.get('kind');
    const policyIdRaw = formData.get('policyId');
    const displayName = (formData.get('name') as string | null)?.trim();

    if (!file || !(file instanceof File)) return Response.json({ error: 'No file provided.' }, { status: 400 });
    if (typeof kindRaw !== 'string' || !isValidKind(kindRaw)) return Response.json({ error: 'Invalid document kind.' }, { status: 400 });

    const kind = kindRaw;
    const category = KIND_TO_CATEGORY[kind];

    // Clients are only permitted to upload into the client_uploads category.
    // Agency-generated kinds (DEC, ID cards, etc.) must be uploaded by staff.
    if (category !== 'client_uploads') {
      return Response.json({ error: 'You can only upload personal documents from this page.' }, { status: 403 });
    }

    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) {
      return Response.json({ error: 'Unsupported file type. Use PDF, JPG, PNG, WEBP, or HEIC.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) return Response.json({ error: 'File too large. Max 15 MB.' }, { status: 413 });
    if (file.size < 1) return Response.json({ error: 'Empty file.' }, { status: 400 });

    await connectDB();

    // Resolve policy context if one was supplied — used to enrich metadata
    // + enforce the file-naming convention when relevant.
    let policy = null;
    if (typeof policyIdRaw === 'string' && mongoose.isValidObjectId(policyIdRaw)) {
      policy = await Policy.findOne({ _id: policyIdRaw, userId: user.userId });
      if (!policy) return Response.json({ error: 'Policy not found.' }, { status: 404 });
    }

    const isPdf = file.type === 'application/pdf';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadBuffer(buffer, {
      folder: `onepoint-portal/client-docs/${user.userId}`,
      resourceType: isPdf ? 'raw' : 'image',
    });

    const now = new Date();
    const conventionName = policy
      ? buildConventionName({ policyType: policy.productCategory, carrier: policy.carrier, policyNumber: policy.policyNumber, kind, date: now })
      : undefined;

    const docName = displayName || conventionName || file.name || kind;

    const doc = await ClientDocument.create({
      userId: user.userId,
      policyId: policy?._id,
      kind,
      category,
      name: docName,
      originalName: file.name,
      conventionName,
      url: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      mimeType: file.type,
      sizeBytes: file.size,
      carrier: policy?.carrier,
      policyType: policy?.productCategory,
      policyNumber: policy?.policyNumber,
      effectiveDate: policy?.startDate,
      expirationDate: policy?.endDate,
      status: 'active',
      isPinned: false,
      tags: [],
      uploadedBy: user.userId,
      uploaderType: 'client',
    });

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      // Flag medical doc uploads specifically so HIPAA access reviews can
      // find them fast. Per-doc access logging is layered on in the GET/download routes.
      severity: HIPAA_SENSITIVE_KINDS.includes(kind) ? 'warning' : 'info',
      details: { context: 'client_document_upload', docId: doc._id.toString(), kind, hipaaSensitive: HIPAA_SENSITIVE_KINDS.includes(kind) },
    });

    return Response.json({ success: true, document: { _id: doc._id.toString(), url: doc.url, name: doc.name } });
  } catch (error) {
    logger.error('Client document upload error', { error: String(error) });
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 500 });
  }
}
