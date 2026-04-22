import mongoose, { Schema, Document } from 'mongoose';

export type AnnouncementCategory = 'update' | 'birthday' | 'general' | 'holiday' | 'news';

export interface IAnnouncement extends Document {
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
  imageUrl?: string;
  postedBy: string;
  postedAt: Date;
  expiresAt?: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 5000 },
  category: { type: String, enum: ['update', 'birthday', 'general', 'holiday', 'news'], default: 'general', index: true },
  pinned: { type: Boolean, default: false, index: true },
  imageUrl: { type: String },
  postedBy: { type: String, required: true },
  postedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date },
});

AnnouncementSchema.index({ postedAt: -1 });

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
