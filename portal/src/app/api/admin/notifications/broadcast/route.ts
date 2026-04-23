import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { broadcastToAllEmployees } from '@/lib/notifications';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const schema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().max(2000).optional().or(z.literal('')),
  link: z.string().url().max(500).optional().or(z.literal('')),
  priority: z.enum(['normal', 'high']).default('high'),
});

// POST — admin sends a BOLO / priority notification to every set-up employee.
// Writes one Notification per recipient (so each has their own read state)
// and pushes to each recipient's private channel via Pusher.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    const { sentTo } = await broadcastToAllEmployees({
      title: data.title,
      body: data.body || undefined,
      link: data.link || undefined,
      priority: data.priority,
      actorName: admin.email,
      type: 'broadcast',
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      status: 'success',
      details: { context: 'notification_broadcast', sentTo, priority: data.priority },
    });

    return Response.json({ success: true, sentTo });
  } catch (error) {
    logger.error('Broadcast error', { error: String(error) });
    return Response.json({ error: 'Could not send broadcast.' }, { status: 500 });
  }
}
