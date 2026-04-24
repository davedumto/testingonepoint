import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

export type BillingRecordType = 'invoice' | 'payment' | 'statement';
// Carrier-direct vs agency-billed is repeated throughout the spec as VERY
// IMPORTANT. Denormalized onto every billing record so statements render with
// the right clarity label without joining back to Policy on every row.
export type BilledBy = 'carrier' | 'agency';
export type BillingStatus = 'paid' | 'pending' | 'missed' | 'scheduled' | 'refunded';

export interface IBillingRecord extends MongoDoc {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  policyId: mongoose.Types.ObjectId;

  type: BillingRecordType;
  amount: number;
  currency: string;

  // Scheduled/due date — when the draft was/will happen
  dueDate: Date;
  // Paid/cleared date — present once status becomes 'paid' or 'refunded'
  paidDate?: Date;

  status: BillingStatus;

  // Clarity
  billedBy: BilledBy;
  carrierName?: string;            // denormalized from Policy for display
  carrierPortalUrl?: string;       // deep-link for carrier-direct payment

  // Optional linked document (e.g. PDF invoice in the vault)
  documentId?: mongoose.Types.ObjectId;

  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingRecordSchema = new Schema<IBillingRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },

  type: { type: String, enum: ['invoice', 'payment', 'statement'], required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },

  dueDate: { type: Date, required: true, index: true },
  paidDate: { type: Date },

  status: { type: String, enum: ['paid', 'pending', 'missed', 'scheduled', 'refunded'], required: true, index: true },

  billedBy: { type: String, enum: ['carrier', 'agency'], required: true },
  carrierName: { type: String, trim: true },
  carrierPortalUrl: { type: String, trim: true },

  documentId: { type: Schema.Types.ObjectId, ref: 'ClientDocument' },

  description: { type: String, trim: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BillingRecordSchema.pre('save', function () { this.updatedAt = new Date(); });

// Common list query: this user's billing history / upcoming
BillingRecordSchema.index({ userId: 1, status: 1, dueDate: -1 });

export default mongoose.models.BillingRecord || mongoose.model<IBillingRecord>('BillingRecord', BillingRecordSchema);
