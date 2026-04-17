import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;

interface AdminPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function getAdminUser(): Promise<AdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('op_admin')?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    if (payload.role !== 'admin') return null;
    return payload;
  } catch {
    return null;
  }
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('op_admin');
}
