import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Policy from '@/models/Policy';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const policies = await Policy.find({ userId: user.userId, status: 'active' }).sort({ createdAt: -1 });

  return Response.json({ policies });
}
