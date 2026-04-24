import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  const session = await getAuthUser();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await connectDB();
  // Fetch fresh profile so the dashboard always shows the latest tier + fields.
  const doc = await User.findById(session.userId);
  if (!doc) return Response.json({ error: 'User not found' }, { status: 404 });

  return Response.json({
    user: {
      userId: session.userId,
      email: doc.email,
      name: doc.name,
      firstName: doc.firstName,
      lastName: doc.lastName,
      phone: doc.phone,
      dateOfBirth: doc.dateOfBirth,
      address: doc.address,
      preferredContact: doc.preferredContact,
      businessName: doc.businessName,
      assignedAgent: doc.assignedAgent,
      tier: doc.tier,
      timezone: doc.timezone,
      role: doc.role,
    },
  });
}
