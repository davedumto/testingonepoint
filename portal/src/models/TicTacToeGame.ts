import mongoose, { Schema, Document, Types } from 'mongoose';

// A live Tic-Tac-Toe room. Room code is a short shareable slug (6 chars
// base36) that becomes the Pusher channel key. Board is a length-9 array
// indexed left-to-right, top-to-bottom; cells are 'X', 'O', or '' for empty.
// Winner is 'X' | 'O' | 'draw' | null while in progress.
export type Cell = '' | 'X' | 'O';
export type Turn = 'X' | 'O';
export type GameStatus = 'waiting' | 'in_progress' | 'round_ended' | 'finished';

export interface ITTTPlayer {
  userId: Types.ObjectId;
  name: string;
  photoUrl?: string;
}

export interface ITicTacToeGame extends Document {
  roomCode: string;
  playerX: ITTTPlayer;
  playerO?: ITTTPlayer;
  board: Cell[];
  turn: Turn;
  status: GameStatus;
  // Result of the *current* round — cleared when the next round starts.
  winner?: 'X' | 'O' | 'draw';
  winningLine?: number[];
  // Best-of-N match tracking. bestOf must be odd so there's always a winner.
  bestOf: number;
  roundNumber: number;
  matchScoreX: number;
  matchScoreO: number;
  // Final match winner — set once either player reaches the majority of rounds.
  matchWinner?: 'X' | 'O';
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

const PlayerSchema = new Schema<ITTTPlayer>({
  userId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true, maxlength: 200 },
  photoUrl: { type: String, maxlength: 600 },
}, { _id: false });

const TicTacToeGameSchema = new Schema<ITicTacToeGame>({
  roomCode: { type: String, required: true, unique: true, maxlength: 10 },
  playerX: { type: PlayerSchema, required: true },
  playerO: { type: PlayerSchema },
  board: { type: [String], default: () => ['', '', '', '', '', '', '', '', ''] },
  turn: { type: String, enum: ['X', 'O'], default: 'X' },
  status: { type: String, enum: ['waiting', 'in_progress', 'round_ended', 'finished'], default: 'waiting', index: true },
  winner: { type: String, enum: ['X', 'O', 'draw'] },
  winningLine: { type: [Number] },
  bestOf: { type: Number, default: 3, min: 1 },
  roundNumber: { type: Number, default: 1, min: 1 },
  matchScoreX: { type: Number, default: 0, min: 0 },
  matchScoreO: { type: Number, default: 0, min: 0 },
  matchWinner: { type: String, enum: ['X', 'O'] },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
});

// Clean up abandoned rooms after 24h so the index doesn't grow forever.
TicTacToeGameSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.models.TicTacToeGame
  || mongoose.model<ITicTacToeGame>('TicTacToeGame', TicTacToeGameSchema);
