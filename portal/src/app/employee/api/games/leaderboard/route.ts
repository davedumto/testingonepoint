import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import GameScore, { GAME_META, type GameKey } from '@/models/GameScore';
import { getActiveSeason } from '@/lib/games/season';

interface LeaderRow {
  userId: string;
  name: string;
  photoUrl?: string;
  score: number;
}

// GET — top 3 per game for the active season. We aggregate according to
// each game's configured mode ('max' or 'sum') so trivia/typing show
// best-single while word/tictactoe show totals.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const season = await getActiveSeason();
  if (!season) {
    return Response.json({ season: null, boards: emptyBoards() });
  }

  const boards: Record<GameKey, LeaderRow[]> = { trivia: [], typing: [], word: [], tictactoe: [] };

  for (const game of Object.keys(GAME_META) as GameKey[]) {
    const mode = GAME_META[game].aggregation;
    const scoreExpr = mode === 'max' ? { $max: '$score' } : { $sum: '$score' };

    const rows = await GameScore.aggregate([
      { $match: { seasonId: season._id, game } },
      {
        $group: {
          _id: '$userId',
          name: { $last: '$userName' },
          photoUrl: { $last: '$userPhotoUrl' },
          score: scoreExpr,
        },
      },
      { $sort: { score: -1 } },
      { $limit: 3 },
    ]);

    boards[game] = rows.map(r => ({
      userId: r._id.toString(),
      name: r.name,
      photoUrl: r.photoUrl,
      score: r.score,
    }));
  }

  return Response.json({
    season: { _id: season._id.toString(), name: season.name, startedAt: season.startedAt.toISOString() },
    boards,
  });
}

function emptyBoards(): Record<GameKey, LeaderRow[]> {
  return { trivia: [], typing: [], word: [], tictactoe: [] };
}
