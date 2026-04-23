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
  resetToken?: string;
  resetTokenExpiry?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes?: string[];
  hasCompletedOnboarding: boolean;
  // Profile fields written by /api/employee/auth/update-profile and
  // /api/employee/auth/photo-upload. Without these declared, Mongoose strict
  // mode silently drops them on save.
  photoUrl?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  phone?: string;
  birthday?: Date;
  hireDate?: Date;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  shareEmergencyContactWithTeam?: boolean;
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
  resetToken: { type: String, index: true },
  resetTokenExpiry: { type: Date },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorBackupCodes: { type: [String], default: undefined },
  hasCompletedOnboarding: { type: Boolean, default: false },
  // Profile fields. PII-bearing fields (phone, birthday, emergency contact)
  // are stored plain for now; encrypting them is a follow-up that should match
  // the email/name pattern above.
  photoUrl: { type: String },
  jobTitle: { type: String, trim: true },
  department: { type: String, trim: true },
  bio: { type: String, trim: true },
  phone: { type: String, trim: true },
  birthday: { type: Date },
  hireDate: { type: Date },
  emergencyContactName: { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },
  emergencyContactRelation: { type: String, trim: true },
  shareEmergencyContactWithTeam: { type: Boolean, default: false },
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
