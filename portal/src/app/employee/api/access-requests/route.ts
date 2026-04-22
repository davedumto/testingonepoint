import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import AccessRequest from '@/models/AccessRequest';
import { safeValidate, accessRequestSchema } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { isProviderEnabled } from '@/lib/provider-config';
import type { ProviderSlug } from '@/models/ProviderConfig';

// GET — list current employee's access requests
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const requests = await AccessRequest.find({ userId: user.userId }).sort({ requestedAt: -1 });
  return Response.json({ requests });
}

// POST — employee submits a new access request
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const body = await req.json();
  const validation = safeValidate(accessRequestSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { provider, reason } = validation.data;

  // Reject if admin has disabled this provider on the App Gateway
  const enabled = await isProviderEnabled(provider as ProviderSlug);
  if (!enabled) {
    return Response.json({ error: 'This app is not available right now.' }, { status: 403 });
  }

  await connectDB();

  // Check for existing pending or approved request
  const existing = await AccessRequest.findOne({
    userId: user.userId,
    provider,
    status: { $in: ['pending', 'approved'] },
  });

  if (existing?.status === 'approved') {
    return Response.json({ error: 'You already have approved access to this app.' }, { status: 409 });
  }
  if (existing?.status === 'pending') {
    return Response.json({ error: 'You already have a pending request for this app.' }, { status: 409 });
  }

  const request = await AccessRequest.create({
    userId: user.userId,
    userEmail: user.email,
    userName: user.name,
    provider,
    reason: reason || '',
    status: 'pending',
  });

  auditLog({ userId: user.userId, userEmail: user.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ACCESS_REQUEST, status: 'success', details: { provider } });

  return Response.json({ success: true, request }, { status: 201 });
}
