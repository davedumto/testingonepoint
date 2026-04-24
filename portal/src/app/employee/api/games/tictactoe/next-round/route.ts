import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TicTacToeGame from '@/models/TicTacToeGame';
import { publish } from '@/lib/pusher/server';
import { serializeRoom, ticTacToeChannel } from '@/lib/games/tictactoe';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

const schema = z.object({
  roomCode: z.string().min(4).max(10).transform(v => v.toUpperCase().trim()),
});

// POST — advance from 'round_ended' to a fresh board for the next round.
// Idempotent: if a second click arrives after the round already advanced,
// we just re-broadcast the current state.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(schema, body);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
  const { roomCode } = validation.data;

  await connectDB();
  const room = await TicTacToeGame.findOne({ roomCode });
  if (!room) return Response.json({ error: 'Room not found.' }, { status: 404 });
  if (!room.playerO) return Response.json({ error: 'No second player.' }, { status: 409 });

  // Backfill for pre-best-of-N rooms (see move/route.ts for the same pattern).
  if (typeof room.bestOf !== 'number') room.bestOf = 3;
  if (typeof room.roundNumber !== 'number') room.roundNumber = 1;
  if (typeof room.matchScoreX !== 'number') room.matchScoreX = 0;
  if (typeof room.matchScoreO !== 'number') room.matchScoreO = 0;

  const isPlayer = [room.playerX.userId.toString(), room.playerO.userId.toString()].includes(user.employeeId);
  if (!isPlayer) return Response.json({ error: 'You are not in this room.' }, { status: 403 });

  if (room.status === 'finished') {
    return Response.json({ error: 'Match has already ended.' }, { status: 409 });
  }

  // Only advance from round_ended → in_progress. If already in_progress,
  // this is an idempotent re-broadcast. Previous-round loser goes first
  // (standard rule); on a draw, X keeps going first.
  if (room.status === 'round_ended') {
    const nextTurn = room.winner === 'X' ? 'O' : room.winner === 'O' ? 'X' : 'X';
    room.board = ['', '', '', '', '', '', '', '', ''];
    room.turn = nextTurn;
    room.status = 'in_progress';
    room.winner = undefined;
    room.winningLine = undefined;
    room.roundNumber += 1;
    room.updatedAt = new Date();
    await room.save();
  }

  const payload = serializeRoom(room);
  try {
    await publish(ticTacToeChannel(roomCode), 'ttt:move', payload);
  } catch (err) {
    logger.error('TTT next-round publish failed', { error: String(err), roomCode });
  }

  return Response.json({ room: payload });
}
