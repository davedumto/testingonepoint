import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import TicTacToeGame from '@/models/TicTacToeGame';
import { safeValidate } from '@/lib/security/validation';
import { publish } from '@/lib/pusher/server';
import { ticTacToeChannel, serializeRoom } from '@/lib/games/tictactoe';
import { logger } from '@/lib/logger';

const schema = z.object({
  roomCode: z.string().min(4).max(10).transform(v => v.toUpperCase().trim()),
});

// POST — second player joins an existing room. Rejects if the room is
// full, already finished, or if the caller is the same employee as X
// (one-player games would softlock).
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
  if (room.status !== 'waiting') return Response.json({ error: 'Room is no longer open.' }, { status: 409 });
  if (room.playerX.userId.toString() === user.employeeId) {
    return Response.json({ error: 'You created this room. Share the code with a teammate.' }, { status: 400 });
  }

  const employee = await Employee.findById(user.employeeId);
  if (!employee) return Response.json({ error: 'Employee not found.' }, { status: 404 });

  room.playerO = {
    userId: new Types.ObjectId(user.employeeId),
    name: (employee.name || '').trim() || 'Teammate',
    photoUrl: employee.photoUrl,
  };
  room.status = 'in_progress';
  room.updatedAt = new Date();
  await room.save();

  const payload = serializeRoom(room);
  try {
    await publish(ticTacToeChannel(roomCode), 'ttt:joined', payload);
  } catch (err) {
    logger.error('TTT join publish failed', { error: String(err), roomCode });
  }

  return Response.json({ room: payload });
}
