import mongoose, { Schema, Document } from 'mongoose';

export interface IExtraHoursRequest extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  requestedDate: Date;
  startTime: string;
  endTime: string;
  hoursRequested: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedAt?: Date;
  reviewedBy?: string;
  createdAt: Date;
}

const ExtraHoursRequestSchema = new Schema<IExtraHoursRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, lowercase: true },
  userName: { type: String, required: true },
  requestedDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hoursRequested: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ExtraHoursRequest || mongoose.model<IExtraHoursRequest>('ExtraHoursRequest', ExtraHoursRequestSchema);
