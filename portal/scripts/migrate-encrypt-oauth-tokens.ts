/**
 * One-time migration: encrypt existing plaintext OAuth tokens in EmployeeAuth.
 *
 * Detects plaintext tokens by checking if value does NOT match iv:authTag:ciphertext format.
 * Run: npx tsx scripts/migrate-encrypt-oauth-tokens.ts
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://onepointinsuranceagency:2H5r0XT74WfC94Ya@cluster0.7qrfmbw.mongodb.net/';
const TOKEN_KEY = process.env.ENCRYPTION_KEY_TOKENS || '';

function getKeyBuffer(key: string): Buffer {
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY_TOKENS must be at least 32 characters. Set it in .env.local');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encryptToken(plaintext: string): string {
  const key = getKeyBuffer(TOKEN_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function isAlreadyEncrypted(value: string): boolean {
  // Encrypted format is iv:authTag:ciphertext — three hex segments separated by colons
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  // IV is 32 hex chars (16 bytes), authTag is 32 hex chars (16 bytes)
  return parts[0].length === 32 && parts[1].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection failed');
  const collection = db.collection('employeeauths');

  const docs = await collection.find({
    $or: [
      { accessToken: { $exists: true, $ne: null } },
      { refreshToken: { $exists: true, $ne: null } },
    ],
  }).toArray();

  console.log(`Found ${docs.length} EmployeeAuth documents with tokens.`);

  let migrated = 0;
  let skipped = 0;

  for (const doc of docs) {
    const updates: Record<string, string> = {};

    if (doc.accessToken && !isAlreadyEncrypted(doc.accessToken)) {
      updates.accessToken = encryptToken(doc.accessToken);
    }
    if (doc.refreshToken && !isAlreadyEncrypted(doc.refreshToken)) {
      updates.refreshToken = encryptToken(doc.refreshToken);
    }

    if (Object.keys(updates).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      migrated++;
      console.log(`  Encrypted tokens for doc ${doc._id} (provider: ${doc.provider})`);
    } else {
      skipped++;
    }
  }

  console.log(`\nMigration complete. Encrypted: ${migrated}, Already encrypted/skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
