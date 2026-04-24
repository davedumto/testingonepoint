import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import TriviaQuestion from '@/models/TriviaQuestion';

// DELETE — hard delete a trivia question. Cheap, no cascading effects
// since question ids aren't referenced elsewhere.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return Response.json({ error: 'Invalid id.' }, { status: 400 });

  await connectDB();
  const removed = await TriviaQuestion.findByIdAndDelete(id);
  if (!removed) return Response.json({ error: 'Question not found.' }, { status: 404 });

  return Response.json({ success: true });
}
