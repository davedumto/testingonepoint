import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import DocumentLink from '@/models/DocumentLink';

export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.trim();
  const category = searchParams.get('category');

  await connectDB();

  const query: Record<string, unknown> = {};
  if (category) query.category = category;
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const documents = await DocumentLink.find(query).sort({ postedAt: -1 }).limit(100);
  return Response.json({ documents });
}
