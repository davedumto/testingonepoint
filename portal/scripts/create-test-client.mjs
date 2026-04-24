// One-off script — creates a test client in the portal DB with the project's
// own encryption helpers so the record matches exactly what OTP login expects.
// Run with: `node --env-file=.env.local scripts/create-test-client.mjs`

import mongoose from 'mongoose';
import crypto from 'crypto';

const EMAIL = 'ejeredavid2001@gmail.com';
const NAME = 'David Ejere';
const FIRST_NAME = 'David';
const LAST_NAME = 'Ejere';

// --- Replicate the project's encryption helpers inline so the script stays
// self-contained and doesn't need TypeScript tooling to run.
// Must stay in sync with src/lib/security/encryption.ts. Format is
// `ivHex:authTagHex:ciphertextHex` (3 parts, all hex) — if you change it
// without also updating isEncrypted() in the main lib, the Mongoose getters
// will silently return the raw blob, and the /login fuzzy-match will compare
// "David Ejere" against an encrypted string. That's how you get mysterious
// "we couldn't find your account" errors even when the row is right there.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';

if (!PII_KEY || PII_KEY.length < 32) {
  console.error('❌ ENCRYPTION_KEY_PII missing or too short. Aborting.');
  process.exit(1);
}
if (!HMAC_KEY_EMAIL) {
  console.error('❌ HMAC_KEY_EMAIL missing. Aborting.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI missing. Aborting.');
  process.exit(1);
}

function piiKeyBuffer() {
  return crypto.createHash('sha256').update(PII_KEY).digest();
}

function encryptPII(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, piiKeyBuffer(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}

async function run() {
  console.log(`→ Connecting to MongoDB…`);
  await mongoose.connect(process.env.MONGODB_URI);

  // Use the raw collection so we don't have to load the compiled TS model.
  // Field shape matches src/models/User.ts — the API routes read via the
  // model's getters, which auto-decrypt.
  const db = mongoose.connection.db;
  const users = db.collection('users');

  const targetHmac = hmacEmail(EMAIL);

  const existing = await users.findOne({ hmacEmail: targetHmac });
  if (existing) {
    console.log(`⚠️  A user with hmacEmail match for ${EMAIL} already exists (_id: ${existing._id}).`);
    console.log(`   Role: ${existing.role || 'unknown'}`);
    console.log(`   Nothing to do. Delete that record first if you want to recreate.`);
    await mongoose.disconnect();
    return;
  }

  const doc = {
    firstName: encryptPII(FIRST_NAME),
    lastName: encryptPII(LAST_NAME),
    name: encryptPII(NAME),
    email: encryptPII(EMAIL.toLowerCase()),
    hmacEmail: targetHmac,
    role: 'client',
    timezone: 'America/New_York',
    twoFactorEnabled: false,
    createdAt: new Date(),
  };

  const result = await users.insertOne(doc);

  console.log(`✅ Test client created.`);
  console.log(`   _id: ${result.insertedId}`);
  console.log(`   Name: ${NAME}`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Role: client`);
  console.log(``);
  console.log(`→ Next: go to /login, enter "${NAME}" + "${EMAIL}", and you'll receive a 6-digit code by email.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
