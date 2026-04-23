import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Types } from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Suggestion from '@/models/Suggestion';
import Employee from '@/models/Employee';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { dispatch } from '@/lib/notifications';
import { logger } from '@/lib/logger';

const schema = z.object({
  assigneeId: z.string().min(1),
});

// POST — admin tags an employee to act on a suggestion. Spawns a notification
// for the tagged employee with a deep link back to the admin suggestions page
// (for admin tags) or the suggestion detail when we build an employee-facing view.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { assigneeId } = validation.data;

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(assigneeId)) {
      return Response.json({ error: 'Invalid ids.' }, { status: 400 });
    }

    await connectDB();

    const [suggestion, assignee] = await Promise.all([
      Suggestion.findById(id),
      Employee.findById(assigneeId).select('name email isSetup'),
    ]);
    if (!suggestion) return Response.json({ error: 'Suggestion not found.' }, { status: 404 });
    if (!assignee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

    suggestion.assignedTo = assignee._id;
    suggestion.assignedAt = new Date();
    suggestion.assignedBy = admin.email;
    // Auto-advance from 'new' → 'reviewing' when assigned (common workflow shortcut).
    if (suggestion.status === 'new') suggestion.status = 'reviewing';
    await suggestion.save();

    // Fire the notification. Link points to a suggestion-focused URL; for now the
    // employee view is just the admin page (employees can't access /admin), so we
    // link back to the team hub with the suggestion id as an anchor. A dedicated
    // employee "my tasks" view is a natural follow-up.
    await dispatch({
      userId: assignee._id,
      type: 'mention',
      title: `You were tagged on a suggestion`,
      body: suggestion.message.length > 280 ? suggestion.message.slice(0, 280) + '…' : suggestion.message,
      link: `/employee/dashboard/notifications`,
      priority: 'high',
      actorName: admin.email,
    });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      status: 'success',
      details: { context: 'suggestion_assign', suggestionId: id, assigneeId },
    });

    return Response.json({ success: true, suggestion });
  } catch (error) {
    logger.error('Suggestion assign error', { error: String(error) });
    return Response.json({ error: 'Could not assign.' }, { status: 500 });
  }
}
