import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Announcement from '@/models/Announcement';

export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')));
  const category = searchParams.get('category');

  await connectDB();

  const now = new Date();
  const baseQuery: Record<string, unknown> = {
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  };
  if (category) baseQuery.category = category;

  const [announcements, total] = await Promise.all([
    Announcement.find(baseQuery)
      .sort({ pinned: -1, postedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Announcement.countDocuments(baseQuery),
  ]);

  return Response.json({
    announcements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
