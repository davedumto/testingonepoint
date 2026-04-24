import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import BillingRecord from '@/models/BillingRecord';
import { logger } from '@/lib/logger';

// GET /api/billing — returns the caller's billing history grouped into
// upcoming / history / missed buckets so the UI can render §9 cleanly.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    const records = await BillingRecord.find({ userId: user.userId }).sort({ dueDate: -1 }).limit(200);

    const now = new Date();
    const upcoming: typeof records = [];
    const missed: typeof records = [];
    const history: typeof records = [];

    for (const r of records) {
      if (r.status === 'scheduled' || (r.status === 'pending' && r.dueDate.getTime() > now.getTime())) {
        upcoming.push(r);
      } else if (r.status === 'missed' || (r.status === 'pending' && r.dueDate.getTime() <= now.getTime())) {
        missed.push(r);
      } else {
        history.push(r);
      }
    }

    const serialize = (r: typeof records[number]) => ({
      _id: r._id.toString(),
      policyId: r.policyId.toString(),
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      dueDate: r.dueDate,
      paidDate: r.paidDate,
      status: r.status,
      billedBy: r.billedBy,
      carrierName: r.carrierName,
      carrierPortalUrl: r.carrierPortalUrl,
      description: r.description,
      documentId: r.documentId?.toString(),
    });

    return Response.json({
      upcoming: upcoming.map(serialize),
      missed: missed.map(serialize),
      history: history.map(serialize),
    });
  } catch (error) {
    logger.error('Billing list error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
