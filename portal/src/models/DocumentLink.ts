import mongoose, { Schema, Document } from 'mongoose';

export type DocumentCategory = 'marketing' | 'training' | 'compliance' | 'forms' | 'quotes' | 'resources' | 'other';

export interface IDocumentLink extends Document {
  name: string;
  url: string;
  category: DocumentCategory;
  description?: string;
  postedBy: string;
  postedAt: Date;
  lastAccessedAt?: Date;
}

const DocumentLinkSchema = new Schema<IDocumentLink>({
  name: { type: String, required: true, trim: true, maxlength: 250 },
  url: { type: String, required: true, maxlength: 2000 },
  category: { type: String, enum: ['marketing', 'training', 'compliance', 'forms', 'quotes', 'resources', 'other'], default: 'other', index: true },
  description: { type: String, maxlength: 500 },
  postedBy: { type: String, required: true },
  postedAt: { type: Date, default: Date.now, index: true },
  lastAccessedAt: { type: Date },
});

DocumentLinkSchema.index({ postedAt: -1 });

export default mongoose.models.DocumentLink || mongoose.model<IDocumentLink>('DocumentLink', DocumentLinkSchema);
