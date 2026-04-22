import mongoose, { Schema, Document } from 'mongoose';

export type ProviderSlug = 'ghl' | 'canva' | 'lastpass' | 'microsoft';

export interface IProviderConfig extends Document {
  provider: ProviderSlug;
  enabled: boolean;
  updatedBy?: string;
  updatedAt: Date;
}

const ProviderConfigSchema = new Schema<IProviderConfig>({
  provider: { type: String, enum: ['ghl', 'canva', 'lastpass', 'microsoft'], required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ProviderConfig || mongoose.model<IProviderConfig>('ProviderConfig', ProviderConfigSchema);
