import mongoose, { Schema, Document } from 'mongoose';
import { encryptPII, decryptPII, isEncrypted } from '@/lib/security/encryption';

export interface ITimeSession extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  loginAt: Date;
  logoutAt?: Date;
  duration?: number;
  logoutType: 'manual' | 'auto' | 'shift_end' | 'session_expired' | 'active';
  ipAddress?: string;
  userAgent?: string;
  flagged: boolean;
  flagReason?: string;
}

const piiSetter = (v: string) => { try { return encryptPII(v); } catch { return v; } };
const piiGetter = (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } };

const TimeSessionSchema = new Schema<ITimeSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, set: piiSetter, get: piiGetter },
  userName: { type: String, required: true, set: piiSetter, get: piiGetter },
  loginAt: { type: Date, required: true, default: Date.now },
  logoutAt: { type: Date },
  duration: { type: Number },
  logoutType: { type: String, enum: ['manual', 'auto', 'shift_end', 'session_expired', 'active'], default: 'active' },
  ipAddress: { type: String },
  userAgent: { type: String },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String },
});

TimeSessionSchema.set('toJSON', { getters: true });
TimeSessionSchema.set('toObject', { getters: true });
TimeSessionSchema.index({ loginAt: -1 });
// 90-day TTL — auto-delete sessions older than 90 days
TimeSessionSchema.index({ loginAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
TimeSessionSchema.index({ userId: 1, logoutType: 1 });

export default mongoose.models.TimeSession || mongoose.model<ITimeSession>('TimeSession', TimeSessionSchema);
