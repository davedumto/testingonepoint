import { getEmployeeUser } from '@/lib/employee-auth';
import { getActiveSeason } from '@/lib/games/season';

// GET — returns the currently active leaderboard season, or null if the
// admin hasn't started one yet. Employees can still play; scores just
// don't tie to a season until one exists.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const season = await getActiveSeason();
  return Response.json({
    season: season ? {
      _id: season._id.toString(),
      name: season.name,
      startedAt: season.startedAt.toISOString(),
    } : null,
  });
}
