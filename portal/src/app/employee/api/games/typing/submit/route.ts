import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { recordGameScore } from '@/lib/games/score-writer';
import { getActiveSeason } from '@/lib/games/season';
import { safeValidate } from '@/lib/security/validation';
import { promptForIndex, TYPING_PROMPTS } from '@/lib/games/typing-prompts';

const schema = z.object({
  seasonId: z.string().refine(v => mongoose.isValidObjectId(v)),
  index: z.number().int().min(0).max(TYPING_PROMPTS.length),
  typedText: z.string().max(4000),
  elapsedMs: z.number().int().min(1000).max(5 * 60 * 1000),
});

// POST — grade the attempt server-side, gated on the session's original
// season still being active. Scoring is WPM × accuracy so higher accuracy
// wins ties cleanly.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const { seasonId, index, typedText, elapsedMs } = validation.data;

    const active = await getActiveSeason();
    if (!active || active._id.toString() !== seasonId) {
      return Response.json({
        error: 'The season has ended. Start a new round to play in the current one.',
        seasonEnded: true,
      }, { status: 409 });
    }

    const prompt = promptForIndex(index);
    const { wpm, accuracy, rawScore } = gradeTypingAttempt(prompt, typedText, elapsedMs);

    const saved = await recordGameScore({
      userId: user.employeeId,
      game: 'typing',
      score: rawScore,
      actorName: user.email,
      meta: { wpm, accuracy, elapsedMs },
    });

    return Response.json({ success: true, score: saved.score, wpm, accuracy });
  } catch {
    return Response.json({ error: 'Could not submit typing score.' }, { status: 500 });
  }
}

function gradeTypingAttempt(prompt: string, typed: string, elapsedMs: number) {
  const minutes = Math.max(elapsedMs / 60_000, 1 / 60_000);
  const compareLen = Math.min(prompt.length, typed.length);

  let correctChars = 0;
  for (let i = 0; i < compareLen; i++) {
    if (prompt[i] === typed[i]) correctChars++;
  }

  // Penalize text that stopped short of the prompt so a 10%-completed-but-
  // -perfect attempt doesn't score like a full-length perfect one.
  const denominator = Math.max(typed.length, Math.floor(prompt.length / 2));
  const accuracy = denominator === 0 ? 0 : correctChars / denominator;
  const wpm = Math.round((typed.length / 5) / minutes);
  const rawScore = Math.max(0, Math.round(wpm * accuracy));
  return { wpm, accuracy: Math.round(accuracy * 100), rawScore };
}
