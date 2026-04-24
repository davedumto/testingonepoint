import mongoose, { Schema, Document as MongoDoc } from 'mongoose';

// Request types per §5 of the client portal spec. Auto-routing logic keys
// off this value — all types route to Marcel (Operations) for now, but the
// enum leaves room for per-type routing later.
export type ServiceRequestType =
  | 'policy_change'
  | 'add_vehicle'
  | 'remove_driver'
  | 'address_update'
  | 'certificate_request'
  | 'billing_issue'
  | 'cancellation_request';

export type Urgency = 'low' | 'normal' | 'high' | 'urgent';

export type ServiceRequestStatus =
  | 'submitted'
  | 'in_progress'
  | 'waiting_on_client'
  | 'completed'
  | 'cancelled';

export interface ISRAttachment {
  name: string;
  url: string;
  cloudinaryPublicId?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt: Date;
}

export interface ISRComment {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorType: 'client' | 'agent' | 'admin';
  body: string;
  createdAt: Date;
}

export interface IServiceRequest extends MongoDoc {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  policyId?: mongoose.Types.ObjectId;

  type: ServiceRequestType;
  description: string;
  urgency: Urgency;

  attachments: ISRAttachment[];

  // Routing — per spec, defaults to Marcel (Operations). Kept as a free-text
  // assignee label so we're not coupled to a specific employee record and
  // admins can reassign without foreign-key constraints.
  assignedTo: string;
  status: ServiceRequestStatus;

  comments: ISRComment[];

  // SLA tracking: timestamps for the four key transitions per §5.
  submittedAt: Date;
  firstResponseAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<ISRAttachment>({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true },
  cloudinaryPublicId: { type: String },
  mimeType: { type: String },
  sizeBytes: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const CommentSchema = new Schema<ISRComment>({
  authorId: { type: Schema.Types.ObjectId, required: true },
  authorName: { type: String, required: true, trim: true },
  authorType: { type: String, enum: ['client', 'agent', 'admin'], required: true },
  body: { type: String, required: true, maxlength: 5000 },
  createdAt: { type: Date, default: Date.now },
});

const ServiceRequestSchema = new Schema<IServiceRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true, index: true },
  policyId: { type: Schema.Types.ObjectId, ref: 'Policy', index: true },

  type: {
    type: String,
    enum: ['policy_change', 'add_vehicle', 'remove_driver', 'address_update', 'certificate_request', 'billing_issue', 'cancellation_request'],
    required: true,
  },
  description: { type: String, required: true, maxlength: 5000, trim: true },
  urgency: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

  attachments: { type: [AttachmentSchema], default: [] },

  assignedTo: { type: String, default: 'marcel', trim: true },
  status: {
    type: String,
    enum: ['submitted', 'in_progress', 'waiting_on_client', 'completed', 'cancelled'],
    default: 'submitted',
    index: true,
  },

  comments: { type: [CommentSchema], default: [] },

  submittedAt: { type: Date, default: Date.now },
  firstResponseAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ServiceRequestSchema.pre('save', function () { this.updatedAt = new Date(); });

// Common list query: this user's open requests, newest first.
ServiceRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.models.ServiceRequest || mongoose.model<IServiceRequest>('ServiceRequest', ServiceRequestSchema);
