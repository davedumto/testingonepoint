import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TriviaQuestion from '@/models/TriviaQuestion';
import { recordGameScore } from '@/lib/games/score-writer';
import { getActiveSeason } from '@/lib/games/season';
import { safeValidate } from '@/lib/security/validation';

const schema = z.object({
  // Sent by the client from localStorage — the season that was active when
  // the round started. If the admin has since ended that season, we reject
  // so the score can't land in the wrong place.
  seasonId: z.string().refine(v => mongoose.isValidObjectId(v)),
  answers: z.array(z.object({
    questionId: z.string().refine(v => mongoose.isValidObjectId(v)),
    answerIndex: z.number().int().min(0).max(3),
    timeMs: z.number().int().min(0).max(10 * 60 * 1000),
  })).min(1).max(20),
});

const BASE_POINTS = 10;
const SPEED_MAX_BONUS = 10;
const SPEED_CEILING_MS = 20_000;

export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { seasonId, answers } = validation.data;

    await connectDB();
    const active = await getActiveSeason();
    if (!active || active._id.toString() !== seasonId) {
      return Response.json({
        error: 'The season has ended. Start a new round to play in the current one.',
        seasonEnded: true,
      }, { status: 409 });
    }

    const ids = answers.map(a => new mongoose.Types.ObjectId(a.questionId));
    const questions = await TriviaQuestion.find({ _id: { $in: ids } }).lean();
    const byId = new Map(questions.map(q => [q._id.toString(), q]));

    let score = 0;
    let correct = 0;
    for (const ans of answers) {
      const q = byId.get(ans.questionId);
      if (!q) continue;
      if (q.correctIndex !== ans.answerIndex) continue;
      correct++;
      const clamped = Math.min(ans.timeMs, SPEED_CEILING_MS);
      const speedBonus = Math.round(SPEED_MAX_BONUS * (1 - clamped / SPEED_CEILING_MS));
      score += BASE_POINTS + speedBonus;
    }

    const saved = await recordGameScore({
      userId: user.employeeId,
      game: 'trivia',
      score,
      actorName: user.email,
      meta: { correct, total: answers.length },
    });

    return Response.json({ success: true, score: saved.score, correct, total: answers.length });
  } catch {
    return Response.json({ error: 'Could not submit trivia score.' }, { status: 500 });
  }
}
