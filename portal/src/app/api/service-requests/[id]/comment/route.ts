import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ServiceRequest from '@/models/ServiceRequest';
import User from '@/models/User';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

const schema = z.object({ body: z.string().min(1).max(5000).trim() });

// POST /api/service-requests/[id]/comment — client adds a comment to their
// own service request. If the request is in "waiting_on_client", adding a
// comment flips it back to "in_progress" so operations knows they can resume.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  const rateKey = getRateLimitKey(ip, 'service-request-comment');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.api);
  if (!rateResult.allowed) return Response.json({ error: 'Slow down.' }, { status: 429 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    await connectDB();

    const request = await ServiceRequest.findOne({ _id: id, userId: user.userId });
    if (!request) return Response.json({ error: 'Request not found.' }, { status: 404 });

    // Terminal requests accept no further comments — avoid reopening them by accident.
    if (request.status === 'completed' || request.status === 'cancelled') {
      return Response.json({ error: 'This request is closed. Open a new one if you need to follow up.' }, { status: 409 });
    }

    const dbUser = await User.findById(user.userId).select('name');

    request.comments.push({
      authorId: new mongoose.Types.ObjectId(user.userId),
      authorName: dbUser?.name || user.email,
      authorType: 'client',
      body: validation.data.body,
      createdAt: new Date(),
    });

    // Client replied -> unblock whatever operations was waiting on.
    if (request.status === 'waiting_on_client') request.status = 'in_progress';

    await request.save();

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'service_request_comment', requestId: id, newStatus: request.status },
    });

    return Response.json({ success: true, status: request.status });
  } catch (error) {
    logger.error('Service request comment error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
