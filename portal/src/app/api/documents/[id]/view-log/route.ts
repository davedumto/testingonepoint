import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientDocument, { HIPAA_SENSITIVE_KINDS } from '@/models/ClientDocument';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// POST /api/documents/[id]/view-log — log that the caller viewed/opened a
// document. HIPAA §18 calls for access logging on health data, so this
// endpoint records any view of a HIPAA-sensitive kind at warning severity.
// The UI fires this with `fetch(..., { keepalive: true })` immediately
// before opening the Cloudinary URL so the log survives the navigation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    // We only confirm the doc belongs to the caller — no need to return it.
    const doc = await ClientDocument.findOne({ _id: id, userId: user.userId }).select('kind name');
    if (!doc) return Response.json({ error: 'Document not found.' }, { status: 404 });

    const isHipaa = HIPAA_SENSITIVE_KINDS.includes(doc.kind);

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      severity: isHipaa ? 'warning' : 'info',
      details: {
        context: isHipaa ? 'hipaa_document_view' : 'document_view',
        docId: id,
        kind: doc.kind,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Document view log error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
