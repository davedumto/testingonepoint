import mongoose, { Schema, Document } from 'mongoose';

export type SuggestionType = 'process' | 'customer_experience' | 'technology' | 'culture' | 'other';
export type SuggestionStatus = 'new' | 'reviewing' | 'actioned' | 'declined';

export interface ISuggestion extends Document {
  submitterName: string;
  submitterEmail: string;
  employeeId?: mongoose.Types.ObjectId;
  suggestionType: SuggestionType;
  message: string;
  status: SuggestionStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

const SuggestionSchema = new Schema<ISuggestion>({
  submitterName: { type: String, required: true, trim: true, maxlength: 120 },
  submitterEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
  suggestionType: { type: String, enum: ['process', 'customer_experience', 'technology', 'culture', 'other'], default: 'other' },
  message: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'reviewing', 'actioned', 'declined'], default: 'new', index: true },
  adminNotes: { type: String, maxlength: 2000 },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
});

SuggestionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Suggestion || mongoose.model<ISuggestion>('Suggestion', SuggestionSchema);
