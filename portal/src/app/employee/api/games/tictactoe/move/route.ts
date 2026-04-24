import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TicTacToeGame from '@/models/TicTacToeGame';
import { publish } from '@/lib/pusher/server';
import {
  evaluateBoard,
  otherTurn,
  ticTacToeChannel,
  serializeRoom,
  roundsToWinMatch,
} from '@/lib/games/tictactoe';
import { recordGameScore } from '@/lib/games/score-writer';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

const schema = z.object({
  roomCode: z.string().min(4).max(10).transform(v => v.toUpperCase().trim()),
  cellIndex: z.number().int().min(0).max(8),
});

// POST — apply one move. The server is the source of truth: we re-check
// whose turn it is, that the cell is empty, then update the board, evaluate
// for round win/draw, and broadcast. When a round concludes we update the
// match score; when the match concludes we mint one leaderboard point for
// the match winner.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const validation = safeValidate(schema, body);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });
  const { roomCode, cellIndex } = validation.data;

  await connectDB();
  const room = await TicTacToeGame.findOne({ roomCode });
  if (!room) return Response.json({ error: 'Room not found.' }, { status: 404 });
  if (room.status !== 'in_progress') return Response.json({ error: 'Round is not in progress.' }, { status: 409 });
  if (!room.playerO) return Response.json({ error: 'Waiting for a second player.' }, { status: 409 });

  // Backfill match fields on rooms created before the best-of-N migration.
  // Mongoose schema defaults only apply on new-doc creation, so pre-existing
  // rooms have these undefined and would NaN out on the first arithmetic.
  if (typeof room.bestOf !== 'number') room.bestOf = 3;
  if (typeof room.roundNumber !== 'number') room.roundNumber = 1;
  if (typeof room.matchScoreX !== 'number') room.matchScoreX = 0;
  if (typeof room.matchScoreO !== 'number') room.matchScoreO = 0;

  const mark = room.turn;
  const expectedUserId = mark === 'X' ? room.playerX.userId.toString() : room.playerO.userId.toString();
  if (expectedUserId !== user.employeeId) {
    return Response.json({ error: 'Not your turn.' }, { status: 409 });
  }
  if (room.board[cellIndex] !== '') {
    return Response.json({ error: 'Cell already taken.' }, { status: 409 });
  }

  room.board[cellIndex] = mark;
  const { winner, line } = evaluateBoard(room.board);
  if (winner) {
    room.winner = winner;
    room.winningLine = line;
    if (winner === 'X') room.matchScoreX += 1;
    else if (winner === 'O') room.matchScoreO += 1;

    const needed = roundsToWinMatch(room.bestOf);
    if (room.matchScoreX >= needed || room.matchScoreO >= needed) {
      // Match over.
      room.status = 'finished';
      room.matchWinner = room.matchScoreX > room.matchScoreO ? 'X' : 'O';
      room.finishedAt = new Date();

      // Award one leaderboard point to the match winner. We stamp a dedupe
      // key so a retried request doesn't double-credit.
      const winnerId = room.matchWinner === 'X'
        ? room.playerX.userId.toString()
        : room.playerO.userId.toString();
      try {
        await recordGameScore({
          userId: winnerId,
          game: 'tictactoe',
          score: 1,
          actorName: user.email,
          dedupeKey: `match:${room.roomCode}`,
          meta: {
            roomCode: room.roomCode,
            opponent: room.matchWinner === 'X' ? room.playerO.name : room.playerX.name,
            finalScore: `${room.matchScoreX}-${room.matchScoreO}`,
            bestOf: room.bestOf,
          },
        });
      } catch (err) {
        logger.error('TTT match score record failed', { error: String(err), roomCode });
      }
    } else {
      // Round is over, but the match continues. Wait for either player to
      // start the next round.
      room.status = 'round_ended';
    }
  } else {
    room.turn = otherTurn(mark);
  }
  room.updatedAt = new Date();
  await room.save();

  const payload = serializeRoom(room);
  try {
    await publish(ticTacToeChannel(roomCode), 'ttt:move', payload);
  } catch (err) {
    logger.error('TTT move publish failed', { error: String(err), roomCode });
  }

  return Response.json({ room: payload });
}
