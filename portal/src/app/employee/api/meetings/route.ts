import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TeamMeeting from '@/models/TeamMeeting';

export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const group = searchParams.get('group');

  await connectDB();

  const query: Record<string, unknown> = { active: true };
  if (group) query.group = group;

  const meetings = await TeamMeeting.find(query).sort({ order: 1, createdAt: 1 });
  return Response.json({ meetings });
}
