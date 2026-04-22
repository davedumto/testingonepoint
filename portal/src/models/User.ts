import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALLOWED_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones';
import { encryptPII, decryptPII, hmacEmail, isEncrypted } from '@/lib/security/encryption';

// Client portal uses email-OTP sign-in. The legacy `password` field is kept
// as nullable for back-compat with old self-signup accounts but is unused by
// the active auth flow. New client records (added externally) need only
// name + email.
export interface IUser extends Document {
  name: string;
  email: string;
  hmacEmail: string;
  password?: string;
  role: 'employee' | 'admin' | 'super-admin';
  timezone: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, set: (v: string) => { try { return encryptPII(v); } catch { return v; } }, get: (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  email: { type: String, required: true, set: (v: string) => { try { return encryptPII(v.toLowerCase().trim()); } catch { return v; } }, get: (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  hmacEmail: { type: String, unique: true, index: true },
  password: { type: String },
  role: { type: String, enum: ['employee', 'admin', 'super-admin'], default: 'employee' },
  timezone: { type: String, enum: ALLOWED_TIMEZONES as unknown as string[], default: DEFAULT_TIMEZONE },
  twoFactorSecret: { type: String },
  twoFactorEnabled: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.set('toJSON', { getters: true });
UserSchema.set('toObject', { getters: true });

UserSchema.pre('save', async function () {
  if (this.isModified('email')) {
    const plainEmail = this.get('email');
    try { this.hmacEmail = hmacEmail(plainEmail); } catch { /* dev mode fallback */ }
  }
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
