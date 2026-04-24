import { getEmployeeUser } from '@/lib/employee-auth';
import { TYPING_PROMPTS, promptForIndex } from '@/lib/games/typing-prompts';
import { getActiveSeason } from '@/lib/games/season';

// GET — picks a random prompt + returns the active season id. Client stamps
// seasonId into localStorage so a reload resumes the same round and /submit
// can reject if the admin has ended the season.
export async function GET() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const season = await getActiveSeason();
  if (!season) {
    return Response.json({ error: 'No active season. Ask your admin to start one.' }, { status: 503 });
  }

  const index = Math.floor(Math.random() * TYPING_PROMPTS.length);
  return Response.json({
    seasonId: season._id.toString(),
    index,
    prompt: promptForIndex(index),
  });
}
