import { getEmployeeUser } from '@/lib/employee-auth';
import { initiateAuth } from '@/lib/oauth-handlers/ghl-handler';
import { isProviderEnabled } from '@/lib/provider-config';
import { logger } from '@/lib/logger';

// GET /employee/api/oauth/ghl — initiates the GHL OAuth flow. Any
// authenticated employee can click through and authenticate directly; no
// admin approval step.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isProviderEnabled('ghl'))) {
    return Response.json({ error: 'This app is not available right now.' }, { status: 403 });
  }

  try {
    const authorizeUrl = await initiateAuth(user.userId, user.email);
    return Response.redirect(authorizeUrl);
  } catch (error) {
    logger.error('GHL OAuth initiation error', { error: String(error) });
    return Response.json({ error: 'Failed to initiate GHL authentication.' }, { status: 500 });
  }
}
