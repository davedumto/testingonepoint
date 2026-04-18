import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import AuditLog from '@/lib/security/audit-log';
import AuditLogArchive from '@/models/AuditLogArchive';

const CRON_SECRET = process.env.CRON_SECRET;
const ARCHIVE_THRESHOLD_DAYS = 90;

/**
 * Vercel Cron — runs monthly. Moves audit log entries older than 90 days
 * to AuditLogArchive, preserving hash chain fields.
 * Does NOT delete — copies to archive collection.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVE_THRESHOLD_DAYS);

  // Find entries older than 90 days that haven't been archived yet
  const oldEntries = await AuditLog.find({ timestamp: { $lt: cutoff } })
    .sort({ timestamp: 1 })
    .limit(5000) // Process in batches
    .lean();

  if (oldEntries.length === 0) {
    return Response.json({ archived: 0, message: 'No entries to archive.' });
  }

  // Check which ones are already archived by originalId
  const existingIds = new Set(
    (await AuditLogArchive.find(
      { originalId: { $in: oldEntries.map(e => e._id) } },
      { originalId: 1 }
    ).lean()).map(e => e.originalId.toString())
  );

  const toArchive = oldEntries.filter(e => !existingIds.has(e._id.toString()));

  if (toArchive.length > 0) {
    await AuditLogArchive.insertMany(
      toArchive.map(entry => ({
        originalId: entry._id,
        timestamp: entry.timestamp,
        correlationId: entry.correlationId,
        userId: entry.userId,
        userEmail: entry.userEmail,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        action: entry.action,
        targetResource: entry.targetResource,
        targetId: entry.targetId,
        status: entry.status,
        details: entry.details,
        severity: entry.severity,
        previousHash: entry.previousHash,
        entryHash: entry.entryHash,
      }))
    );
  }

  return Response.json({ archived: toArchive.length, skipped: existingIds.size });
}
