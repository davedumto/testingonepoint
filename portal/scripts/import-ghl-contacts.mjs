// Full-fidelity GHL contact import. Reads the CSV from disk, parses every
// row (including rows without email via a placeholder address), and upserts
// each into the users collection keyed by GHL Contact Id. Idempotent — safe
// to re-run; existing records get their fields refreshed.
//
// Run with:
//   node --env-file=.env.local scripts/import-ghl-contacts.mjs /path/to/file.csv
// If no path supplied, falls back to the Downloads export name.

import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CSV = '/Users/dumtochukwu/Downloads/Export_Contacts_undefined_Apr_2026_11_50_AM.csv';
const csvPath = process.argv[2] || DEFAULT_CSV;

const PII_KEY = process.env.ENCRYPTION_KEY_PII || '';
const HMAC_KEY_EMAIL = process.env.HMAC_KEY_EMAIL || '';

if (!PII_KEY || PII_KEY.length < 32) { console.error('❌ ENCRYPTION_KEY_PII missing.'); process.exit(1); }
if (!HMAC_KEY_EMAIL) { console.error('❌ HMAC_KEY_EMAIL missing.'); process.exit(1); }
if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI missing.'); process.exit(1); }

// Matches src/lib/security/encryption.ts — `ivHex:authTagHex:ciphertextHex`.
function piiKey() { return crypto.createHash('sha256').update(PII_KEY).digest(); }
function encryptPII(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', piiKey(), iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc}`;
}
function hmacEmail(email) {
  return crypto.createHmac('sha256', HMAC_KEY_EMAIL).update(email.toLowerCase().trim()).digest('hex');
}

// RFC-4180-ish parser — handles quoted cells with commas and escaped "".
function parseLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(v => v.trim());
}

// CSVs can wrap records across multiple newlines when a quoted field
// contains a newline. Join lines while inside an open quote.
function splitRecords(text) {
  const records = [];
  let buf = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQ = !inQ;
    if (c === '\n' && !inQ) { if (buf.length) records.push(buf); buf = ''; }
    else if (c === '\r' && !inQ) { /* strip */ }
    else buf += c;
  }
  if (buf.length) records.push(buf);
  return records;
}

async function run() {
  console.log(`→ Reading ${csvPath}…`);
  const raw = await fs.readFile(csvPath, 'utf8');
  const text = raw.replace(/^﻿/, '').trim();
  const records = splitRecords(text);
  if (records.length < 2) { console.error('CSV is empty or headerless.'); process.exit(1); }

  const headers = parseLine(records[0]).map(h => h.toLowerCase().trim());
  const col = {
    contactId: headers.indexOf('contact id'),
    firstName: headers.indexOf('first name'),
    lastName: headers.indexOf('last name'),
    phone: headers.indexOf('phone'),
    email: headers.indexOf('email'),
    businessName: headers.indexOf('business name'),
    created: headers.indexOf('created'),
    lastActivity: headers.indexOf('last activity'),
    tags: headers.indexOf('tags'),
  };
  console.log(`→ Detected headers:`, headers);
  console.log(`→ Processing ${records.length - 1} data rows…\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection('users');

  let created = 0;
  let updated = 0;
  let noEmailPlaceholder = 0;
  let errors = [];
  let seenContactIds = new Set();

  for (let i = 1; i < records.length; i++) {
    const parts = parseLine(records[i]);
    const ghlContactId = parts[col.contactId] || '';
    const firstName = parts[col.firstName] || '';
    const lastName = parts[col.lastName] || '';
    const phone = parts[col.phone] || '';
    let email = (parts[col.email] || '').toLowerCase();
    const businessName = parts[col.businessName] || '';
    const createdStr = parts[col.created] || '';
    const lastActivityStr = parts[col.lastActivity] || '';
    const tagsStr = parts[col.tags] || '';

    if (!ghlContactId) { errors.push(`Row ${i + 1}: missing Contact Id`); continue; }
    if (seenContactIds.has(ghlContactId)) { errors.push(`Row ${i + 1}: duplicate Contact Id ${ghlContactId} (already seen this run)`); continue; }
    seenContactIds.add(ghlContactId);

    // No-email rows get a placeholder address so the row can still be stored
    // and matched by ghlContactId later. The placeholder domain makes it
    // obvious the user has no real email and can't log in.
    let emailMissing = false;
    if (!email) {
      email = `no-email+${ghlContactId.toLowerCase()}@placeholder.onepoint`;
      emailMissing = true;
      noEmailPlaceholder++;
    }

    const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim() || email.split('@')[0];

    // Tags as array; filter empties.
    const tags = tagsStr
      ? tagsStr.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    // Parse dates safely — GHL formats vary ("2026-04-09T14:06:26-05:00" vs "Apr 10 2026 03:32 PM").
    const parseDate = s => { if (!s) return undefined; const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d; };
    const ghlCreatedAt = parseDate(createdStr);
    const ghlLastActivity = parseDate(lastActivityStr);

    const targetHmac = hmacEmail(email);

    try {
      // Look up by ghlContactId FIRST (authoritative for GHL rows).
      // Fall back to hmacEmail for rows imported earlier without a GHL id,
      // so we backfill them rather than creating a duplicate.
      let existing = await users.findOne({ ghlContactId });
      if (!existing) existing = await users.findOne({ hmacEmail: targetHmac });

      const updateDoc = {
        $set: {
          firstName: firstName ? encryptPII(firstName) : undefined,
          lastName: lastName ? encryptPII(lastName) : undefined,
          name: encryptPII(combinedName),
          email: encryptPII(email),
          hmacEmail: targetHmac,
          role: 'client',
          phone: phone ? encryptPII(phone) : undefined,
          businessName: businessName || undefined,
          ghlContactId,
          ghlCreatedAt,
          ghlLastActivity,
          tags,
        },
        $setOnInsert: {
          createdAt: new Date(),
          twoFactorEnabled: false,
          timezone: 'America/New_York',
        },
      };

      // Strip undefined from $set (Mongo rejects them).
      for (const k of Object.keys(updateDoc.$set)) {
        if (updateDoc.$set[k] === undefined) delete updateDoc.$set[k];
      }

      if (existing) {
        await users.updateOne({ _id: existing._id }, updateDoc);
        updated++;
      } else {
        await users.insertOne({
          ...updateDoc.$set,
          ...updateDoc.$setOnInsert,
        });
        created++;
      }

      if (i % 50 === 0) console.log(`   … row ${i}: ${combinedName}`);
    } catch (err) {
      errors.push(`Row ${i + 1} (${ghlContactId}): ${String(err?.message || err).slice(0, 200)}`);
    }
  }

  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`   Rows processed     : ${records.length - 1}`);
  console.log(`   Created            : ${created}`);
  console.log(`   Updated            : ${updated}`);
  console.log(`   No-email placeholders: ${noEmailPlaceholder}`);
  console.log(`   Errors             : ${errors.length}`);
  if (errors.length) {
    console.log(`\n   First 10 errors:`);
    errors.slice(0, 10).forEach(e => console.log(`     - ${e}`));
  }
  console.log(`\n   Final DB client count:`, await users.countDocuments({ role: 'client' }));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
