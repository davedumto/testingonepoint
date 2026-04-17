import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ExtraHoursRequest from '@/models/ExtraHoursRequest';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// GET — admin lists all extra hours requests
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const requests = await ExtraHoursRequest.find(filter).sort({ createdAt: -1 });
  return Response.json({ requests });
}

// PUT — admin approves or denies extra hours request
export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const { requestId, action } = await req.json();
  if (!requestId || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'requestId and action required.' }, { status: 400 });
  }

  await connectDB();
  const request = await ExtraHoursRequest.findById(requestId);
  if (!request) return Response.json({ error: 'Not found.' }, { status: 404 });
  if (request.status !== 'pending') return Response.json({ error: `Already ${request.status}.` }, { status: 409 });

  request.status = action === 'approve' ? 'approved' : 'denied';
  request.reviewedAt = new Date();
  request.reviewedBy = admin.email;
  await request.save();

  auditLog({
    userId: 'admin', userEmail: admin.email, ipAddress: ip, userAgent,
    action: action === 'approve' ? AUDIT_ACTIONS.EXTRA_HOURS_APPROVED : AUDIT_ACTIONS.EXTRA_HOURS_DENIED,
    status: 'success', targetId: requestId,
    details: { employeeEmail: request.userEmail, hoursRequested: request.hoursRequested },
  });

  return Response.json({ success: true, request });
}
