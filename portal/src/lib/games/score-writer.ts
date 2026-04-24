import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import GameScore, { type GameKey } from '@/models/GameScore';
import { getOrCreateActiveSeason } from '@/lib/games/season';

interface RecordScoreInput {
  userId: string;
  game: GameKey;
  score: number;
  dedupeKey?: string;
  meta?: Record<string, unknown>;
  actorName?: string;
}

// Writes a GameScore row into the active season, snapshotting the player's
// display name and photo so the leaderboard doesn't have to decrypt on
// every read. If dedupeKey is provided and a row already exists, we upsert
// (used by the word puzzle: one row per user per day, updated as they play).
export async function recordGameScore(input: RecordScoreInput): Promise<{ _id: string; score: number }> {
  await connectDB();
  const season = await getOrCreateActiveSeason(input.actorName || 'auto');

  const employee = await Employee.findById(input.userId);
  const name = (employee?.name || 'Teammate').trim() || 'Teammate';
  const photoUrl = employee?.photoUrl;

  if (input.dedupeKey) {
    const updated = await GameScore.findOneAndUpdate(
      { userId: new Types.ObjectId(input.userId), game: input.game, dedupeKey: input.dedupeKey },
      {
        $set: {
          userName: name,
          userPhotoUrl: photoUrl,
          score: input.score,
          seasonId: season._id,
          meta: input.meta,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true },
    );
    return { _id: updated._id.toString(), score: updated.score };
  }

  const doc = await GameScore.create({
    userId: new Types.ObjectId(input.userId),
    userName: name,
    userPhotoUrl: photoUrl,
    game: input.game,
    score: input.score,
    seasonId: season._id,
    meta: input.meta,
  });
  return { _id: doc._id.toString(), score: doc.score };
}
