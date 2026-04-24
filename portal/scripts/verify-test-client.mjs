// Verifies the test client is where we think it is. Prints DB name, collection
// name, total client count, and whether the specific email hmac exists.

import mongoose from 'mongoose';
import crypto from 'crypto';

const EMAIL = 'ejeredavid2001@gmail.com';
const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';

function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;

console.log(`→ Connected DB name: ${db.databaseName}`);
console.log(`→ Connection host: ${mongoose.connection.host}`);

const colls = await db.listCollections().toArray();
console.log(`→ Collections: ${colls.map(c => c.name).join(', ')}`);

const users = db.collection('users');
const total = await users.countDocuments({});
const clientCount = await users.countDocuments({ role: 'client' });
console.log(`→ users total: ${total}`);
console.log(`→ role='client' count: ${clientCount}`);

const targetHmac = hmacEmail(EMAIL);
const found = await users.findOne({ hmacEmail: targetHmac });

if (found) {
  console.log(`✅ Record found for ${EMAIL}:`);
  console.log(`   _id: ${found._id}`);
  console.log(`   role: ${found.role}`);
  console.log(`   hmacEmail matches: true`);
  console.log(`   name (encrypted blob): ${String(found.name).slice(0, 50)}…`);
  console.log(`   createdAt: ${found.createdAt}`);
} else {
  console.log(`❌ No record with hmacEmail for ${EMAIL}. HMAC computed: ${targetHmac}`);
  console.log(`→ Dumping 5 most recent users so we can see what IS there:`);
  const recent = await users.find({}).sort({ _id: -1 }).limit(5).toArray();
  recent.forEach(u => {
    console.log(`   _id=${u._id}  role=${u.role || '?'}  hmacEmail=${u.hmacEmail?.slice(0, 12)}…  createdAt=${u.createdAt}`);
  });
}

await mongoose.disconnect();
