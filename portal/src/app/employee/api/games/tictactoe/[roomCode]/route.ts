import { getEmployeeUser } from '@/lib/employee-auth';
import { connectDB } from '@/lib/db';
import TicTacToeGame from '@/models/TicTacToeGame';
import { serializeRoom } from '@/lib/games/tictactoe';

// GET — returns the current state of a room. Only the two players or the
// creator can read a game's state (keeps casual voyeurs out).
export async function GET(_req: Request, { params }: { params: Promise<{ roomCode: string }> }) {
  const user = await getEmployeeUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { roomCode } = await params;
  await connectDB();
  const room = await TicTacToeGame.findOne({ roomCode: roomCode.toUpperCase() });
  if (!room) return Response.json({ error: 'Room not found.' }, { status: 404 });

  const isPlayer = [room.playerX.userId.toString(), room.playerO?.userId.toString()].includes(user.employeeId);
  if (!isPlayer && room.status !== 'waiting') {
    return Response.json({ error: 'You are not in this room.' }, { status: 403 });
  }

  return Response.json({ room: serializeRoom(room) });
}
