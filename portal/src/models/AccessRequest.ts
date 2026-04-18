import mongoose, { Schema, Document } from 'mongoose';
import { encryptPII, decryptPII, isEncrypted } from '@/lib/security/encryption';

export interface IAccessRequest extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  provider: 'ghl' | 'canva' | 'lastpass' | 'microsoft';
  status: 'pending' | 'approved' | 'denied';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reason?: string;
}

const piiSetter = (v: string) => { try { return encryptPII(v); } catch { return v; } };
const piiGetter = (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } };

const AccessRequestSchema = new Schema<IAccessRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, set: piiSetter, get: piiGetter },
  userName: { type: String, required: true, set: piiSetter, get: piiGetter },
  provider: { type: String, enum: ['ghl', 'canva', 'lastpass', 'microsoft'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  reason: { type: String },
});

AccessRequestSchema.set('toJSON', { getters: true });
AccessRequestSchema.set('toObject', { getters: true });
AccessRequestSchema.index({ userId: 1, provider: 1 });
AccessRequestSchema.index({ status: 1 });

export default mongoose.models.AccessRequest || mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);
