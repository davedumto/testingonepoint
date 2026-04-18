/**
 * Audit Logging System — tamper-resistant with SHA-256 hash chain.
 *
 * Each entry's entryHash is SHA-256(previousHash + timestamp + userId + action + targetResource + status + details).
 * Breaking any entry in the chain makes all subsequent hashes invalid, detectable by the integrity check.
 */

import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { getCorrelationId } from '@/lib/middleware/correlation';

export interface IAuditLog extends Document {
  timestamp: Date;
  correlationId?: string;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  action: string;
  targetResource?: string;
  targetId?: string;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  previousHash: string;
  entryHash: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  correlationId: { type: String, index: true },
  userId: { type: String, index: true },
  userEmail: { type: String },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetResource: { type: String },
  targetId: { type: String },
  status: { type: String, enum: ['success', 'failure'], required: true },
  details: { type: Schema.Types.Mixed },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  previousHash: { type: String, default: 'genesis' },
  entryHash: { type: String, required: true, index: true },
});

AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export const AUDIT_ACTIONS = {
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  SIGNUP: 'auth.signup',
  PASSWORD_CHANGE: 'auth.password_change',
  PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  PASSWORD_RESET_COMPLETE: 'auth.password_reset_complete',
  TWO_FA_SETUP: 'auth.2fa_setup',
  TWO_FA_VERIFY: 'auth.2fa_verify',
  TWO_FA_FAILED: 'auth.2fa_failed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  ACCOUNT_UNLOCKED: 'auth.account_unlocked',
  OAUTH_INITIATED: 'oauth.initiated',
  OAUTH_COMPLETED: 'oauth.completed',
  OAUTH_FAILED: 'oauth.failed',
  ACCESS_REQUEST: 'access.request',
  ACCESS_APPROVED: 'access.approved',
  ACCESS_DENIED: 'access.denied',
  ADMIN_ACTION: 'admin.action',
  DATA_ACCESS: 'data.access',
  DATA_EXPORT: 'data.export',
  ROLE_CHANGE: 'role.change',
  CLOCK_IN: 'time.clock_in',
  CLOCK_OUT: 'time.clock_out',
  EXTRA_HOURS_REQUEST: 'time.extra_hours_request',
  EXTRA_HOURS_APPROVED: 'time.extra_hours_approved',
  EXTRA_HOURS_DENIED: 'time.extra_hours_denied',
  RATE_LIMIT_HIT: 'security.rate_limit',
  CSRF_VIOLATION: 'security.csrf_violation',
  AUDIT_CHAIN_BREAK: 'security.audit_chain_break',
} as const;

/**
 * Compute SHA-256 hash for an audit entry, chaining from the previous entry's hash.
 */
export function computeEntryHash(
  previousHash: string,
  timestamp: string,
  userId: string,
  action: string,
  targetResource: string,
  status: string,
  details: string,
): string {
  const payload = `${previousHash}|${timestamp}|${userId}|${action}|${targetResource}|${status}|${details}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

interface LogParams {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  targetResource?: string;
  targetId?: string;
  status: 'success' | 'failure';
  details?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
  correlationId?: string;
}

export async function auditLog(params: LogParams): Promise<void> {
  try {
    const timestamp = new Date();
    const correlationId = params.correlationId || getCorrelationId() || undefined;

    // Get the most recent entry's hash to chain from
    const lastEntry = await AuditLog.findOne({}, { entryHash: 1 }).sort({ timestamp: -1 }).lean();
    const previousHash = lastEntry?.entryHash || 'genesis';

    const detailsStr = params.details ? JSON.stringify(params.details, Object.keys(params.details).sort()) : '';

    const entryHash = computeEntryHash(
      previousHash,
      timestamp.toISOString(),
      params.userId || '',
      params.action,
      params.targetResource || '',
      params.status,
      detailsStr,
    );

    AuditLog.create({
      timestamp,
      correlationId,
      userId: params.userId,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'unknown',
      action: params.action,
      targetResource: params.targetResource,
      targetId: params.targetId,
      status: params.status,
      details: params.details,
      severity: params.severity || (params.status === 'failure' ? 'warning' : 'info'),
      previousHash,
      entryHash,
    }).catch(() => { /* audit logging must never crash the app */ });
  } catch {
    // Silently fail — audit logging must never crash the app
  }
}

export default AuditLog;
