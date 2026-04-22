import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import AccessRequest from '@/models/AccessRequest';
import { initiateAuth } from '@/lib/oauth-handlers/ghl-handler';
import { isProviderEnabled } from '@/lib/provider-config';
import { logger } from '@/lib/logger';

// GET /employee/api/oauth/ghl — initiates GHL OAuth flow
export async function GET(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isProviderEnabled('ghl'))) {
    return Response.json({ error: 'This app is not available right now.' }, { status: 403 });
  }

  await connectDB();

  // Check if employee has approved access
  const approved = await AccessRequest.findOne({
    userId: user.userId,
    provider: 'ghl',
    status: 'approved',
  });

  if (!approved) {
    return Response.json({ error: 'Access not approved. Please request access first.' }, { status: 403 });
  }

  try {
    const authorizeUrl = await initiateAuth(user.userId, user.email);
    return Response.redirect(authorizeUrl);
  } catch (error) {
    logger.error('GHL OAuth initiation error', { error: String(error) });
    return Response.json({ error: 'Failed to initiate GHL authentication.' }, { status: 500 });
  }
}
