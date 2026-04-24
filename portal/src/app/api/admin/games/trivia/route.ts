import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import TriviaQuestion from '@/models/TriviaQuestion';
import { safeValidate } from '@/lib/security/validation';
import { TRIVIA_SEED } from '@/lib/games/trivia-seed';

const createSchema = z.object({
  question: z.string().min(5).max(500).trim(),
  options: z.array(z.string().min(1).max(200).trim()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  category: z.enum(['insurance', 'general', 'company', 'pop']).default('insurance'),
});

// GET — lists all trivia questions so admins can review/prune. Returns the
// full document including the correct index (admin view).
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const questions = await TriviaQuestion.find({}).sort({ createdAt: -1 }).lean();
  return Response.json({
    questions: questions.map(q => ({
      _id: q._id.toString(),
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      category: q.category,
      active: q.active,
      addedBy: q.addedBy,
      createdAt: q.createdAt.toISOString(),
    })),
  });
}

// POST — add a question.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(createSchema, body);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

  await connectDB();
  const q = await TriviaQuestion.create({
    ...validation.data,
    addedBy: admin.email,
  });
  return Response.json({ question: {
    _id: q._id.toString(),
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    category: q.category,
    active: q.active,
  } });
}

// PUT — one-shot seed. Inserts the starter bank if the collection is empty,
// otherwise returns the current count. Safe to click twice.
export async function PUT() {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const existingCount = await TriviaQuestion.countDocuments({});
  if (existingCount > 0) {
    return Response.json({ skipped: true, count: existingCount });
  }

  const docs = TRIVIA_SEED.map(q => ({ ...q, addedBy: admin.email, active: true }));
  const created = await TriviaQuestion.insertMany(docs);
  return Response.json({ seeded: true, count: created.length });
}
