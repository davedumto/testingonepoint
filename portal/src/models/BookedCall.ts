import mongoose, { Schema, Document } from 'mongoose';
import { encryptPII, decryptPII, isEncrypted } from '@/lib/security/encryption';

export interface IBookedCall extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  preferredDate: Date;
  preferredTime: string;
  phone: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  createdAt: Date;
}

const piiSetter = (v: string) => { try { return encryptPII(v); } catch { return v; } };
const piiGetter = (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } };

const BookedCallSchema = new Schema<IBookedCall>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  preferredTime: { type: String, required: true },
  phone: { type: String, required: true, set: piiSetter, get: piiGetter },
  notes: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  createdAt: { type: Date, default: Date.now },
});

BookedCallSchema.set('toJSON', { getters: true });
BookedCallSchema.set('toObject', { getters: true });

export default mongoose.models.BookedCall || mongoose.model<IBookedCall>('BookedCall', BookedCallSchema);
