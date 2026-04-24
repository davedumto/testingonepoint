// Audit the imported client state — total count, oldest + newest rows, and
// whether specific contacts from the user's pasted CSV sample exist.

import mongoose from 'mongoose';
import crypto from 'crypto';

const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';

function piiKey() { return crypto.createHash('sha256').update(PII_KEY).digest(); }
function isEnc(v) { const p = String(v).split(':'); return p.length === 3 && p[0].length === 32 && /^[0-9a-f]+$/.test(p[0]); }
function dec(v) {
  if (!isEnc(v)) return v;
  const [iv, tag, ct] = String(v).split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', piiKey(), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return d.update(ct, 'hex', 'utf8') + d.final('utf8');
}
function hmacEmail(e) { return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(e.toLowerCase().trim()).digest('hex'); }

await mongoose.connect(process.env.MONGODB_URI);
const users = mongoose.connection.db.collection('users');

const total = await users.countDocuments({ role: 'client' });
console.log(`\n=== TOTAL role='client' users: ${total} ===\n`);

// Sample contacts the user pasted in their CSV sample
const sampleEmails = [
  'ashleyelukeme1@gmail.com',   // Chinenye Elukeme
  'ericusmobile@gmail.com',      // Eric Agyapong
  'atkinsonjean947@gmail.com',   // Jean Atkinson
  'akaindomie@yahoo.com',        // Seyi Owolabi
  'cynthia.okoronkwo@gmail.com', // Cynthia Okoronkwo
  'chidoris2013@gmail.com',      // Doris Muogor
];

console.log(`=== Checking CSV sample rows (top of user's CSV) ===`);
for (const email of sampleEmails) {
  const u = await users.findOne({ hmacEmail: hmacEmail(email) });
  if (u) {
    console.log(`✅ ${email}  →  "${dec(u.name)}"  _id=${u._id}  createdAt=${u.createdAt}`);
  } else {
    console.log(`❌ ${email}  →  NOT IN DB`);
  }
}

console.log(`\n=== First 5 clients by insertion (oldest first) ===`);
const oldest = await users.find({ role: 'client' }).sort({ createdAt: 1 }).limit(5).toArray();
oldest.forEach(u => console.log(`  ${dec(u.name)}  (${dec(u.email)})  created=${u.createdAt}`));

console.log(`\n=== Last 5 clients by insertion (newest first — what admin list shows at top) ===`);
const newest = await users.find({ role: 'client' }).sort({ createdAt: -1 }).limit(5).toArray();
newest.forEach(u => console.log(`  ${dec(u.name)}  (${dec(u.email)})  created=${u.createdAt}`));

await mongoose.disconnect();
