import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailCode extends Document {
  hmacEmail: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const EmailCodeSchema = new Schema<IEmailCode>({
  hmacEmail: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired codes shortly after expiry.
EmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.EmailCode || mongoose.model<IEmailCode>('EmailCode', EmailCodeSchema);
