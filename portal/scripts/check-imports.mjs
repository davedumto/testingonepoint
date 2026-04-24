// Dump recent users + policies so we can see what's been imported / created.

import mongoose from 'mongoose';
import crypto from 'crypto';

const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
function piiKeyBuffer() { return crypto.createHash('sha256').update(PII_KEY).digest(); }
function isEncrypted(v) { const p = String(v).split(':'); return p.length === 3 && p[0].length === 32 && /^[0-9a-f]+$/.test(p[0]); }
function decryptPII(v) {
  if (!isEncrypted(v)) return v;
  const [iv, tag, ct] = String(v).split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', piiKeyBuffer(), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return d.update(ct, 'hex', 'utf8') + d.final('utf8');
}

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const users = await db.collection('users').find({}).sort({ _id: -1 }).toArray();
console.log(`\n=== USERS (${users.length} total) ===`);
users.forEach(u => {
  const name = u.name ? decryptPII(u.name) : '';
  const email = u.email ? decryptPII(u.email) : '';
  console.log(`  _id=${u._id}  role=${u.role || '?'}  email=${email}  name="${name}"  createdAt=${u.createdAt}`);
});

const policies = await db.collection('policies').find({}).sort({ _id: -1 }).limit(20).toArray();
console.log(`\n=== POLICIES (${policies.length} shown, newest 20) ===`);
if (policies.length === 0) {
  console.log('  (none)');
} else {
  policies.forEach(p => {
    console.log(`  _id=${p._id}  userEmail=${p.userEmail}  product=${p.productName}  carrier=${p.carrier}  #${p.policyNumber}  status=${p.status}  premium=${p.premium}`);
  });
}

const pending = await db.collection('pendingquotes').find({}).sort({ _id: -1 }).limit(10).toArray();
console.log(`\n=== PENDING QUOTES (${pending.length} shown) ===`);
pending.forEach(q => {
  console.log(`  _id=${q._id}  product=${q.productName}  status=${q.status}  updatedAt=${q.updatedAt}`);
});

await mongoose.disconnect();
