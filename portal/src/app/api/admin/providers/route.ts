import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import ProviderConfig from '@/models/ProviderConfig';
import { ALL_PROVIDERS, getProviderEnabledMap } from '@/lib/provider-config';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const map = await getProviderEnabledMap();
  const providers = ALL_PROVIDERS.map(p => ({ provider: p, enabled: map[p] }));
  return Response.json({ providers });
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { provider, enabled } = await req.json();
    if (!ALL_PROVIDERS.includes(provider)) {
      return Response.json({ error: 'Invalid provider.' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return Response.json({ error: 'enabled must be a boolean.' }, { status: 400 });
    }

    await connectDB();
    await ProviderConfig.findOneAndUpdate(
      { provider },
      { provider, enabled, updatedBy: admin.email, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      status: 'success',
      details: { action: 'provider_toggle', provider, enabled },
    });

    return Response.json({ success: true, provider, enabled });
  } catch (error) {
    logger.error('Provider toggle error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
