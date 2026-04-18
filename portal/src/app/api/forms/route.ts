import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import PendingQuote from '@/models/PendingQuote';
import { sendFormSubmission } from '@/lib/ghl';
import { safeValidate, formSubmitSchema } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// Get all pending/incomplete quotes for the user
export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const quotes = await PendingQuote.find({
    userId: user.userId,
    status: { $in: ['incomplete', 'submitted', 'in_review'] },
  }).sort({ updatedAt: -1 });

  return Response.json({ quotes });
}

// Save/update a form (partial or complete)
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(formSubmitSchema, body);
  if (!validation.success) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
  const { quoteId, productName, productCategory, formData, submit } = validation.data;

  await connectDB();

  const status = submit ? 'submitted' : 'incomplete';

  let quote;
  if (quoteId) {
    quote = await PendingQuote.findOneAndUpdate(
      { _id: quoteId, userId: user.userId },
      { formData, status, updatedAt: new Date() },
      { new: true }
    );
  } else {
    quote = await PendingQuote.create({
      userId: user.userId,
      productName,
      productCategory,
      formData: formData || {},
      status,
    });
  }

  // If submitting, send to GHL
  if (submit && quote) {
    sendFormSubmission(
      { name: user.name, email: user.email },
      productName,
      formData || {}
    ).catch((err) => logger.error('Form submission GHL error', { error: String(err) }));
  }

  return Response.json({ success: true, quote }, { status: quoteId ? 200 : 201 });
}
