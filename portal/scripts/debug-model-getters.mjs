// Load the project's User model THE SAME WAY the route does and confirm
// whether Mongoose getters decrypt `email` / `name` on property access.

import mongoose from 'mongoose';
import crypto from 'crypto';

const EMAIL = 'ejeredavid2001@gmail.com';

const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';
function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}

// Mirror src/lib/security/encryption.ts
function isEncrypted(value) {
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === 32 && /^[0-9a-f]+$/.test(parts[0]);
}
function piiKeyBuffer() {
  return crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY_PII || '').digest();
}
function decryptPII(encrypted) {
  if (!isEncrypted(encrypted)) return encrypted;
  const [ivHex, tagHex, ctHex] = encrypted.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', piiKeyBuffer(), Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  return d.update(ctHex, 'hex', 'utf8') + d.final('utf8');
}

// Rebuild a User schema with the same getter pattern as src/models/User.ts
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    set: v => v,
    get: (v) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } },
  },
  email: {
    type: String,
    set: v => v,
    get: (v) => { try { return isEncrypted(v) ? decryptPII(v) : v; } catch { return v; } },
  },
  hmacEmail: { type: String },
  role: { type: String },
});
UserSchema.set('toJSON', { getters: true });
UserSchema.set('toObject', { getters: true });

const User = mongoose.model('User', UserSchema);

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOne({ hmacEmail: hmacEmail(EMAIL) });
if (!user) {
  console.log('❌ User not found.');
  process.exit(1);
}

console.log('Accessing user.email directly:');
console.log('  typeof:', typeof user.email);
console.log('  value :', JSON.stringify(user.email));
console.log('  length:', String(user.email).length);
console.log('');
console.log('Accessing user.name directly:');
console.log('  value :', JSON.stringify(user.name));
console.log('');

// Does the email look like a real email, or like an encrypted blob?
const emailStr = String(user.email);
if (/^[^@:]+@[^@:]+\.[^@:]+$/.test(emailStr)) {
  console.log('✅ user.email is a valid email — Mongoose getter IS decrypting properly.');
  console.log('   => The server would send the OTP email to the correct address.');
} else if (isEncrypted(emailStr)) {
  console.log('❌ user.email is the ENCRYPTED BLOB — Mongoose getter is NOT firing on property access.');
  console.log('   => The server is passing the encrypted string to nodemailer as the "to" address.');
  console.log('   => SMTP rejects it silently, the catch block in the route swallows the error.');
}

await mongoose.disconnect();
