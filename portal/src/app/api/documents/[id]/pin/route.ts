import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ClientDocument from '@/models/ClientDocument';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// POST /api/documents/[id]/pin — toggle pin status on a doc the caller owns.
// Per spec §D11, clients can pin docs for fast access ("Find my ID card").
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    await connectDB();

    const doc = await ClientDocument.findOne({ _id: id, userId: user.userId });
    if (!doc) return Response.json({ error: 'Document not found.' }, { status: 404 });

    doc.isPinned = !doc.isPinned;
    doc.pinnedBy = doc.isPinned ? 'client' : undefined;
    await doc.save();

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'document_pin_toggle', docId: id, pinned: doc.isPinned },
    });

    return Response.json({ success: true, isPinned: doc.isPinned });
  } catch (error) {
    logger.error('Document pin error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
