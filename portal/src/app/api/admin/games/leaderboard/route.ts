import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import GameScore, { GAME_META, type GameKey } from '@/models/GameScore';
import LeaderboardSeason from '@/models/LeaderboardSeason';
import { getActiveSeason } from '@/lib/games/season';

// GET — admin leaderboard view. Top 10 per game in the requested season,
// or the active one if no ?seasonId is provided.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const seasonIdParam = url.searchParams.get('seasonId');

  await connectDB();
  const season = seasonIdParam && mongoose.isValidObjectId(seasonIdParam)
    ? await LeaderboardSeason.findById(seasonIdParam)
    : await getActiveSeason();

  if (!season) return Response.json({ season: null, boards: { trivia: [], typing: [], word: [], tictactoe: [] } });

  const boards: Record<GameKey, { userId: string; name: string; photoUrl?: string; score: number }[]> = {
    trivia: [], typing: [], word: [], tictactoe: [],
  };

  for (const game of Object.keys(GAME_META) as GameKey[]) {
    const mode = GAME_META[game].aggregation;
    const scoreExpr = mode === 'max' ? { $max: '$score' } : { $sum: '$score' };
    const rows = await GameScore.aggregate([
      { $match: { seasonId: season._id, game } },
      { $group: { _id: '$userId', name: { $last: '$userName' }, photoUrl: { $last: '$userPhotoUrl' }, score: scoreExpr } },
      { $sort: { score: -1 } },
      { $limit: 10 },
    ]);
    boards[game] = rows.map(r => ({
      userId: r._id.toString(),
      name: r.name,
      photoUrl: r.photoUrl,
      score: r.score,
    }));
  }

  return Response.json({
    season: {
      _id: season._id.toString(),
      name: season.name,
      startedAt: season.startedAt.toISOString(),
      endedAt: season.endedAt ? season.endedAt.toISOString() : null,
    },
    boards,
  });
}
