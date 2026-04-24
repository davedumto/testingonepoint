import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import GameScore from '@/models/GameScore';
import { wordForDate } from '@/lib/games/word-pool';
import { scoreGuess, pointsForGuesses } from '@/lib/games/wordle-score';
import { recordGameScore } from '@/lib/games/score-writer';
import { getActiveSeason } from '@/lib/games/season';
import { safeValidate } from '@/lib/security/validation';

const schema = z.object({
  guess: z.string().min(5).max(5).regex(/^[A-Za-z]{5}$/, 'Must be 5 letters.'),
});

const MAX_GUESSES = 6;

// POST — submit one guess for today's puzzle. Server validates the attempt,
// updates the user's word session, and (on win or 6th miss) writes the
// final score. Returns the fresh list of scored guesses + solved flag.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    const guess = validation.data.guess.toUpperCase();

    await connectDB();
    const active = await getActiveSeason();
    if (!active) {
      return Response.json({
        error: 'No active season. Ask your admin to start one.',
        seasonEnded: true,
      }, { status: 409 });
    }

    const { word, dateKey } = wordForDate();

    const existing = await GameScore.findOne({
      userId: new Types.ObjectId(user.employeeId),
      game: 'word',
      dedupeKey: dateKey,
    });

    const meta = (existing?.meta || {}) as { guesses?: string[]; solved?: boolean };
    const guesses = meta.guesses || [];
    const alreadyDone = meta.solved || guesses.length >= MAX_GUESSES;
    if (alreadyDone) {
      return Response.json({ error: 'Puzzle already finished for today.' }, { status: 400 });
    }

    const nextGuesses = [...guesses, guess];
    const solved = word === guess;
    const done = solved || nextGuesses.length >= MAX_GUESSES;
    const finalScore = done ? (solved ? pointsForGuesses(nextGuesses.length) : 0) : 0;

    await recordGameScore({
      userId: user.employeeId,
      game: 'word',
      score: finalScore,
      dedupeKey: dateKey,
      actorName: user.email,
      meta: { guesses: nextGuesses, solved, done },
    });

    const scoredGuesses = nextGuesses.map(g => ({ guess: g, states: scoreGuess(word, g) }));

    return Response.json({
      guesses: scoredGuesses,
      solved,
      done,
      score: done ? finalScore : null,
      // Only reveal the word once the round is over, so players can see what
      // they missed (standard Wordle behavior).
      reveal: done && !solved ? word : undefined,
    });
  } catch {
    return Response.json({ error: 'Could not submit guess.' }, { status: 500 });
  }
}
