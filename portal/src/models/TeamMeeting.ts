import mongoose, { Schema, Document } from 'mongoose';

export type MeetingGroup = 'general' | 'quoting' | 'sales' | 'digital' | 'training' | 'other';

export interface ITeamMeeting extends Document {
  name: string;
  group: MeetingGroup;
  teamsUrl: string;
  scheduleLabel: string;
  description?: string;
  host?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMeetingSchema = new Schema<ITeamMeeting>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  group: { type: String, enum: ['general', 'quoting', 'sales', 'digital', 'training', 'other'], default: 'general', index: true },
  teamsUrl: { type: String, required: true, maxlength: 2000 },
  scheduleLabel: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 500 },
  host: { type: String, maxlength: 100 },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TeamMeetingSchema.index({ active: 1, order: 1 });

export default mongoose.models.TeamMeeting || mongoose.model<ITeamMeeting>('TeamMeeting', TeamMeetingSchema);
