import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

// Incident categories — one per common loss event. Spec doesn't enumerate
// these specifically, so we keep it simple and let free-text description
// fill in the details.
export type IncidentType =
  | 'auto_accident'
  | 'auto_theft'
  | 'property_damage'
  | 'water_damage'
  | 'fire'
  | 'theft_burglary'
  | 'liability'
  | 'medical'
  | 'business_interruption'
  | 'other';

// Status progression per §11. "Approved" is deliberately NOT in this list —
// spec §D6 explicitly forbids that label. "Closed" covers both settled and
// denied outcomes without prejudging coverage.
export type ClaimStatus = 'reported' | 'under_review' | 'in_progress' | 'closed';

export interface IClaimAttachment {
  name: string;
  url: string;
  cloudinaryPublicId?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: Date;
}

export interface IClaimTimelineEvent {
  status: ClaimStatus;
  note?: string;
  setBy: 'client' | 'agent' | 'admin' | 'system';
  at: Date;
}

export interface IClaim extends MongoDoc {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  policyId: mongoose.Types.ObjectId;

  // External reference: carrier claim number if they&apos;ve assigned one.
  // Our own _id is the portal-side handle and always present.
  carrierClaimNumber?: string;

  incidentType: IncidentType;
  dateOfLoss: Date;
  description: string;
  locationOfLoss?: string;

  attachments: IClaimAttachment[];

  status: ClaimStatus;
  timeline: IClaimTimelineEvent[];

  // Legal attestation captured at submit-time — proves the disclaimer
  // ("Submission does not guarantee claim approval.") was shown.
  disclaimerAcceptedAt: Date;

  // Optional assignee (adjuster at carrier OR OnePoint claims advocate)
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;

  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

const AttachmentSchema = new Schema<IClaimAttachment>({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  cloudinaryPublicId: { type: String },
  mimeType: { type: String },
  sizeBytes: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const TimelineSchema = new Schema<IClaimTimelineEvent>({
  status: { type: String, enum: ['reported', 'under_review', 'in_progress', 'closed'], required: true },
  note: { type: String, maxlength: 2000 },
  setBy: { type: String, enum: ['client', 'agent', 'admin', 'system'], required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const ClaimSchema = new Schema<IClaim>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', required: true, index: true },

  carrierClaimNumber: { type: String, trim: true },

  incidentType: {
    type: String,
    enum: ['auto_accident', 'auto_theft', 'property_damage', 'water_damage', 'fire', 'theft_burglary', 'liability', 'medical', 'business_interruption', 'other'],
    required: true,
  },
  dateOfLoss: { type: Date, required: true },
  description: { type: String, required: true, maxlength: 5000, trim: true },
  locationOfLoss: { type: String, trim: true, maxlength: 300 },

  attachments: { type: [AttachmentSchema], default: [] },

  status: { type: String, enum: ['reported', 'under_review', 'in_progress', 'closed'], default: 'reported', index: true },
  timeline: { type: [TimelineSchema], default: [] },

  disclaimerAcceptedAt: { type: Date, required: true },

  adjusterName: { type: String, trim: true },
  adjusterPhone: { type: String, trim: true },
  adjusterEmail: { type: String, trim: true, lowercase: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

ClaimSchema.pre('save', function () { this.updatedAt = new Date(); });

ClaimSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.models.Claim || mongoose.model<IClaim>('Claim', ClaimSchema);
