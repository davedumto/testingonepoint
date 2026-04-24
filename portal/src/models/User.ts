import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALLOWED_TIMEZONES, DEFAULT_TIMEZONE } from '@/lib/timezones';
import { encryptPII, decryptPII, hmacEmail, isEncrypted } from '@/lib/security/encryption';

// The User model is the CLIENT identity for the client portal. Employees use
// the Employee model, admins use the admin auth flow. Clients sign in via
// email-OTP (see /api/auth/request-code + /api/auth/verify-code) — the legacy
// `password` field is retained nullable for back-compat with old self-signup
// records but is unused by the active flow.

// Client-safe types live in lib/tier-meta.ts so client components can import
// without pulling Mongoose (and its `async_hooks` dep) into the browser.
// Imported here for local use + re-exported for server code that expects
// them on the User model.
import type { ClientTier, AssignedAgent, PreferredContact } from '@/lib/tier-meta';
export type { ClientTier, AssignedAgent, PreferredContact };
export type UserRole = 'client' | 'employee' | 'admin' | 'super-admin';

export interface IUserAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface IUser extends Document {
  // Identity (canonical going forward — `name` is auto-derived from these)
  firstName?: string;
  lastName?: string;
  // Legacy combined name. Kept for back-compat with code that still reads it.
  // Auto-synced in pre-save: if firstName changes, name is recomputed.
  name: string;
  email: string;
  hmacEmail: string;
  password?: string;
  role: UserRole;

  // Client profile (Phase 0)
  phone?: string;
  dateOfBirth?: Date;
  address?: IUserAddress;
  preferredContact?: PreferredContact;
  businessName?: string;
  assignedAgent?: AssignedAgent;
  tier?: ClientTier;
  tierUpdatedAt?: Date;

  // GHL CRM linkage — populated by CSV import or webhook sync. Lets us
  // cross-reference portal users back to GHL contacts without relying on
  // email alone (some GHL contacts have no email).
  ghlContactId?: string;
  ghlCreatedAt?: Date;
  ghlLastActivity?: Date;
  tags?: string[];

  // Existing
  timezone: string;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// Encrypted-string set/get pair, matching the existing `name`/`email` pattern.
// Tries to encrypt on set, decrypts only when value looks encrypted on read.
const encryptedString = {
  set: (v: string) => { try { return v ? encryptPII(v) : v; } catch { return v; } },
  get: (v: string) => { try { return v && isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } },
};

const AddressSchema = new Schema<IUserAddress>({
  street: { type: String, trim: true, ...encryptedString },
  city: { type: String, trim: true, ...encryptedString },
  state: { type: String, trim: true, ...encryptedString },
  zip: { type: String, trim: true, ...encryptedString },
}, { _id: false });

const UserSchema = new Schema<IUser>({
  firstName: { type: String, trim: true, ...encryptedString },
  lastName: { type: String, trim: true, ...encryptedString },
  name: { type: String, required: true, trim: true, set: (v: string) => { try { return encryptPII(v); } catch { return v; } }, get: (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  email: { type: String, required: true, set: (v: string) => { try { return encryptPII(v.toLowerCase().trim()); } catch { return v; } }, get: (v: string) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } } },
  hmacEmail: { type: String, unique: true, index: true },
  password: { type: String },
  role: { type: String, enum: ['client', 'employee', 'admin', 'super-admin'], default: 'client' },

  // Client profile (PII-bearing fields are encrypted at rest using the same
  // pattern as `name`/`email`. Address sub-doc handles its own field-level encryption.)
  phone: { type: String, trim: true, ...encryptedString },
  dateOfBirth: { type: Date },
  address: { type: AddressSchema, default: undefined },
  preferredContact: { type: String, enum: ['call', 'text', 'email'] },
  businessName: { type: String, trim: true },
  assignedAgent: { type: String, enum: ['alex', 'vera', 'team'] },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum', 'emerald', 'crown'] },
  tierUpdatedAt: { type: Date },

  // GHL CRM linkage (sparse index — not every user has one)
  ghlContactId: { type: String, index: true, sparse: true },
  ghlCreatedAt: { type: Date },
  ghlLastActivity: { type: Date },
  tags: { type: [String], default: [] },

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

  // Bidirectional sync between legacy `name` and canonical firstName/lastName.
  // On save we make the two consistent so downstream code can read either.
  const fn = this.get('firstName') as string | undefined;
  const ln = this.get('lastName') as string | undefined;
  const legacyName = this.get('name') as string | undefined;

  if (this.isModified('firstName') || this.isModified('lastName')) {
    // Canonical fields changed — push to legacy `name`.
    const combined = [fn, ln].filter(Boolean).join(' ').trim();
    if (combined) this.set('name', combined);
  } else if (this.isModified('name') && !fn && !ln && legacyName) {
    // Migration path: old record with only `name` getting saved — best-effort
    // split on first space so canonical fields catch up.
    const parts = legacyName.trim().split(/\s+/);
    this.set('firstName', parts[0]);
    this.set('lastName', parts.slice(1).join(' '));
  }
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
