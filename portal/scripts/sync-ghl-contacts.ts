/**
 * Sync GHL Contacts → Portal Users
 *
 * Fetches all contacts from your GHL sub-account and creates/updates
 * User records in MongoDB. Users are created with a temporary password
 * and can reset it on first login via forgot-password.
 *
 * Run: npx tsx scripts/sync-ghl-contacts.ts
 *
 * Env vars needed: MONGODB_URI, GHL_API_KEY, ENCRYPTION_KEY_PII, HMAC_KEY_EMAIL
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ── Config ──
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://onepointinsuranceagency:2H5r0XT74WfC94Ya@cluster0.7qrfmbw.mongodb.net/';
const GHL_API_KEY = process.env.GHL_API_KEY || '';
const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY = process.env.HMAC_KEY_EMAIL || '';
const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';
const TEMP_PASSWORD = 'OnePoint2026!Reset'; // Users must reset via forgot-password

// ── Encryption helpers (standalone — no @/ imports in scripts) ──
function getKeyBuffer(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest();
}

function encryptPII(plaintext: string): string {
  if (!PII_KEY || PII_KEY.length < 32) return plaintext;
  const key = getKeyBuffer(PII_KEY);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc}`;
}

function hmacEmail(email: string): string {
  if (!HMAC_KEY) return email.toLowerCase().trim();
  return crypto.createHmac('sha256', HMAC_KEY).update(email.toLowerCase().trim()).digest('hex');
}

// ── GHL API fetch with pagination ──
interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
}

async function fetchAllContacts(): Promise<GHLContact[]> {
  const all: GHLContact[] = [];
  let hasMore = true;
  let startAfterId = '';
  let page = 0;

  while (hasMore) {
    page++;
    const url = new URL(`${GHL_API_BASE}/contacts/`);
    url.searchParams.set('limit', '100');
    if (startAfterId) url.searchParams.set('startAfterId', startAfterId);

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GHL API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const contacts: GHLContact[] = data.contacts || [];

    console.log(`  Page ${page}: fetched ${contacts.length} contacts`);
    all.push(...contacts);

    if (contacts.length < 100) {
      hasMore = false;
    } else {
      startAfterId = contacts[contacts.length - 1].id;
    }

    // Rate limit: GHL allows ~10 req/sec, be safe
    await new Promise(r => setTimeout(r, 200));
  }

  return all;
}

// ── User Schema (standalone for script) ──
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  hmacEmail: { type: String, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'employee' },
  timezone: { type: String, default: 'America/New_York' },
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpiry: Date,
  ghlContactId: { type: String, index: true },
  phone: String,
  createdAt: { type: Date, default: Date.now },
});

// ── Main ──
async function main() {
  if (!GHL_API_KEY) {
    console.error('GHL_API_KEY is not set. Add it to .env.local or pass as env var.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  console.log('\nFetching contacts from GHL...');
  const contacts = await fetchAllContacts();
  console.log(`\nTotal contacts fetched: ${contacts.length}`);

  // Filter to contacts with emails only
  const withEmail = contacts.filter(c => c.email && c.email.includes('@'));
  console.log(`Contacts with valid email: ${withEmail.length}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 12);

  for (const contact of withEmail) {
    const email = contact.email!.toLowerCase().trim();
    const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || email.split('@')[0];
    const phone = contact.phone || '';
    const hmac = hmacEmail(email);

    try {
      // Check if user already exists
      const existing = await User.findOne({ hmacEmail: hmac });

      if (existing) {
        // Update name/phone but don't touch password
        let changed = false;
        if (contact.name && !existing.ghlContactId) {
          existing.ghlContactId = contact.id;
          changed = true;
        }
        if (phone && !existing.phone) {
          existing.phone = phone;
          changed = true;
        }
        if (changed) {
          await existing.save();
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new user
        await User.create({
          name: PII_KEY ? encryptPII(name) : name,
          email: PII_KEY ? encryptPII(email) : email,
          hmacEmail: hmac,
          password: hashedPassword,
          role: 'employee',
          ghlContactId: contact.id,
          phone: phone,
        });
        created++;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Duplicate key errors are fine — means user already exists
      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        skipped++;
      } else {
        console.error(`  Error syncing ${email}: ${errMsg}`);
      }
    }
  }

  console.log(`\nSync complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\nNew users have temporary password. They should use "Forgot Password" to set their own.`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
