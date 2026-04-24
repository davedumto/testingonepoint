import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientDocument, { KIND_TO_CATEGORY, type DocumentKind } from '@/models/ClientDocument';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// POST /api/documents/[id]/archive — per spec §D10, never delete, always archive.
// Clients can only archive their own uploads. Agency-generated documents can
// be archived by staff only (UI already hides the button on those).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    await connectDB();

    const doc = await ClientDocument.findOne({ _id: id, userId: user.userId });
    if (!doc) return Response.json({ error: 'Document not found.' }, { status: 404 });

    // Defense in depth: only client_uploads can be archived by the client.
    if (KIND_TO_CATEGORY[doc.kind as DocumentKind] !== 'client_uploads' || doc.uploaderType !== 'client') {
      return Response.json({ error: 'You can only archive your own uploads. Contact us to remove an agency document.' }, { status: 403 });
    }

    doc.status = 'archived';
    doc.deletedAt = new Date();
    doc.isPinned = false;
    await doc.save();

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      severity: 'warning',
      details: { context: 'document_archive', docId: id, kind: doc.kind },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Document archive error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
