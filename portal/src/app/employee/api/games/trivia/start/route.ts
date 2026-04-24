import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TriviaQuestion from '@/models/TriviaQuestion';
import { getActiveSeason } from '@/lib/games/season';

const ROUND_SIZE = 10;

// POST — draws 10 random active questions without the correct index and
// returns them alongside the active season id. The client stamps that
// seasonId into localStorage so a reload can resume the same round, and so
// /submit can reject if the admin has ended the season in the meantime.
export async function POST() {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const [questions, season] = await Promise.all([
    TriviaQuestion.aggregate([
      { $match: { active: true } },
      { $sample: { size: ROUND_SIZE } },
      { $project: { question: 1, options: 1, category: 1 } },
    ]),
    getActiveSeason(),
  ]);

  if (questions.length === 0) {
    return Response.json({ error: 'No trivia questions available yet.' }, { status: 503 });
  }
  if (!season) {
    return Response.json({ error: 'No active season. Ask your admin to start one.' }, { status: 503 });
  }

  return Response.json({
    seasonId: season._id.toString(),
    questions: questions.map(q => ({
      _id: q._id.toString(),
      question: q.question,
      options: q.options,
      category: q.category,
    })),
  });
}
