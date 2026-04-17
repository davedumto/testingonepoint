import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser, setAuthCookie } from '@/lib/auth';
import User from '@/models/User';

export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email } = await req.json();

  if (!name || !email) {
    return Response.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 400 });
  }

  await connectDB();

  // Check if email is taken by another user
  if (email.toLowerCase() !== authUser.email.toLowerCase()) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: authUser.userId } });
    if (existing) {
      return Response.json({ error: 'This email is already in use.' }, { status: 409 });
    }
  }

  const user = await User.findByIdAndUpdate(
    authUser.userId,
    { name: name.trim(), email: email.toLowerCase().trim() },
    { new: true }
  );

  if (!user) return Response.json({ error: 'User not found.' }, { status: 404 });

  // Update the session cookie with new info
  await setAuthCookie({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
  });

  return Response.json({ success: true, user: { name: user.name, email: user.email } });
}
