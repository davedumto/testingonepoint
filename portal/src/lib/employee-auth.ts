import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_NAME = 'op_employee';
const MAX_AGE = 60 * 60 * 8; // 8 hours (work shift)

interface EmployeePayload {
  employeeId: string;
  userId: string; // alias for employeeId — keeps API route code consistent with client auth
  email: string;
  name: string;
}

export function signEmployeeToken(payload: EmployeePayload): string {
  return jwt.sign({ ...payload, role: 'employee' }, JWT_SECRET, { expiresIn: MAX_AGE });
}

export async function setEmployeeCookie(payload: EmployeePayload) {
  const token = signEmployeeToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function getEmployeeUser(): Promise<EmployeePayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as EmployeePayload & { role: string };
    if (payload.role !== 'employee') return null;
    return { ...payload, userId: payload.employeeId };
  } catch {
    return null;
  }
}

export async function clearEmployeeCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}
