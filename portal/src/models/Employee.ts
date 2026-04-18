import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALLOWED_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones';
import { encryptPII, decryptPII, hmacEmail, isEncrypted } from '@/lib/security/encryption';

export interface IEmployee extends Document {
  email: string;
  hmacEmail: string;
  password?: string;
  name?: string;
  timezone: string;
  isSetup: boolean;
  addedBy: string;
  addedAt: Date;
  lastLogin?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const EmployeeSchema = new Schema<IEmployee>({
  email: { type: String, required: true, set: (v: string) => { try { return encryptPII(v.toLowerCase().trim()); } catch { return v; } }, get: (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  hmacEmail: { type: String, unique: true, index: true },
  password: { type: String },
  name: { type: String, trim: true, set: (v: string) => { try { return v ? encryptPII(v) : v; } catch { return v; } }, get: (v: string) => { try { return v && isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  timezone: { type: String, enum: ALLOWED_TIMEZONES as unknown as string[], default: DEFAULT_TIMEZONE },
  isSetup: { type: Boolean, default: false },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

EmployeeSchema.set('toJSON', { getters: true });
EmployeeSchema.set('toObject', { getters: true });

EmployeeSchema.pre('save', async function () {
  if (this.isModified('email')) {
    const plainEmail = this.get('email');
    try { this.hmacEmail = hmacEmail(plainEmail); } catch { /* dev mode fallback */ }
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

EmployeeSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
