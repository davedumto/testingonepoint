import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ServiceRequest, { type ServiceRequestStatus } from '@/models/ServiceRequest';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// GET /api/admin/service-requests — global triage list for ops. Supports
// status + urgency + assignedTo filters. Joins the User doc server-side so
// the UI can show client names without an N+1 round-trip.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const urgency = searchParams.get('urgency');
  const assignedTo = searchParams.get('assignedTo');

  try {
    await connectDB();

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    else query.status = { $in: ['submitted', 'in_progress', 'waiting_on_client'] }; // default: open only
    if (urgency) query.urgency = urgency;
    if (assignedTo) query.assignedTo = assignedTo;

    const requests = await ServiceRequest.find(query).sort({ createdAt: -1 }).limit(200);

    // Batch user lookup for names
    const userIds = [...new Set(requests.map(r => r.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } }).select('name firstName lastName email');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const now = Date.now();

    return Response.json({
      requests: requests.map(r => {
        const client = userMap.get(r.userId.toString());
        const submittedAt = r.submittedAt?.getTime() || r.createdAt.getTime();
        // Hours since submitted — naive SLA signal. Anything over 24h on a
        // non-completed request gets highlighted in the UI.
        const hoursOpen = Math.floor((now - submittedAt) / (60 * 60 * 1000));
        return {
          _id: r._id.toString(),
          userId: r.userId.toString(),
          clientName: client?.name || 'Unknown',
          clientEmail: client?.email || '',
          type: r.type,
          description: r.description,
          urgency: r.urgency,
          status: r.status as ServiceRequestStatus,
          assignedTo: r.assignedTo,
          submittedAt: r.submittedAt,
          firstResponseAt: r.firstResponseAt,
          hoursOpen,
        };
      }),
    });
  } catch (error) {
    logger.error('Admin SR list error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
