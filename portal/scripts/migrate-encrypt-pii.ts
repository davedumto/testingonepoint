/**
 * One-time migration: encrypt PII fields and compute hmacEmail for existing documents.
 *
 * Affected collections: users, employees, timesessions, accessrequests, bookedcalls
 * Run: ENCRYPTION_KEY_PII=xxx HMAC_KEY_EMAIL=xxx npx tsx scripts/migrate-encrypt-pii.ts
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://onepointinsuranceagency:2H5r0XT74WfC94Ya@cluster0.7qrfmbw.mongodb.net/';
const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY = process.env.HMAC_KEY_EMAIL || '';

function getKeyBuffer(key: string): Buffer {
  if (!key || key.length < 32) throw new Error('Key must be at least 32 characters');
  return crypto.createHash('sha256').update(key).digest();
}

function encryptPII(plaintext: string): string {
  const key = getKeyBuffer(PII_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc}`;
}

function isEncrypted(v: string): boolean {
  const parts = v.split(':');
  return parts.length === 3 && parts[0].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}

function computeHmac(email: string): string {
  return crypto.createHmac('sha256', HMAC_KEY).update(email.toLowerCase().trim()).digest('hex');
}

async function migrateCollection(
  collectionName: string,
  fields: string[],
  hasHmacEmail: boolean,
) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB not connected');
  const col = db.collection(collectionName);
  const docs = await col.find({}).toArray();
  let migrated = 0;

  for (const doc of docs) {
    const updates: Record<string, string> = {};

    for (const field of fields) {
      const val = doc[field];
      if (val && typeof val === 'string' && !isEncrypted(val)) {
        updates[field] = encryptPII(val);
      }
    }

    if (hasHmacEmail && doc.email && typeof doc.email === 'string') {
      const plainEmail = isEncrypted(doc.email) ? doc.email : doc.email; // already encrypted won't have hmac
      // If email is not yet encrypted, compute hmac from plaintext
      if (!isEncrypted(doc.email) && !doc.hmacEmail) {
        updates.hmacEmail = computeHmac(doc.email);
      }
    }

    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: updates });
      migrated++;
    }
  }

  console.log(`  ${collectionName}: ${migrated}/${docs.length} documents migrated`);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  console.log('Migrating PII fields...\n');

  await migrateCollection('users', ['name', 'email'], true);
  await migrateCollection('employees', ['name', 'email'], true);
  await migrateCollection('timesessions', ['userEmail', 'userName'], false);
  await migrateCollection('accessrequests', ['userEmail', 'userName'], false);
  await migrateCollection('bookedcalls', ['phone'], false);

  console.log('\nMigration complete.');
  await mongoose.disconnect();
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });
