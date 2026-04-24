import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import EmployeeOfMonth from '@/models/EmployeeOfMonth';
import { broadcastToAllEmployees } from '@/lib/notifications';
import { publishHubChanged } from '@/lib/pusher/server';
import { safeValidate } from '@/lib/security/validation';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

const announceSchema = z.object({
  employeeId: z.string().refine(v => mongoose.isValidObjectId(v), 'Invalid employeeId'),
  message: z.string().max(500).optional().or(z.literal('')),
});

// GET — admin fetches current active winner + history list for the admin page.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const now = new Date();

  const [active, history] = await Promise.all([
    EmployeeOfMonth.findOne({ expiresAt: { $gt: now } }).sort({ publishedAt: -1 }).lean(),
    EmployeeOfMonth.find({}).sort({ publishedAt: -1 }).limit(12).lean(),
  ]);

  return Response.json({
    active: active ? serialize(active) : null,
    history: history.map(serialize),
  });
}

// POST — announce a new Employee of the Month. Creates the EOTM record and
// fans out a notification to every set-up employee. The newest record wins
// the "active" slot on the dashboard until its 24h window expires.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { ip, userAgent } = getRequestInfo(req);

  try {
    const body = await req.json();
    const validation = safeValidate(announceSchema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { employeeId, message } = validation.data;

    await connectDB();

    const employee = await Employee.findById(employeeId);
    if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });
    if (!employee.isSetup) return Response.json({ error: 'Employee has not set up their account yet.' }, { status: 400 });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACTIVE_WINDOW_MS);
    const employeeName = (employee.name || '').trim() || 'A teammate';

    const record = await EmployeeOfMonth.create({
      employeeId: employee._id,
      employeeName,
      employeePhotoUrl: employee.photoUrl,
      message: message || undefined,
      announcedBy: admin.email,
      publishedAt: now,
      expiresAt,
    });

    // Fan out a notification so everyone has a receipt once the banner expires.
    const { sentTo } = await broadcastToAllEmployees({
      type: 'announcement',
      priority: 'high',
      title: `🏆 ${employeeName} is Employee of the Month!`,
      body: message || `Give ${employeeName.split(' ')[0]} a huge round of applause for the great work this month.`,
      actorName: admin.email,
    });

    // Push a hub invalidation so every open dashboard refetches the active
    // EOTM record and the celebration banner appears live, without needing
    // the employee to refresh the page.
    await publishHubChanged('recognition');

    auditLog({
      userId: admin.userId,
      userEmail: admin.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.ADMIN_ACTION,
      status: 'success',
      details: { context: 'eotm_announce', employeeId: employee._id.toString(), sentTo, recordId: record._id.toString() },
    });

    return Response.json({ success: true, record: serialize(record.toObject()), sentTo });
  } catch (error) {
    logger.error('EOTM announce error', { error: String(error) });
    return Response.json({ error: 'Could not announce Employee of the Month.' }, { status: 500 });
  }
}

// Shape returned to the admin UI. Dates serialize as ISO strings so the client
// can new Date() them safely.
type EOTMLean = {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeePhotoUrl?: string;
  message?: string;
  announcedBy: string;
  publishedAt: Date;
  expiresAt: Date;
};

function serialize(doc: EOTMLean) {
  return {
    _id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    employeeName: doc.employeeName,
    employeePhotoUrl: doc.employeePhotoUrl,
    message: doc.message,
    announcedBy: doc.announcedBy,
    publishedAt: doc.publishedAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}
