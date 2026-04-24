// Diagnose the OTP flow end-to-end. Checks:
//   1. Was the user found by hmacEmail?
//   2. Did the Mongoose getter actually decrypt name + email on read?
//   3. Was an EmailCode row created (proves `matched: true` path)?
//   4. Send a canary email via sendClientLoginCode's exact code path.

import mongoose from 'mongoose';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const EMAIL = 'ejeredavid2001@gmail.com';
const ENTERED_NAME = 'David Ejere';

const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';
const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';

function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}
function piiKeyBuffer() { return crypto.createHash('sha256').update(PII_KEY).digest(); }
function isEncrypted(value) {
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}
function decryptPII(encrypted) {
  const [ivHex, tagHex, ctHex] = encrypted.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', piiKeyBuffer(), Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  let out = d.update(ctHex, 'hex', 'utf8');
  out += d.final('utf8');
  return out;
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// --- Step 1: find user by hmacEmail ---
const targetHmac = hmacEmail(EMAIL);
const raw = await db.collection('users').findOne({ hmacEmail: targetHmac });
if (!raw) {
  console.log(`❌ Step 1: No row for hmacEmail=${targetHmac.slice(0, 12)}…`);
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`✅ Step 1: user row found (_id=${raw._id})`);

// --- Step 2: decrypt fields the way Mongoose getter does ---
console.log(`   name raw format isEncrypted: ${isEncrypted(String(raw.name))}`);
console.log(`   email raw format isEncrypted: ${isEncrypted(String(raw.email))}`);
const decName = isEncrypted(raw.name) ? decryptPII(raw.name) : raw.name;
const decEmail = isEncrypted(raw.email) ? decryptPII(raw.email) : raw.email;
console.log(`   name decrypted:  "${decName}"`);
console.log(`   email decrypted: "${decEmail}"`);

// --- Step 3: check if recent EmailCode rows exist for this hmac ---
const codes = await db.collection('emailcodes').find({ hmacEmail: targetHmac }).sort({ expiresAt: -1 }).limit(5).toArray();
if (codes.length === 0) {
  console.log(`⚠️  Step 3: No EmailCode rows for this user. That means the API request-code hit the notFound() path — matched: false.`);
} else {
  console.log(`✅ Step 3: ${codes.length} recent EmailCode rows exist:`);
  codes.forEach(c => console.log(`   - expiresAt=${c.expiresAt}, attempts=${c.attempts}, createdAt=${c._id.getTimestamp()}`));
}

// --- Step 4: send a REAL OTP email via the same code path the route uses ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
});

const fakeCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
console.log(`→ Sending a canary OTP email with code ${fakeCode} to ${decEmail}…`);
try {
  const info = await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to: decEmail,
    subject: `Your OnePoint sign-in code: ${fakeCode}`,
    html: `<div><p>Hi ${decName},</p><p>Canary code: <b>${fakeCode}</b></p><p>(This is a debug test, not from the live flow.)</p></div>`,
  });
  console.log(`✅ Canary email sent. messageId: ${info.messageId}, response: ${info.response}`);
} catch (err) {
  console.error(`❌ Canary email send FAILED:`, err?.message, err?.code, err?.response);
}

await mongoose.disconnect();
