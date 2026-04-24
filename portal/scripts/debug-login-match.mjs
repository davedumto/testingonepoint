// Simulates exactly what /api/auth/request-code does so we can see why the
// fuzzy-match is failing. Runs the raw decrypt + the fuzzy matcher against
// what's actually in the DB.

import mongoose from 'mongoose';
import crypto from 'crypto';

const EMAIL = 'ejeredavid2001@gmail.com';
const ENTERED_NAME = 'David Ejere';  // change this to match whatever you typed

const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';

function piiKeyBuffer() { return crypto.createHash('sha256').update(PII_KEY).digest(); }

function decryptPII(blob) {
  // Supports both `enc:pii:iv:tag:ct` and legacy `enc:iv:tag:ct` formats
  const parts = blob.split(':');
  let iv, tag, ct;
  if (parts[0] === 'enc' && parts[1] === 'pii') { iv = parts[2]; tag = parts[3]; ct = parts[4]; }
  else if (parts[0] === 'enc') { iv = parts[1]; tag = parts[2]; ct = parts[3]; }
  else return blob;
  const decipher = crypto.createDecipheriv('aes-256-gcm', piiKeyBuffer(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
}

function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}

// Copied verbatim from src/lib/name-match.ts
function namesFuzzyMatch(input, stored) {
  if (!stored) return false;
  const tokens = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s'-]/gu, '').trim().split(/\s+/).filter(Boolean);
  const a = tokens(input);
  const b = tokens(stored);
  if (!a.length || !b.length) return false;
  return a[0] === b[0] && a[a.length - 1] === b[b.length - 1];
}

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.db.collection('users');

console.log(`→ Looking up hmacEmail for "${EMAIL}"…`);
const raw = await users.findOne({ hmacEmail: hmacEmail(EMAIL) });

if (!raw) {
  console.log(`❌ No user row matches. hmac=${hmacEmail(EMAIL)}`);
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`✅ Raw row found.`);
console.log(`   _id: ${raw._id}`);
console.log(`   role: ${raw.role}`);
console.log(`   name (raw): ${String(raw.name).slice(0, 60)}…`);
console.log(`   email (raw): ${String(raw.email).slice(0, 60)}…`);

const decryptedName = decryptPII(raw.name);
const decryptedEmail = decryptPII(raw.email);
console.log(`   name (decrypted): "${decryptedName}"`);
console.log(`   email (decrypted): "${decryptedEmail}"`);

console.log(``);
console.log(`→ Entered: "${ENTERED_NAME}"`);
console.log(`→ Stored : "${decryptedName}"`);
const ok = namesFuzzyMatch(ENTERED_NAME, decryptedName);
console.log(`→ namesFuzzyMatch result: ${ok ? '✅ MATCH' : '❌ NO MATCH'}`);

if (!ok) {
  const tokens = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s'-]/gu, '').trim().split(/\s+/).filter(Boolean);
  console.log(`   Entered tokens: ${JSON.stringify(tokens(ENTERED_NAME))}`);
  console.log(`   Stored tokens:  ${JSON.stringify(tokens(decryptedName))}`);
}

await mongoose.disconnect();
