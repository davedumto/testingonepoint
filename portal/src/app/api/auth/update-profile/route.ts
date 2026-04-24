import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { getAuthUser, setAuthCookie } from '@/lib/auth';
import User from '@/models/User';
import { hmacEmail } from '@/lib/security/encryption';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// Phase 0 client profile schema. Empty strings clear optional fields.
const schema = z.object({
  firstName: z.string().min(1).max(80).trim(),
  lastName: z.string().max(80).trim().optional().or(z.literal('')),
  email: z.string().email().max(255).toLowerCase().trim(),
  phone: z.string().max(40).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  address: z.object({
    street: z.string().max(200).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    state: z.string().max(60).optional().or(z.literal('')),
    zip: z.string().max(20).optional().or(z.literal('')),
  }).optional(),
  preferredContact: z.enum(['call', 'text', 'email']).optional(),
  businessName: z.string().max(200).optional().or(z.literal('')),
});

export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const data = validation.data;

    await connectDB();

    // Email change collision check (only if email actually changing)
    if (data.email !== authUser.email.toLowerCase()) {
      const existing = await User.findOne({ hmacEmail: hmacEmail(data.email), _id: { $ne: authUser.userId } });
      if (existing) return Response.json({ error: 'This email is already in use.' }, { status: 409 });
    }

    const user = await User.findById(authUser.userId);
    if (!user) return Response.json({ error: 'User not found.' }, { status: 404 });

    // Required fields
    user.firstName = data.firstName;
    user.lastName = data.lastName || undefined;
    user.email = data.email;
    // hmacEmail is recomputed in pre-save when email changes

    // Optional fields — empty string clears
    if (data.phone !== undefined) user.phone = data.phone || undefined;
    if (data.dateOfBirth !== undefined) user.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : undefined;
    if (data.preferredContact !== undefined) user.preferredContact = data.preferredContact;
    if (data.businessName !== undefined) user.businessName = data.businessName || undefined;

    if (data.address) {
      const a = data.address;
      const hasAny = a.street || a.city || a.state || a.zip;
      user.address = hasAny ? {
        street: a.street || undefined,
        city: a.city || undefined,
        state: a.state || undefined,
        zip: a.zip || undefined,
      } : undefined;
    }

    await user.save();

    // Refresh JWT so cookie carries the latest combined name
    await setAuthCookie({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Client update-profile error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
