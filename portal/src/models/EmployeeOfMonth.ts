import mongoose, { Schema, Document, Types } from 'mongoose';

// Employee of the Month recognition record. One row per announcement —
// the "currently active" winner is the newest row with expiresAt > now.
// We snapshot the employee's name and photo at announce time so the banner
// keeps showing the same face/name even if the employee updates their profile
// or is removed afterwards.
export interface IEmployeeOfMonth extends Document {
  employeeId: Types.ObjectId;
  employeeName: string;
  employeePhotoUrl?: string;
  message?: string;
  announcedBy: string;
  publishedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

const EmployeeOfMonthSchema = new Schema<IEmployeeOfMonth>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  employeeName: { type: String, required: true, maxlength: 200 },
  employeePhotoUrl: { type: String, maxlength: 600 },
  message: { type: String, maxlength: 500 },
  announcedBy: { type: String, required: true, maxlength: 200 },
  publishedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Active-banner lookup: "latest announcement still within its window."
EmployeeOfMonthSchema.index({ expiresAt: -1, publishedAt: -1 });

export default mongoose.models.EmployeeOfMonth
  || mongoose.model<IEmployeeOfMonth>('EmployeeOfMonth', EmployeeOfMonthSchema);
