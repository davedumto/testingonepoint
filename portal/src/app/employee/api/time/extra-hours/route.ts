import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import ExtraHoursRequest from '@/models/ExtraHoursRequest';

// GET — employee's own extra hours requests
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const requests = await ExtraHoursRequest.find({ userId: user.userId }).sort({ createdAt: -1 });
  return Response.json({ requests });
}

// POST — employee requests extra hours (weekends)
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestedDate, startTime, endTime, hoursRequested, reason } = await req.json();

  if (!requestedDate || !startTime || !endTime || !hoursRequested || !reason) {
    return Response.json({ error: 'All fields are required.' }, { status: 400 });
  }

  await connectDB();

  // Check for duplicate request on same date
  const existing = await ExtraHoursRequest.findOne({
    userId: user.userId,
    requestedDate: new Date(requestedDate),
    status: { $in: ['pending', 'approved'] },
  });

  if (existing) {
    return Response.json({ error: 'You already have a request for this date.' }, { status: 409 });
  }

  const request = await ExtraHoursRequest.create({
    userId: user.userId,
    userEmail: user.email,
    userName: user.name,
    requestedDate: new Date(requestedDate),
    startTime,
    endTime,
    hoursRequested,
    reason,
  });

  return Response.json({ success: true, request }, { status: 201 });
}
