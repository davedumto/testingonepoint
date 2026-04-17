import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSession extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  loginAt: Date;
  logoutAt?: Date;
  duration?: number; // minutes
  logoutType: 'manual' | 'auto' | 'shift_end' | 'session_expired' | 'active';
  ipAddress?: string;
  userAgent?: string;
  flagged: boolean;
  flagReason?: string;
}

const TimeSessionSchema = new Schema<ITimeSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true },
  userName: { type: String, required: true },
  loginAt: { type: Date, required: true, default: Date.now },
  logoutAt: { type: Date },
  duration: { type: Number }, // calculated on logout
  logoutType: { type: String, enum: ['manual', 'auto', 'shift_end', 'session_expired', 'active'], default: 'active' },
  ipAddress: { type: String },
  userAgent: { type: String },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
});

TimeSessionSchema.index({ loginAt: -1 });
TimeSessionSchema.index({ userId: 1, logoutType: 1 });

export default mongoose.models.TimeSession || mongoose.model<ITimeSession>('TimeSession', TimeSessionSchema);
