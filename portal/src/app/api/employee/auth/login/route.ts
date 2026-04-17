import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { setEmployeeCookie } from '@/lib/employee-auth';
import Employee from '@/models/Employee';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { isAccountLocked, recordFailedLogin, clearLoginAttempts } from '@/lib/security/account-lockout';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';

// POST — two-phase: check email exists, then login with password
export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);
  const { email, password, phase } = await req.json();

  if (!email) return Response.json({ error: 'Email is required.' }, { status: 400 });

  // Rate limit
  const rateKey = getRateLimitKey(ip, 'employee-login');
  const rateResult = checkRateLimit(rateKey, RATE_LIMITS.login);
  if (!rateResult.allowed) {
    auditLog({ ipAddress: ip, userAgent, action: AUDIT_ACTIONS.RATE_LIMIT_HIT, status: 'failure', severity: 'warning', details: { endpoint: 'employee-login' } });
    return Response.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  await connectDB();
  const employee = await Employee.findOne({ email: email.toLowerCase().trim() });

  // Phase 1: just check if email exists and what state it's in
  if (phase === 'check') {
    if (!employee) {
      return Response.json({ error: 'This email is not registered as an employee. Contact your admin.' }, { status: 404 });
    }

    if (!employee.isSetup) {
      return Response.json({ status: 'needs_setup', message: 'Set up your password to continue.' });
    }

    return Response.json({ status: 'has_password', message: 'Enter your password.' });
  }

  // Phase 2: actual login
  if (!password) return Response.json({ error: 'Password is required.' }, { status: 400 });
  if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

  // Account lockout check
  const locked = await isAccountLocked(email);
  if (locked) {
    auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', severity: 'critical', details: { reason: 'account_locked', portal: 'employee' } });
    return Response.json({ error: 'Account is locked. Contact your administrator.' }, { status: 423 });
  }

  if (!employee.isSetup || !employee.password) {
    return Response.json({ error: 'Please set up your password first.' }, { status: 400 });
  }

  const isMatch = await employee.comparePassword(password);
  if (!isMatch) {
    const lockResult = await recordFailedLogin(email);
    if (lockResult.locked) {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.ACCOUNT_LOCKED, status: 'failure', severity: 'critical', details: { portal: 'employee' } });
    } else {
      auditLog({ userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN_FAILED, status: 'failure', details: { attemptsLeft: lockResult.attemptsLeft, portal: 'employee' } });
    }
    return Response.json({ error: 'Invalid password.' }, { status: 401 });
  }

  // Success
  await clearLoginAttempts(email);
  employee.lastLogin = new Date();
  await employee.save();

  const empId = employee._id.toString();
  await setEmployeeCookie({
    employeeId: empId,
    userId: empId,
    email: employee.email,
    name: employee.name || employee.email.split('@')[0],
  });

  auditLog({ userId: employee._id.toString(), userEmail: email, ipAddress: ip, userAgent, action: AUDIT_ACTIONS.LOGIN, status: 'success', details: { portal: 'employee' } });

  return Response.json({
    success: true,
    employee: { name: employee.name, email: employee.email },
  });
}
