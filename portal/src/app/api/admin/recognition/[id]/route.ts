import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import EmployeeOfMonth from '@/models/EmployeeOfMonth';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

// DELETE — admin removes an Employee of the Month record. If the record is
// currently active, deleting it clears the banner from every employee's
// dashboard on their next load. Past broadcast notifications stay intact
// (they're per-employee receipts of an event that actually happened).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

    await connectDB();

    const record = await EmployeeOfMonth.findByIdAndDelete(id);
    if (!record) return Response.json({ error: 'Record not found.' }, { status: 404 });

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      status: 'success',
      details: {
        context: 'eotm_delete',
        recordId: id,
        employeeId: record.employeeId.toString(),
        wasActive: record.expiresAt.getTime() > Date.now(),
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('EOTM delete error', { error: String(error) });
    return Response.json({ error: 'Could not delete record.' }, { status: 500 });
  }
}
