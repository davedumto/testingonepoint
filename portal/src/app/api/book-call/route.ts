import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import BookedCall from '@/models/BookedCall';
import { sendCallBooking } from '@/lib/ghl';
import { safeValidate, bookCallSchema } from '@/lib/security/validation';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const calls = await BookedCall.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(10);

  return Response.json({ calls });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(bookCallSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { topic, preferredDate, preferredTime, phone, notes } = validation.data;

  await connectDB();

  const call = await BookedCall.create({
    userId: user.userId,
    topic,
    preferredDate: new Date(preferredDate),
    preferredTime,
    phone,
    notes,
  });

  // Send to GHL (non-blocking)
  sendCallBooking(
    { name: user.name, email: user.email },
    topic, preferredDate, preferredTime, phone, notes
  ).catch(console.error);

  return Response.json({ success: true, call }, { status: 201 });
}
