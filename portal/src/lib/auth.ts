import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_NAME = 'op_session';
// 20 min of inactivity. The cookie is refreshed on every authenticated
// server call (see getAuthUser), so any activity keeps the session alive.
const MAX_AGE = 60 * 20;

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(payload: TokenPayload) {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

// Sliding session: every call to getAuthUser re-issues the cookie with a
// fresh 20-min window. No activity for 20 min → cookie expires → next call
// returns null → layout redirects to /login.
export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const fresh = jwt.sign(
    { userId: payload.userId, email: payload.email, name: payload.name },
    JWT_SECRET,
    { expiresIn: MAX_AGE },
  );
  cookieStore.set(TOKEN_NAME, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
  return payload;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}
