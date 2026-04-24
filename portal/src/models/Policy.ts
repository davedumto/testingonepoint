import mongoose, { Schema, Document } from 'mongoose';
import { encryptPII, decryptPII, isEncrypted } from '@/lib/security/encryption';

export type PolicyStatus = 'active' | 'pending' | 'expired' | 'cancelled' | 'reinstatement_needed';
export type ProductCategory = 'auto' | 'home' | 'health' | 'life' | 'disability' | 'business';
// Spec treats this distinction as VERY IMPORTANT: clients need to know whether
// their bank draft is coming from OnePoint or directly from the carrier.
export type BillingType = 'carrier_direct' | 'agency_billed' | 'unknown';
export type PaymentMethodType = 'card' | 'ach' | 'other';

export interface ICoverageLine { name: string; description?: string; limit?: string; }
export interface IEndorsement { name: string; description?: string; effectiveDate?: Date; }
// We only store the masked last-4. Full PAN never enters the DB — entry/vault
// is delegated to the carrier portal or a future PCI-scoped payment processor.
export interface IPaymentMethod { type?: PaymentMethodType; last4?: string; }

export interface IPolicy extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  productName: string;
  productCategory: ProductCategory;
  carrier: string;
  policyNumber: string;
  status: PolicyStatus;
  startDate?: Date;
  endDate?: Date;
  premium?: number;

  // Financials (Phase 1)
  billingType: BillingType;
  nextDraftDate?: Date;
  paymentMethod?: IPaymentMethod;

  // Coverage summary (Phase 1)
  limits?: Record<string, string>;
  deductibles?: Record<string, string>;
  keyCoverages?: ICoverageLine[];
  endorsements?: IEndorsement[];

  createdAt: Date;
  updatedAt: Date;
}

// last4 is not strictly PII but lives in the encryption pattern for consistency
// with other sensitive fields — there's no query on it so getters are free.
const encryptedString = {
  set: (v: string) => { try { return v ? encryptPII(v) : v; } catch { return v; } },
  get: (v: string) => { try { return v && isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } },
};

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  type: { type: String, enum: ['card', 'ach', 'other'] },
  last4: { type: String, maxlength: 4, ...encryptedString },
}, { _id: false });

const CoverageLineSchema = new Schema<ICoverageLine>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  limit: { type: String, trim: true },
}, { _id: false });

const EndorsementSchema = new Schema<IEndorsement>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  effectiveDate: { type: Date },
}, { _id: false });

const PolicySchema = new Schema<IPolicy>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true, index: true },
  productName: { type: String, required: true, trim: true },
  productCategory: { type: String, enum: ['auto', 'home', 'health', 'life', 'disability', 'business'], required: true },
  carrier: { type: String, required: true, trim: true },
  policyNumber: { type: String, required: true, trim: true },
  status: { type: String, enum: ['active', 'pending', 'expired', 'cancelled', 'reinstatement_needed'], default: 'active', index: true },
  startDate: { type: Date },
  endDate: { type: Date },
  premium: { type: Number },

  billingType: { type: String, enum: ['carrier_direct', 'agency_billed', 'unknown'], default: 'unknown' },
  nextDraftDate: { type: Date },
  paymentMethod: { type: PaymentMethodSchema, default: undefined },

  // Use Map so admins can add arbitrary named limits/deductibles without a
  // schema migration. Keys and values stored as strings to preserve formatted
  // amounts ("$100,000" / "250/500") exactly as entered.
  limits: { type: Map, of: String, default: undefined },
  deductibles: { type: Map, of: String, default: undefined },
  keyCoverages: { type: [CoverageLineSchema], default: undefined },
  endorsements: { type: [EndorsementSchema], default: undefined },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

PolicySchema.set('toJSON', { getters: true });
PolicySchema.set('toObject', { getters: true });

PolicySchema.pre('save', function () { this.updatedAt = new Date(); });

// Tier denormalization hooks (see src/lib/client-tier.ts). Any time a policy
// changes we refresh the owner's tier on the User document.
async function syncTier(userId?: mongoose.Types.ObjectId) {
  if (!userId) return;
  const { recomputeTierForUser } = await import('@/lib/client-tier');
  await recomputeTierForUser(userId);
}

PolicySchema.post('save', async function (doc) { await syncTier(doc.userId); });
PolicySchema.post('findOneAndUpdate', async function (doc) { if (doc?.userId) await syncTier(doc.userId); });
PolicySchema.post('deleteOne', { document: true, query: false }, async function () { await syncTier(this.userId); });
PolicySchema.post('findOneAndDelete', async function (doc) { if (doc?.userId) await syncTier(doc.userId); });

export default mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);
