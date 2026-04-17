import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IEmployee extends Document {
  email: string;
  password?: string;
  name?: string;
  isSetup: boolean; // false = admin added email, employee hasn't set password yet
  addedBy: string;
  addedAt: Date;
  lastLogin?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const EmployeeSchema = new Schema<IEmployee>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  name: { type: String, trim: true },
  isSetup: { type: Boolean, default: false },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

EmployeeSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

EmployeeSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
