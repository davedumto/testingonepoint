import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// POST /api/admin/clients/[id]/assign-agent — admin sets the assigned agent
// on a client. Free-text 'null' or empty clears the assignment.
const schema = z.object({
  assignedAgent: z.enum(['alex', 'vera', 'team']).nullable().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    await connectDB();

    const user = await User.findOne({ _id: id, role: 'client' });
    if (!user) return Response.json({ error: 'Client not found.' }, { status: 404 });

    user.assignedAgent = validation.data.assignedAgent || undefined;
    await user.save();

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'admin_agent_assigned', clientId: id, assignedAgent: user.assignedAgent },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Admin assign agent error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
