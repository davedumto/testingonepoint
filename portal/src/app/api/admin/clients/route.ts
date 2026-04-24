import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';
import ServiceRequest from '@/models/ServiceRequest';
import { hmacEmail } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

// GET /api/admin/clients — list for admin client triage. Supports name/email
// search (hmac lookup when full email provided) and returns per-client stats
// so the list page can render tier, open requests, etc. without N round-trips.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const agent = searchParams.get('agent');
  const tag = searchParams.get('tag')?.trim();

  try {
    await connectDB();

    const query: Record<string, unknown> = { role: 'client' };
    if (agent) query.assignedAgent = agent;
    // Tag filter — case-insensitive exact match on any tag in the array.
    if (tag) query.tags = { $regex: `^${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };

    // Email lookup uses the hmac index so we never read every encrypted row.
    // Name search requires full-field scan since names are encrypted; cap
    // results to keep it snappy.
    let candidates = await User.find(query).sort({ createdAt: -1 }).limit(200);

    if (q) {
      if (q.includes('@')) {
        const exact = await User.findOne({ hmacEmail: hmacEmail(q.toLowerCase()) });
        candidates = exact ? [exact] : [];
      } else {
        const needle = q.toLowerCase();
        candidates = candidates.filter(u => {
          const name = (u.name || '').toLowerCase();
          const fn = (u.firstName || '').toLowerCase();
          const ln = (u.lastName || '').toLowerCase();
          return name.includes(needle) || fn.includes(needle) || ln.includes(needle);
        });
      }
    }

    // Batch the per-client stats rather than N separate finds.
    const ids = candidates.map(u => u._id);
    const [policyCounts, requestCounts] = await Promise.all([
      Policy.aggregate([
        { $match: { userId: { $in: ids }, status: 'active' } },
        { $group: { _id: '$userId', count: { $sum: 1 }, premium: { $sum: '$premium' } } },
      ]),
      ServiceRequest.aggregate([
        { $match: { userId: { $in: ids }, status: { $in: ['submitted', 'in_progress', 'waiting_on_client'] } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);

    const pMap = new Map<string, { count: number; premium: number }>();
    policyCounts.forEach(r => pMap.set(r._id.toString(), { count: r.count, premium: r.premium || 0 }));
    const sMap = new Map<string, number>();
    requestCounts.forEach(r => sMap.set(r._id.toString(), r.count));

    return Response.json({
      clients: candidates.map(u => {
        const id = u._id.toString();
        return {
          _id: id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          tier: u.tier,
          assignedAgent: u.assignedAgent,
          businessName: u.businessName,
          activePolicies: pMap.get(id)?.count || 0,
          monthlyPremium: pMap.get(id)?.premium || 0,
          openRequests: sMap.get(id) || 0,
          createdAt: u.createdAt,
          // GHL-linked fields — always returned so the UI can surface tags /
          // last-activity signals without a second round-trip per row.
          ghlContactId: u.ghlContactId,
          ghlCreatedAt: u.ghlCreatedAt,
          ghlLastActivity: u.ghlLastActivity,
          tags: u.tags || [],
        };
      }),
    });
  } catch (error) {
    logger.error('Admin clients list error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
