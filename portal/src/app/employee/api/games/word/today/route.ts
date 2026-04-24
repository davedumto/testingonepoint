import { Types } from 'mongoose';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import GameScore from '@/models/GameScore';
import { wordForDate } from '@/lib/games/word-pool';
import { scoreGuess } from '@/lib/games/wordle-score';

// GET — today's puzzle state for this employee. Returns the guesses they've
// already made today (and whether they've solved it) so the client can
// rebuild the grid on reload. Never returns the secret word.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { word, dateKey } = wordForDate();

  const existing = await GameScore.findOne({
    userId: new Types.ObjectId(user.employeeId),
    game: 'word',
    dedupeKey: dateKey,
  });

  const meta = (existing?.meta || {}) as { guesses?: string[]; solved?: boolean };
  const guesses = meta.guesses || [];
  const solved = !!meta.solved;

  // Return each prior guess with its score line so the client can render the
  // grid exactly as the server sees it (no client-side re-scoring of the
  // secret, because we never reveal it).
  const scoredGuesses = guesses.map(g => ({ guess: g, states: scoreGuess(word, g) }));

  return Response.json({
    dateKey,
    wordLength: 5,
    maxGuesses: 6,
    guesses: scoredGuesses,
    solved,
    done: solved || guesses.length >= 6,
    score: existing?.score ?? null,
  });
}
