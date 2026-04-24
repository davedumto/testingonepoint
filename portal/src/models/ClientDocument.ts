import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

// Top-level vault folders per the Document Structure sub-spec.
export type DocumentCategory =
  | 'active_policies'
  | 'quotes'
  | 'billing'
  | 'claims'
  | 'compliance'
  | 'client_uploads';

// Specific document kinds within a category. Derived `category` stored on
// save so the UI can filter cheaply.
export type DocumentKind =
  // Active Policies
  | 'dec' | 'id_card' | 'endorsement' | 'full_policy' | 'renewal' | 'coi'
  // Quotes & Proposals
  | 'quote_summary' | 'coverage_comparison' | 'quote_supporting'
  // Billing
  | 'invoice' | 'payment_confirmation' | 'billing_statement'
  // Claims
  | 'fnol' | 'claim_photo' | 'adjuster_report' | 'claim_correspondence' | 'settlement'
  // Compliance & Signed Forms (Rejection Form is E&O critical per spec)
  | 'coverage_selection' | 'rejection_form' | 'cancellation_request' | 'no_loss_statement' | 'esign'
  // Client Uploads
  | 'driver_license' | 'property_photo' | 'business_document' | 'medical_document';

// Per spec: never delete, always archive. Superseded = a newer version exists.
export type DocumentStatus = 'draft' | 'active' | 'superseded' | 'archived';

// Who uploaded (drives permissions on edit/delete and the "Client Uploads"
// visual split).
export type UploaderType = 'client' | 'agent' | 'admin';

// Quote version labels per spec.
export type QuoteVersionLabel = 'quoted' | 'revised' | 'final_option';

export const KIND_TO_CATEGORY: Record<DocumentKind, DocumentCategory> = {
  dec: 'active_policies', id_card: 'active_policies', endorsement: 'active_policies',
  full_policy: 'active_policies', renewal: 'active_policies', coi: 'active_policies',
  quote_summary: 'quotes', coverage_comparison: 'quotes', quote_supporting: 'quotes',
  invoice: 'billing', payment_confirmation: 'billing', billing_statement: 'billing',
  fnol: 'claims', claim_photo: 'claims', adjuster_report: 'claims',
  claim_correspondence: 'claims', settlement: 'claims',
  coverage_selection: 'compliance', rejection_form: 'compliance',
  cancellation_request: 'compliance', no_loss_statement: 'compliance', esign: 'compliance',
  driver_license: 'client_uploads', property_photo: 'client_uploads',
  business_document: 'client_uploads', medical_document: 'client_uploads',
};

// Health data triggers tighter access logging per spec §18 HIPAA note.
export const HIPAA_SENSITIVE_KINDS: DocumentKind[] = ['medical_document'];

export interface IClientDocument extends MongoDoc {
  userId: mongoose.Types.ObjectId;
  policyId?: mongoose.Types.ObjectId;
  claimId?: mongoose.Types.ObjectId;

  kind: DocumentKind;
  category: DocumentCategory;
  // Sanitized display name. Original upload filename kept for audit only.
  name: string;
  originalName?: string;
  // Convention: [PolicyType]_[Carrier]_[PolicyNumber]_[DocType]_[Date].pdf
  // Populated on upload when the policy context is available.
  conventionName?: string;

  // Storage — Cloudinary secure_url + public_id (for delete on archive cleanup)
  url: string;
  cloudinaryPublicId?: string;
  mimeType?: string;
  sizeBytes?: number;

  // Denormalized metadata for search + grouping (§D9 Document Tagging System)
  carrier?: string;
  policyType?: string;
  policyNumber?: string;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Lifecycle (§D10)
  status: DocumentStatus;
  supersedes?: mongoose.Types.ObjectId;
  quoteVersion?: QuoteVersionLabel;

  // Discovery / UX (§D11 Client Experience Features)
  isPinned: boolean;
  pinnedBy?: 'client' | 'agent' | 'system';
  tags: string[];

  // Provenance & permissions (§D12)
  uploadedBy: mongoose.Types.ObjectId;
  uploaderType: UploaderType;
  uploadedAt: Date;

  // Billing-source clarity label per §D5 — only meaningful for billing docs.
  billedBy?: 'carrier' | 'agency';

  // Soft-delete — never actually remove
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ClientDocumentSchema = new Schema<IClientDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true },
  claimId: { type: Schema.Types.ObjectId, ref: 'Claim', index: true },

  kind: { type: String, required: true, enum: Object.keys(KIND_TO_CATEGORY) },
  category: { type: String, required: true, enum: ['active_policies', 'quotes', 'billing', 'claims', 'compliance', 'client_uploads'], index: true },
  name: { type: String, required: true, trim: true },
  originalName: { type: String, trim: true },
  conventionName: { type: String, trim: true },

  url: { type: String, required: true },
  cloudinaryPublicId: { type: String },
  mimeType: { type: String },
  sizeBytes: { type: Number },

  carrier: { type: String, trim: true, index: true },
  policyType: { type: String, trim: true },
  policyNumber: { type: String, trim: true },
  effectiveDate: { type: Date },
  expirationDate: { type: Date },

  status: { type: String, enum: ['draft', 'active', 'superseded', 'archived'], default: 'active', index: true },
  supersedes: { type: Schema.Types.ObjectId, ref: 'ClientDocument' },
  quoteVersion: { type: String, enum: ['quoted', 'revised', 'final_option'] },

  isPinned: { type: Boolean, default: false, index: true },
  pinnedBy: { type: String, enum: ['client', 'agent', 'system'] },
  tags: { type: [String], default: [] },

  uploadedBy: { type: Schema.Types.ObjectId, required: true },
  uploaderType: { type: String, enum: ['client', 'agent', 'admin'], required: true, index: true },
  uploadedAt: { type: Date, default: Date.now },

  billedBy: { type: String, enum: ['carrier', 'agency'] },

  deletedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-derive category from kind so clients can't mismatch them
ClientDocumentSchema.pre('save', function () {
  if (this.isModified('kind')) this.category = KIND_TO_CATEGORY[this.kind];
  this.updatedAt = new Date();
});

// Text search on tags + name + carrier for the "Find my ID card" bar (§D11)
ClientDocumentSchema.index({ name: 'text', tags: 'text', carrier: 'text', policyNumber: 'text' });
// Frequent list query: this user's docs in a category, newest first.
ClientDocumentSchema.index({ userId: 1, category: 1, deletedAt: 1, createdAt: -1 });

export default mongoose.models.ClientDocument || mongoose.model<IClientDocument>('ClientDocument', ClientDocumentSchema);
