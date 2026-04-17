import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingQuote extends Document {
  userId: mongoose.Types.ObjectId;
  productName: string;
  productCategory: string;
  formData: Record<string, unknown>;
  status: 'incomplete' | 'submitted' | 'in_review' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const PendingQuoteSchema = new Schema<IPendingQuote>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productName: { type: String, required: true },
  productCategory: { type: String, required: true },
  formData: { type: Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['incomplete', 'submitted', 'in_review', 'completed'],
    default: 'incomplete',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.PendingQuote || mongoose.model<IPendingQuote>('PendingQuote', PendingQuoteSchema);
