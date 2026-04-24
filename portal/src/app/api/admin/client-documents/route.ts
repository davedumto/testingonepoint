import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ClientDocument, { KIND_TO_CATEGORY, type DocumentKind, type QuoteVersionLabel } from '@/models/ClientDocument';
import Policy from '@/models/Policy';
import User from '@/models/User';
import { uploadBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { dispatchClientNotification } from '@/lib/client-notifications';
import { logger } from '@/lib/logger';

// Admin endpoint for pushing agency-generated documents (DEC, ID cards,
// endorsements, invoices, COI, etc.) into a client's ClientDocument vault.
// Separate from the existing /api/admin/documents route which manages the
// employee-hub DocumentLink (SharePoint-style links for internal use).

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
];

function isValidKind(k: string): k is DocumentKind { return Object.prototype.hasOwnProperty.call(KIND_TO_CATEGORY, k); }
function isValidQuoteVersion(v: string): v is QuoteVersionLabel { return v === 'quoted' || v === 'revised' || v === 'final_option'; }

// Naming convention per spec §D2: [PolicyType]_[Carrier]_[PolicyNumber]_[DocType]_[Date]
function buildConventionName(parts: { policyType?: string; carrier?: string; policyNumber?: string; kind: DocumentKind; date: Date }): string {
  const slug = (s?: string) => (s || '').trim().replace(/\s+/g, '').replace(/[^A-Za-z0-9]/g, '') || 'Unknown';
  const d = parts.date;
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return [slug(parts.policyType), slug(parts.carrier), slug(parts.policyNumber), slug(parts.kind), dateStr].join('_');
}

// POST /api/admin/client-documents
// multipart/form-data fields:
//   file            — required
//   userId          — required (client this doc belongs to)
//   kind            — required, any DocumentKind
//   policyId        — optional, enables convention naming + denormalized metadata
//   name            — optional display name override
//   quoteVersion    — optional (quotes only): 'quoted'|'revised'|'final_option'
//   billedBy        — optional (billing only): 'carrier'|'agency'
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'admin-client-doc-upload');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.api);
  if (!rateResult.allowed) return Response.json({ error: 'Slow down.' }, { status: 429 });

  if (!isCloudinaryConfigured()) {
    return Response.json({ error: 'Upload is not configured on this server.' }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userIdRaw = formData.get('userId');
    const kindRaw = formData.get('kind');
    const policyIdRaw = formData.get('policyId');
    const name = (formData.get('name') as string | null)?.trim();
    const quoteVersionRaw = formData.get('quoteVersion') as string | null;
    const billedByRaw = formData.get('billedBy') as string | null;

    if (!file || !(file instanceof File)) return Response.json({ error: 'No file provided.' }, { status: 400 });
    if (typeof userIdRaw !== 'string' || !mongoose.isValidObjectId(userIdRaw)) return Response.json({ error: 'Invalid client id.' }, { status: 400 });
    if (typeof kindRaw !== 'string' || !isValidKind(kindRaw)) return Response.json({ error: 'Invalid document kind.' }, { status: 400 });
    if (!ALLOWED_MIME.includes(file.type.toLowerCase())) return Response.json({ error: 'Unsupported file type.' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'File too large. Max 15 MB.' }, { status: 413 });
    if (file.size < 1) return Response.json({ error: 'Empty file.' }, { status: 400 });

    const kind = kindRaw;
    const category = KIND_TO_CATEGORY[kind];

    await connectDB();

    const client = await User.findOne({ _id: userIdRaw, role: 'client' }).select('_id');
    if (!client) return Response.json({ error: 'Client not found.' }, { status: 404 });

    let policy = null;
    if (typeof policyIdRaw === 'string' && policyIdRaw) {
      if (!mongoose.isValidObjectId(policyIdRaw)) return Response.json({ error: 'Invalid policy id.' }, { status: 400 });
      policy = await Policy.findOne({ _id: policyIdRaw, userId: client._id });
      if (!policy) return Response.json({ error: 'Policy not found for this client.' }, { status: 404 });
    }

    const isPdf = file.type === 'application/pdf';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadBuffer(buffer, {
      folder: `onepoint-portal/admin-docs/${client._id}`,
      resourceType: isPdf ? 'raw' : 'image',
    });

    const now = new Date();
    const conventionName = policy
      ? buildConventionName({ policyType: policy.productCategory, carrier: policy.carrier, policyNumber: policy.policyNumber, kind, date: now })
      : undefined;

    const docPayload: Record<string, unknown> = {
      userId: client._id,
      policyId: policy?._id,
      kind,
      category,
      name: name || conventionName || file.name || kind,
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
      // Auto-pin ID cards so the dashboard widget always surfaces the newest one.
      isPinned: kind === 'id_card',
      pinnedBy: kind === 'id_card' ? 'system' : undefined,
      tags: [],
      uploadedBy: admin.userId,
      uploaderType: 'admin',
    };

    if (category === 'quotes' && quoteVersionRaw && isValidQuoteVersion(quoteVersionRaw)) {
      docPayload.quoteVersion = quoteVersionRaw;
    }
    if (category === 'billing' && (billedByRaw === 'carrier' || billedByRaw === 'agency')) {
      docPayload.billedBy = billedByRaw;
    }

    // New ID card -> unpin previous ones on the same policy so only the
    // latest is the dashboard default. Previous IDs stay in the archive
    // per spec §D3 (Current / Previous separation).
    if (kind === 'id_card' && policy) {
      await ClientDocument.updateMany(
        { userId: client._id, policyId: policy._id, kind: 'id_card', isPinned: true },
        { $set: { isPinned: false } },
      );
    }

    const doc = await ClientDocument.create(docPayload);

    // Notify the client that a new doc is in their vault. ID cards get a
    // more specific title since those are the one-click panic item.
    await dispatchClientNotification({
      userId: client._id,
      type: 'doc_uploaded',
      title: kind === 'id_card'
        ? 'Your new ID card is ready'
        : `New ${kind.replace(/_/g, ' ')} uploaded`,
      body: doc.name,
      link: policy
        ? `/dashboard/policies/${policy._id.toString()}`
        : '/dashboard/documents',
      actorName: admin.name,
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'admin_client_document_upload', docId: doc._id.toString(), clientId: client._id.toString(), kind },
    });

    return Response.json({ success: true, document: { _id: doc._id.toString(), url: doc.url, name: doc.name, kind: doc.kind } }, { status: 201 });
  } catch (error) {
    logger.error('Admin client document upload error', { error: String(error) });
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 500 });
  }
}
