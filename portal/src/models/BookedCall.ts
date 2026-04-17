import mongoose, { Schema, Document } from 'mongoose';

export interface IBookedCall extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  preferredDate: Date;
  preferredTime: string;
  phone: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  createdAt: Date;
}

const BookedCallSchema = new Schema<IBookedCall>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  preferredTime: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BookedCall || mongoose.model<IBookedCall>('BookedCall', BookedCallSchema);
