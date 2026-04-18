/**
 * Account Lockout
 *
 * PURPOSE: Locks accounts after 5 failed login attempts within 10 minutes.
 * Requires admin unlock — no auto-unlock timer.
 *
 * WHY: Prevents brute force password attacks. Admin unlock ensures awareness of attack attempts.
 */

import mongoose, { Schema } from 'mongoose';

interface ILoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: Date;
  locked: boolean;
  lockedAt?: Date;
}

const LoginAttemptSchema = new Schema<ILoginAttempt>({
  email: { type: String, required: true, unique: true, lowercase: true },
  attempts: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  locked: { type: Boolean, default: false },
  lockedAt: { type: Date },
});

// TTL: auto-delete unlocked attempt records after 24 hours
LoginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 86400 });

const LoginAttempt = mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', LoginAttemptSchema);

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function recordFailedLogin(email: string): Promise<{ locked: boolean; attemptsLeft: number }> {
  const normalized = email.toLowerCase();
  const now = new Date();

  let record = await LoginAttempt.findOne({ email: normalized });

  if (!record) {
    record = await LoginAttempt.create({ email: normalized, attempts: 1, lastAttempt: now });
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  // If already locked, stay locked
  if (record.locked) {
    return { locked: true, attemptsLeft: 0 };
  }

  // Reset counter if outside window
  if (now.getTime() - record.lastAttempt.getTime() > WINDOW_MS) {
    record.attempts = 1;
    record.lastAttempt = now;
    await record.save();
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  // Increment
  record.attempts++;
  record.lastAttempt = now;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.locked = true;
    record.lockedAt = now;
    await record.save();
    return { locked: true, attemptsLeft: 0 };
  }

  await record.save();
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - record.attempts };
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const record = await LoginAttempt.findOne({ email: email.toLowerCase() });
  return record?.locked || false;
}

export async function unlockAccount(email: string): Promise<boolean> {
  const result = await LoginAttempt.findOneAndUpdate(
    { email: email.toLowerCase() },
    { locked: false, attempts: 0 },
    { new: true }
  );
  return !!result;
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await LoginAttempt.findOneAndUpdate(
    { email: email.toLowerCase() },
    { attempts: 0 }
  );
}
