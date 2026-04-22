import mongoose, { Schema, Document } from 'mongoose';

export type HubEventCategory = 'birthday' | 'holiday' | 'event' | 'work_anniversary' | 'training';

export interface IHubEvent extends Document {
  title: string;
  category: HubEventCategory;
  date: Date;
  allDay: boolean;
  timeLabel?: string;
  description?: string;
  employeeId?: mongoose.Types.ObjectId;
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
}

const HubEventSchema = new Schema<IHubEvent>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: ['birthday', 'holiday', 'event', 'work_anniversary', 'training'], default: 'event', index: true },
  date: { type: Date, required: true, index: true },
  allDay: { type: Boolean, default: true },
  timeLabel: { type: String, maxlength: 100 },
  description: { type: String, maxlength: 1000 },
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
  imageUrl: { type: String },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

HubEventSchema.index({ date: 1, category: 1 });

export default mongoose.models.HubEvent || mongoose.model<IHubEvent>('HubEvent', HubEventSchema);
