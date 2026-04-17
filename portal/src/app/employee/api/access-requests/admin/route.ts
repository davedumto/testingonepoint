import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import AccessRequest from '@/models/AccessRequest';
import OAuthEvent from '@/models/EmployeeAuth';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

const PROVIDER_NAMES: Record<string, string> = {
  ghl: 'GoHighLevel',
  canva: 'Canva',
  lastpass: 'LastPass',
  microsoft: 'Microsoft 365',
};

// GET — admin lists all access requests (with optional status filter)
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'pending', 'approved', 'denied', or null for all

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const requests = await AccessRequest.find(filter).sort({ requestedAt: -1 });

  // For each request, get the latest auth event (if they've authenticated)
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const lastAuth = await OAuthEvent.findOne(
        { userId: r.userId, provider: r.provider, status: 'completed' },
      ).sort({ authenticatedAt: -1 });

      return {
        _id: r._id,
        userName: r.userName,
        userEmail: r.userEmail,
        provider: r.provider,
        providerName: PROVIDER_NAMES[r.provider] || r.provider,
        status: r.status,
        reason: r.reason,
        requestedAt: r.requestedAt,
        reviewedAt: r.reviewedAt,
        reviewedBy: r.reviewedBy,
        lastAuthenticated: lastAuth?.authenticatedAt || null,
      };
    })
  );

  return Response.json({ requests: enriched });
}

// PUT — admin approves or denies a request
export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const { requestId, action } = await req.json();

  if (!requestId || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'requestId and action (approve/deny) required.' }, { status: 400 });
  }

  await connectDB();

  const request = await AccessRequest.findById(requestId);
  if (!request) return Response.json({ error: 'Request not found.' }, { status: 404 });

  if (request.status !== 'pending') {
    return Response.json({ error: `Request already ${request.status}.` }, { status: 409 });
  }

  request.status = action === 'approve' ? 'approved' : 'denied';
  request.reviewedAt = new Date();
  request.reviewedBy = admin.email;
  await request.save();

  auditLog({
    userId: 'admin', userEmail: admin.email, ipAddress: ip, userAgent,
    action: action === 'approve' ? AUDIT_ACTIONS.ACCESS_APPROVED : AUDIT_ACTIONS.ACCESS_DENIED,
    status: 'success', targetId: requestId,
    details: { provider: request.provider, employeeEmail: request.userEmail },
  });

  // If approved, send notification email with auth link
  if (action === 'approve') {
    try {
      const { sendAccessApprovedEmail } = await import('@/lib/employee-email');
      sendAccessApprovedEmail(
        request.userEmail,
        request.userName,
        request.provider,
        PROVIDER_NAMES[request.provider] || request.provider
      ).catch(console.error);
    } catch {
      // Email is optional — don't block approval
    }
  }

  return Response.json({
    success: true,
    request: {
      _id: request._id,
      status: request.status,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy,
    },
  });
}
