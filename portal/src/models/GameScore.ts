import mongoose, { Schema, Document, Types } from 'mongoose';

export type GameKey = 'trivia' | 'typing' | 'word' | 'tictactoe';

// How the leaderboard aggregates scores for a given game. "max" takes each
// user's best single score in the season (trivia, typing). "sum" totals all
// scores in the season (word — cumulative daily points; tictactoe — total wins).
export type AggregationMode = 'max' | 'sum';

export const GAME_META: Record<GameKey, { label: string; aggregation: AggregationMode }> = {
  trivia:    { label: 'Insurance Trivia', aggregation: 'max' },
  typing:    { label: 'Typing Speed',     aggregation: 'max' },
  word:      { label: 'Daily Word',       aggregation: 'sum' },
  tictactoe: { label: 'Tic Tac Toe',      aggregation: 'sum' },
};

// One row per completed game session. Scores are always non-negative integers
// (higher is better after normalization — typing stores WPM × accuracy, word
// stores points, tictactoe stores 1 per win, trivia stores points).
export interface IGameScore extends Document {
  userId: Types.ObjectId;
  userName: string;           // snapshotted so leaderboard doesn't need a join
  userPhotoUrl?: string;
  game: GameKey;
  score: number;
  seasonId: Types.ObjectId;
  // Idempotency key: for the word puzzle we want one submission per user per
  // day. Unique index on (userId, game, dedupeKey) when dedupeKey is set.
  dedupeKey?: string;
  // Game-specific state (e.g. word puzzle guesses, trivia category breakdown).
  // Schemaless on purpose — each game owns its own shape.
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const GameScoreSchema = new Schema<IGameScore>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  userName: { type: String, required: true, maxlength: 200 },
  userPhotoUrl: { type: String, maxlength: 600 },
  game: { type: String, enum: ['trivia', 'typing', 'word', 'tictactoe'], required: true, index: true },
  score: { type: Number, required: true, min: 0 },
  seasonId: { type: Schema.Types.ObjectId, required: true, index: true },
  dedupeKey: { type: String, maxlength: 120 },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
});

GameScoreSchema.index(
  { userId: 1, game: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } } },
);
GameScoreSchema.index({ seasonId: 1, game: 1, score: -1 });

export default mongoose.models.GameScore || mongoose.model<IGameScore>('GameScore', GameScoreSchema);
