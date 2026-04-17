/**
 * Audit Logging System
 *
 * PURPOSE: Append-only log of all security-relevant events.
 * Every auth event, admin action, data access, role change, and failed attempt is logged.
 *
 * WHY APPEND-ONLY: Prevents tampering with audit trail. Application can only INSERT, never UPDATE or DELETE.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  timestamp: Date;
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
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, default: Date.now, index: true },
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
});

// Compound indexes for common admin queries
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// Action types — use these constants for consistency
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
} as const;

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
}

export async function auditLog(params: LogParams): Promise<void> {
  try {
    // Don't await — fire and forget to avoid blocking the request
    AuditLog.create({
      timestamp: new Date(),
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
    }).catch(console.error);
  } catch {
    // Audit logging should never crash the app
    console.error('Audit log write failed');
  }
}

export default AuditLog;
