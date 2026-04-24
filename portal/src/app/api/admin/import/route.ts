import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';
import { hmacEmail } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

// CSV Import endpoint — admin-only.
// Handles TWO import modes based on what columns the CSV has:
//   1. Contact import — rows only carry name/email/phone → upserts User records
//   2. Policy import  — rows carry product_name/carrier/policy_number →
//                       upserts Policy records (user must exist first)
// Or BOTH in the same row when a CSV combines client+policy data.
//
// The parser handles:
//   - UTF-8 BOM on the first header cell
//   - Quoted fields containing commas
//   - Semicolon delimiters (detected from the header line)
//   - Common GHL/Excel header aliases (Email / Email Address / Primary Email, etc.)

// Maps possible CSV headers to canonical keys our code uses. Add more synonyms
// here as we hit them — easier than telling ops to rename columns every time
// they export from a new tool.
const HEADER_ALIASES: Record<string, string> = {
  email: 'email', email_address: 'email', emailaddress: 'email', primary_email: 'email',
  contact_email: 'email', customer_email: 'email', e_mail: 'email', mail: 'email',

  first_name: 'first_name', firstname: 'first_name', fname: 'first_name', given_name: 'first_name',
  last_name: 'last_name', lastname: 'last_name', lname: 'last_name', surname: 'last_name', family_name: 'last_name',
  full_name: 'name', name: 'name', contact_name: 'name', client_name: 'name',

  phone: 'phone', phone_number: 'phone', mobile: 'phone', cell: 'phone',

  business_name: 'business_name', company: 'business_name', company_name: 'business_name', organization: 'business_name',

  product_name: 'product_name', product: 'product_name', policy_type: 'product_name',
  product_category: 'product_category', category: 'product_category',
  carrier: 'carrier', insurance_carrier: 'carrier', insurer: 'carrier',
  policy_number: 'policy_number', policy: 'policy_number', policy_no: 'policy_number', policynumber: 'policy_number',
  status: 'status', policy_status: 'status',
  start_date: 'start_date', effective_date: 'start_date', inception_date: 'start_date',
  end_date: 'end_date', expiration_date: 'end_date', expiry_date: 'end_date',
  premium: 'premium', monthly_premium: 'premium', monthly_rate: 'premium',
};

function normalizeHeader(raw: string): string {
  // Strip BOM, whitespace, lowercase, collapse spaces to underscores, strip
  // punctuation so "Email Address" / "email address" / "Email_Address" /
  // "﻿Email" all map to the same canonical key before alias lookup.
  const cleaned = raw
    .replace(/^﻿/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return HEADER_ALIASES[cleaned] || cleaned;
}

// Minimal RFC-4180-ish parser: handles quoted cells with embedded commas and
// escaped double-quotes ("" inside a quoted field). Good enough for GHL/Excel
// exports without a dependency.
function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === delim) { out.push(cur); cur = ''; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out.map(v => v.trim());
}

const CATEGORIES = ['auto', 'home', 'health', 'life', 'disability', 'business'] as const;
type ProductCategory = typeof CATEGORIES[number];
function coerceCategory(v?: string): ProductCategory {
  const lc = (v || '').toLowerCase().trim();
  return (CATEGORIES as readonly string[]).includes(lc) ? (lc as ProductCategory) : 'auto';
}

const STATUSES = ['active', 'pending', 'expired', 'cancelled', 'reinstatement_needed'] as const;
type PolicyStatus = typeof STATUSES[number];
function coerceStatus(v?: string): PolicyStatus {
  const lc = (v || '').toLowerCase().trim().replace(/\s+/g, '_');
  return (STATUSES as readonly string[]).includes(lc) ? (lc as PolicyStatus) : 'active';
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { csvData, createMissingUsers } = body as { csvData?: string; createMissingUsers?: boolean };
    if (!csvData || typeof csvData !== 'string') {
      return Response.json({ error: 'CSV data required.' }, { status: 400 });
    }

    await connectDB();

    // Normalize line endings + strip BOM + blank lines
    const text = csvData.replace(/\r\n?/g, '\n').replace(/^﻿/, '').trim();
    const rawLines = text.split('\n').filter(l => l.length > 0);
    if (rawLines.length < 2) {
      return Response.json({ error: 'CSV must have a header row and at least one data row.' }, { status: 400 });
    }

    // Detect delimiter from the header line — comma wins unless there are
    // clearly more semicolons. Covers GHL, Excel US, and Excel EU exports.
    const commaCount = (rawLines[0].match(/,/g) || []).length;
    const semiCount = (rawLines[0].match(/;/g) || []).length;
    const delim = semiCount > commaCount ? ';' : ',';

    const headersRaw = parseCsvLine(rawLines[0], delim);
    const headers = headersRaw.map(normalizeHeader);

    const hasEmailColumn = headers.includes('email');
    const hasPolicyColumns = headers.includes('product_name') || headers.includes('policy_number');
    const hasNameColumn = headers.includes('name') || headers.includes('first_name') || headers.includes('last_name');

    if (!hasEmailColumn) {
      return Response.json({
        error: `No email column detected. Headers we saw: [${headersRaw.join(', ')}]. Rename an email-like column or add its name to HEADER_ALIASES in src/app/api/admin/import/route.ts.`,
        detectedHeaders: headersRaw,
        normalizedHeaders: headers,
      }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      usersCreated: 0,
      policiesCreated: 0,
      detectedHeaders: headersRaw,
      normalizedHeaders: headers,
      mode: hasPolicyColumns ? (hasNameColumn ? 'combined' : 'policies') : 'contacts',
      errors: [] as string[],
    };

    for (let i = 1; i < rawLines.length; i++) {
      const values = parseCsvLine(rawLines[i], delim);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { if (h) row[h] = (values[idx] || '').trim(); });

      const email = row.email?.toLowerCase();
      if (!email) {
        results.errors.push(`Row ${i + 1}: missing email`);
        results.skipped++;
        continue;
      }

      // Derive display name. Prefer explicit first+last, fall back to `name`,
      // finally email-prefix so we never insert a blank-name client.
      const firstName = row.first_name?.trim();
      const lastName = row.last_name?.trim();
      const combinedName = [firstName, lastName].filter(Boolean).join(' ') || row.name?.trim();
      const displayName = combinedName || email.split('@')[0];

      let dbUser = await User.findOne({ hmacEmail: hmacEmail(email) });

      // Contact mode OR explicit createMissingUsers=true → upsert the User.
      // Falls through to policy upsert below in `combined` mode.
      if (!dbUser && (createMissingUsers || !hasPolicyColumns)) {
        try {
          dbUser = await User.create({
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            name: displayName,
            email,
            // hmacEmail is auto-computed in the User pre-save hook when email changes
            role: 'client',
            phone: row.phone || undefined,
            businessName: row.business_name || undefined,
          });
          results.usersCreated++;
        } catch (err) {
          results.errors.push(`Row ${i + 1}: user create failed — ${String(err).slice(0, 200)}`);
          results.skipped++;
          continue;
        }
      }

      if (!dbUser) {
        results.errors.push(`Row ${i + 1}: no user found for ${email} (and createMissingUsers was not set)`);
        results.skipped++;
        continue;
      }

      // Contacts-only mode → we're done with this row.
      if (!hasPolicyColumns) {
        results.imported++;
        continue;
      }

      const policyNumber = row.policy_number || `IMPORT-${Date.now()}-${i}`;
      try {
        await Policy.findOneAndUpdate(
          { userId: dbUser._id, policyNumber },
          {
            userId: dbUser._id,
            userEmail: email,
            productName: row.product_name || 'Unknown',
            productCategory: coerceCategory(row.product_category),
            carrier: row.carrier || 'Unknown',
            policyNumber,
            status: coerceStatus(row.status),
            startDate: row.start_date ? new Date(row.start_date) : undefined,
            endDate: row.end_date ? new Date(row.end_date) : undefined,
            premium: row.premium ? parseFloat(row.premium) : undefined,
          },
          { upsert: true, new: true },
        );
        results.policiesCreated++;
        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: policy upsert failed — ${String(err).slice(0, 200)}`);
        results.skipped++;
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${results.imported}, skipped ${results.skipped}. Mode: ${results.mode}.`,
      ...results,
    });
  } catch (error) {
    logger.error('CSV import error', { error: String(error) });
    return Response.json({ error: 'Import failed.' }, { status: 500 });
  }
}
