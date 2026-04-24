import mongoose, { Schema, Document } from 'mongoose';

// A game leaderboard "season." Admin starts and ends seasons manually; only
// one active season (endedAt undefined) exists at a time. All GameScore rows
// reference the active season at write time, so ending a season freezes the
// leaderboard without deleting history.
export interface ILeaderboardSeason extends Document {
  name: string;
  startedBy: string;
  startedAt: Date;
  endedAt?: Date;
  endedBy?: string;
  createdAt: Date;
}

const LeaderboardSeasonSchema = new Schema<ILeaderboardSeason>({
  name: { type: String, required: true, maxlength: 120 },
  startedBy: { type: String, required: true, maxlength: 200 },
  startedAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date, index: true },
  endedBy: { type: String, maxlength: 200 },
  createdAt: { type: Date, default: Date.now },
});

// Enforce a single active season: partial unique index on "not-ended" rows.
LeaderboardSeasonSchema.index(
  { endedAt: 1 },
  { unique: true, partialFilterExpression: { endedAt: { $exists: false } } },
);

export default mongoose.models.LeaderboardSeason
  || mongoose.model<ILeaderboardSeason>('LeaderboardSeason', LeaderboardSeasonSchema);
