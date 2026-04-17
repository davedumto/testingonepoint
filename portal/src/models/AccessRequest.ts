import mongoose, { Schema, Document } from 'mongoose';

// Employee request to access a specific app — requires admin approval
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

const AccessRequestSchema = new Schema<IAccessRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true },
  userName: { type: String, required: true },
  provider: { type: String, enum: ['ghl', 'canva', 'lastpass', 'microsoft'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  reason: { type: String },
});

AccessRequestSchema.index({ userId: 1, provider: 1 });
AccessRequestSchema.index({ status: 1 });

export default mongoose.models.AccessRequest || mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);
