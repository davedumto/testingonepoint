import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import AuditLog, { computeEntryHash, auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Vercel Cron — walks the audit log chain in timestamp order,
 * recomputes each hash, and flags any break in the chain.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const entries = await AuditLog.find({}).sort({ timestamp: 1 }).lean();

  if (entries.length === 0) {
    return Response.json({ checked: 0, valid: true });
  }

  let expectedPreviousHash = 'genesis';
  let breaks = 0;

  for (const entry of entries) {
    // Verify previousHash matches what we expect
    if (entry.previousHash !== expectedPreviousHash) {
      breaks++;
      await auditLog({
        action: AUDIT_ACTIONS.AUDIT_CHAIN_BREAK,
        status: 'failure',
        severity: 'critical',
        ipAddress: 'cron',
        userAgent: 'audit-integrity-check',
        details: {
          entryId: entry._id.toString(),
          expectedPreviousHash,
          actualPreviousHash: entry.previousHash,
          entryTimestamp: entry.timestamp,
        },
      });
    }

    // Recompute the entry's hash from its fields
    const detailsStr = entry.details ? JSON.stringify(entry.details, Object.keys(entry.details as Record<string, unknown>).sort()) : '';
    const recomputedHash = computeEntryHash(
      entry.previousHash,
      new Date(entry.timestamp).toISOString(),
      entry.userId || '',
      entry.action,
      entry.targetResource || '',
      entry.status,
      detailsStr,
    );

    if (recomputedHash !== entry.entryHash) {
      breaks++;
      await auditLog({
        action: AUDIT_ACTIONS.AUDIT_CHAIN_BREAK,
        status: 'failure',
        severity: 'critical',
        ipAddress: 'cron',
        userAgent: 'audit-integrity-check',
        details: {
          entryId: entry._id.toString(),
          reason: 'hash_mismatch',
          expectedHash: recomputedHash,
          actualHash: entry.entryHash,
          entryTimestamp: entry.timestamp,
        },
      });
    }

    expectedPreviousHash = entry.entryHash;
  }

  // Send alert email if chain breaks detected
  if (breaks > 0) {
    try {
      const { sendAlertEmail } = await import('@/lib/email');
      await sendAlertEmail(
        process.env.ADMIN_EMAIL || '',
        'CRITICAL: Audit Log Tamper Detected',
        `The audit log integrity check detected ${breaks} chain break(s). This indicates potential tampering. Review immediately.`,
      );
    } catch {
      // Alert email is best-effort
    }
  }

  return Response.json({ checked: entries.length, valid: breaks === 0, breaks });
}
