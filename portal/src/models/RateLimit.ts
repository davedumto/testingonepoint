import mongoose, { Schema } from 'mongoose';

interface IRateLimit {
  key: string;
  windowStart: Date;
  count: number;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, default: 1 },
});

// TTL index: auto-delete entries after 1 hour (longest window is signup at 60min)
RateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
