import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import AccessRequest from '@/models/AccessRequest';
import { initiateAuth } from '@/lib/oauth-handlers/microsoft-handler';
import { logger } from '@/lib/logger';

export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const approved = await AccessRequest.findOne({ userId: user.userId, provider: 'microsoft', status: 'approved' });
  if (!approved) return Response.json({ error: 'Access not approved.' }, { status: 403 });

  try {
    const url = await initiateAuth(user.userId, user.email);
    return Response.redirect(url);
  } catch (error) {
    logger.error('Microsoft OAuth error', { error: String(error) });
    return Response.json({ error: 'Failed to initiate.' }, { status: 500 });
  }
}
