import mongoose, { Schema, Document } from 'mongoose';

// Records every OAuth authentication event — when an employee authenticates into an app via the portal
export interface IOAuthEvent extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  provider: 'ghl' | 'canva' | 'lastpass' | 'microsoft';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  authenticatedAt: Date;
  status: 'initiated' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

const OAuthEventSchema = new Schema<IOAuthEvent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true },
  provider: { type: String, enum: ['ghl', 'canva', 'lastpass', 'microsoft'], required: true },
  accessToken: { type: String },
  refreshToken: { type: String },
  tokenExpiry: { type: Date },
  authenticatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['initiated', 'completed', 'failed'], default: 'initiated' },
  metadata: { type: Schema.Types.Mixed },
});

OAuthEventSchema.index({ userId: 1, provider: 1 });
OAuthEventSchema.index({ authenticatedAt: -1 });

export default mongoose.models.OAuthEvent || mongoose.model<IOAuthEvent>('OAuthEvent', OAuthEventSchema);
