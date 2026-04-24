import LeaderboardSeason, { type ILeaderboardSeason } from '@/models/LeaderboardSeason';
import { connectDB } from '@/lib/db';

// Fetches the currently-active season, creating a default one the first time
// if none exists. This lets employees start playing immediately without
// waiting for an admin to hit "start season."
export async function getOrCreateActiveSeason(
  actorName = 'system',
): Promise<ILeaderboardSeason> {
  await connectDB();
  let season = await LeaderboardSeason.findOne({ endedAt: { $exists: false } });
  if (season) return season;

  const year = new Date().getUTCFullYear();
  season = await LeaderboardSeason.create({
    name: `Season ${year}`,
    startedBy: actorName,
    startedAt: new Date(),
  });
  return season;
}

// Returns the active season or null without creating. Used by read APIs so
// we don't implicitly start a season on simple GETs.
export async function getActiveSeason(): Promise<ILeaderboardSeason | null> {
  await connectDB();
  return LeaderboardSeason.findOne({ endedAt: { $exists: false } });
}
