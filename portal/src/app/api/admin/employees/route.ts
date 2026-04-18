import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { isValidTimezone } from '@/lib/timezones';
import { hmacEmail } from '@/lib/security/encryption';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// GET — list all employees
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);
  const rateResult = await checkRateLimit(getRateLimitKey(ip, 'admin-employees'), RATE_LIMITS.adminList);
  if (!rateResult.allowed) return Response.json({ error: 'Too many requests.' }, { status: 429 });

  await connectDB();
  const employees = await Employee.find({}, { password: 0 }).sort({ addedAt: -1 });

  auditLog({ userId: admin.userId, userEmail: admin.email, ipAddress: ip, userAgent, action: 'admin.data_viewed', status: 'success', targetResource: 'employees', details: { resultCount: employees.length } });

  return Response.json({ employees });
}

// POST — admin adds an employee email
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = await req.json();
  if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return Response.json({ error: 'Invalid email.' }, { status: 400 });

  await connectDB();

  const existing = await Employee.findOne({ hmacEmail: hmacEmail(email) });
  if (existing) return Response.json({ error: 'Employee already exists.' }, { status: 409 });

  const employee = await Employee.create({
    email: email.toLowerCase().trim(),
    addedBy: admin.email,
    isSetup: false,
  });

  return Response.json({ success: true, employee: { _id: employee._id, email: employee.email } }, { status: 201 });
}

// PUT — admin updates employee timezone
export async function PUT(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, timezone } = await req.json();
  if (!id || !timezone) return Response.json({ error: 'Employee ID and timezone required.' }, { status: 400 });
  if (!isValidTimezone(timezone)) return Response.json({ error: 'Invalid timezone.' }, { status: 400 });

  await connectDB();
  const employee = await Employee.findByIdAndUpdate(id, { timezone }, { new: true, select: '-password' });
  if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

  return Response.json({ success: true, employee });
}

// DELETE — admin removes an employee
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Employee ID required.' }, { status: 400 });

  await connectDB();
  await Employee.findByIdAndDelete(id);

  return Response.json({ success: true });
}
