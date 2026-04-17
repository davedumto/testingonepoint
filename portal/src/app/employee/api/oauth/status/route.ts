import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import OAuthEvent from '@/models/EmployeeAuth';
import AccessRequest from '@/models/AccessRequest';

// GET /employee/api/oauth/status — returns auth status for all providers for current user
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const providers = ['ghl', 'canva', 'lastpass', 'microsoft'] as const;

  const status = await Promise.all(
    providers.map(async (provider) => {
      // Get latest auth event
      const lastAuth = await OAuthEvent.findOne(
        { userId: user.userId, provider, status: 'completed' },
        { authenticatedAt: 1 }
      ).sort({ authenticatedAt: -1 });

      // Get access request status
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
