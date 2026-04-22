import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import OAuthEvent from '@/models/EmployeeAuth';
import AccessRequest from '@/models/AccessRequest';
import { ALL_PROVIDERS, getProviderEnabledMap } from '@/lib/provider-config';

// GET /employee/api/oauth/status — auth status per provider for current employee.
// Only returns providers the admin has enabled on the App Gateway.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const enabledMap = await getProviderEnabledMap();
  const providers = ALL_PROVIDERS.filter(p => enabledMap[p]);

  const status = await Promise.all(
    providers.map(async (provider) => {
      const lastAuth = await OAuthEvent.findOne(
        { userId: user.userId, provider, status: 'completed' },
        { authenticatedAt: 1 }
      ).sort({ authenticatedAt: -1 });

      const accessRequest = await AccessRequest.findOne(
        { userId: user.userId, provider },
      ).sort({ requestedAt: -1 });

      return {
        provider,
        accessStatus: accessRequest?.status || 'none',
        lastAuthenticated: lastAuth?.authenticatedAt || null,
        hasAccess: accessRequest?.status === 'approved',
      };
    })
  );

  return Response.json({ status });
}
