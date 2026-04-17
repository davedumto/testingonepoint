import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';

// CSV Import endpoint — parses CSV of policies exported from GHL
// Expected CSV columns: email, product_name, product_category, carrier, policy_number, status, start_date, end_date, premium
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // In production, add admin role check here
  // if (!user.isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { csvData } = await req.json();
    if (!csvData || typeof csvData !== 'string') {
      return Response.json({ error: 'CSV data required.' }, { status: 400 });
    }

    await connectDB();

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return Response.json({ error: 'CSV must have a header row and at least one data row.' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const email = row.email?.toLowerCase();
      if (!email) {
        results.errors.push(`Row ${i + 1}: missing email`);
        results.skipped++;
        continue;
      }

      // Find user by email
      const dbUser = await User.findOne({ email });
      if (!dbUser) {
        results.errors.push(`Row ${i + 1}: no user found for ${email}`);
        results.skipped++;
        continue;
      }

      // Upsert policy
      try {
        await Policy.findOneAndUpdate(
          {
            userId: dbUser._id,
            policyNumber: row.policy_number || `IMPORT-${Date.now()}-${i}`,
          },
          {
            userId: dbUser._id,
            userEmail: email,
            productName: row.product_name || 'Unknown',
            productCategory: (row.product_category || 'auto') as 'auto' | 'home' | 'health' | 'life' | 'disability' | 'business',
            carrier: row.carrier || 'Unknown',
            policyNumber: row.policy_number || `IMPORT-${Date.now()}-${i}`,
            status: (row.status as 'active' | 'pending' | 'expired' | 'cancelled') || 'active',
            startDate: row.start_date ? new Date(row.start_date) : undefined,
            endDate: row.end_date ? new Date(row.end_date) : undefined,
            premium: row.premium ? parseFloat(row.premium) : undefined,
          },
          { upsert: true, new: true }
        );
        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${String(err)}`);
        results.skipped++;
      }
    }

    return Response.json({
      success: true,
      message: `Imported ${results.imported} policies, skipped ${results.skipped}.`,
      ...results,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return Response.json({ error: 'Import failed.' }, { status: 500 });
  }
}
