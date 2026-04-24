import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import TicTacToeGame from '@/models/TicTacToeGame';
import { generateRoomCode } from '@/lib/games/tictactoe';
import { safeValidate } from '@/lib/security/validation';

// Only odd best-of values are allowed so a match always has a winner.
const ALLOWED_BEST_OF = [1, 3, 5, 7] as const;

const schema = z.object({
  bestOf: z.number().int().refine(
    (n): n is typeof ALLOWED_BEST_OF[number] => (ALLOWED_BEST_OF as readonly number[]).includes(n),
    'Best-of must be 1, 3, 5, or 7.',
  ).optional(),
});

// POST — creates a new Tic-Tac-Toe room with the caller as player X. Accepts
// an optional bestOf (1/3/5/7) so the creator can pick match length. Room
// starts in 'waiting' until another employee joins.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Body is optional — empty request still works and gets the 3-round default.
  let bestOf: number = 3;
  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
    if (validation.data.bestOf) bestOf = validation.data.bestOf;
  } catch { /* no body, keep default */ }

  await connectDB();
  const employee = await Employee.findById(user.employeeId);
  if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

  // Retry on rare code collisions. 5 attempts is overkill for 6-char codes.
  let room;
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = generateRoomCode();
    try {
      room = await TicTacToeGame.create({
        roomCode,
        playerX: {
          userId: new Types.ObjectId(user.employeeId),
          name: (employee.name || '').trim() || 'Teammate',
          photoUrl: employee.photoUrl,
        },
        status: 'waiting',
        bestOf,
      });
      break;
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 11000) continue;
      throw err;
    }
  }

  if (!room) return Response.json({ error: 'Could not create room.' }, { status: 500 });

  return Response.json({ roomCode: room.roomCode, bestOf });
}
