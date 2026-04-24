import type { Cell, Turn } from '@/models/TicTacToeGame';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],    // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],    // cols
  [0, 4, 8], [2, 4, 6],               // diagonals
];

// Checks the board for a winner after a move. Returns the winning mark and
// line if any, or marks it a draw when every cell is filled.
export function evaluateBoard(board: Cell[]): { winner?: 'X' | 'O' | 'draw'; line?: number[] } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line };
    }
  }
  if (board.every(cell => cell !== '')) return { winner: 'draw' };
  return {};
}

export function otherTurn(t: Turn): Turn {
  return t === 'X' ? 'O' : 'X';
}

// Room codes: short, human-pronounceable, URL-safe. 6 base36 chars gives
// ~2 billion combos, plenty for a small team's concurrent rooms. Collisions
// are retried by the caller.
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit confusables I/O/0/1
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function ticTacToeChannel(roomCode: string): string {
  return `private-tictactoe-${roomCode}`;
}

// Shared serializer so every TTT endpoint and Pusher event returns the
// same shape. Keep this in sync with the client-side Room type.
interface TTTDoc {
  roomCode: string;
  playerX: { userId: { toString(): string }; name: string; photoUrl?: string };
  playerO?: { userId: { toString(): string }; name: string; photoUrl?: string } | null;
  board: Cell[];
  turn: Turn;
  status: string;
  winner?: 'X' | 'O' | 'draw';
  winningLine?: number[];
  bestOf: number;
  roundNumber: number;
  matchScoreX: number;
  matchScoreO: number;
  matchWinner?: 'X' | 'O';
}

export function serializeRoom(r: TTTDoc) {
  return {
    roomCode: r.roomCode,
    playerX: { userId: r.playerX.userId.toString(), name: r.playerX.name, photoUrl: r.playerX.photoUrl },
    playerO: r.playerO ? { userId: r.playerO.userId.toString(), name: r.playerO.name, photoUrl: r.playerO.photoUrl } : null,
    board: r.board,
    turn: r.turn,
    status: r.status,
    winner: r.winner,
    winningLine: r.winningLine,
    bestOf: r.bestOf,
    roundNumber: r.roundNumber,
    matchScoreX: r.matchScoreX,
    matchScoreO: r.matchScoreO,
    matchWinner: r.matchWinner,
  };
}

// Majority threshold: ceil(bestOf / 2). First player to reach this wins the match.
export function roundsToWinMatch(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}
