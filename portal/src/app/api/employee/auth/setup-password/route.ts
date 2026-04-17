import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { setEmployeeCookie } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// POST — employee sets their password for the first time
export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  // Rate limit
  const rateKey = getRateLimitKey(ip, 'employee-setup');
  const rateResult = checkRateLimit(rateKey, RATE_LIMITS.signup);
  if (!rateResult.allowed) {
    return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const { email, password, name } = await req.json();

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  await connectDB();
  const employee = await Employee.findOne({ email: email.toLowerCase().trim() });

  if (!employee) {
    return Response.json({ error: 'Employee not found. Contact your admin.' }, { status: 404 });
  }

  if (employee.isSetup) {
    return Response.json({ error: 'Password already set. Use login instead.' }, { status: 409 });
  }

  employee.password = password; // Hashed by pre-save hook
  employee.name = name?.trim() || employee.email.split('@')[0];
  employee.isSetup = true;
  employee.lastLogin = new Date();
  await employee.save();

  const empId = employee._id.toString();
  await setEmployeeCookie({
    employeeId: empId,
    userId: empId,
    email: employee.email,
    name: employee.name,
  });

  auditLog({ userId: employee._id.toString(), userEmail: employee.email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.SIGNUP, status: 'success', details: { portal: 'employee', type: 'password_setup' } });

  return Response.json({
    success: true,
    employee: { name: employee.name, email: employee.email },
  });
}
