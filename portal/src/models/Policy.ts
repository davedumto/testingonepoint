import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  productName: string;
  productCategory: 'auto' | 'home' | 'health' | 'life' | 'disability' | 'business';
  carrier: string;
  policyNumber: string;
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  premium?: number;
  createdAt: Date;
}

const PolicySchema = new Schema<IPolicy>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true, index: true },
  productName: { type: String, required: true },
  productCategory: {
    type: String,
    enum: ['auto', 'home', 'health', 'life', 'disability', 'business'],
    required: true,
  },
  carrier: { type: String, required: true },
  policyNumber: { type: String, required: true },
  status: { type: String, enum: ['active', 'pending', 'expired', 'cancelled'], default: 'active' },
  startDate: { type: Date },
  endDate: { type: Date },
  premium: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);
