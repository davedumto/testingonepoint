import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  // Employee / admin types
  | 'announcement'        // admin-broadcast announcement
  | 'mention'             // tagged by another user in a suggestion/post
  | 'system'              // generic system message
  | 'broadcast'           // admin BOLO to all users (priority: high)
  | 'suggestion_reply'    // admin responded to a suggestion you submitted
  // Client portal types (V1.5)
  | 'agent_message'       // an agent/admin replied in the client's messaging inbox
  | 'doc_uploaded'        // agent pushed a document (DEC/ID card/invoice) into the vault
  | 'sr_update'           // service request status change by ops
  | 'claim_update'        // claim status change or adjuster assigned
  | 'renewal_reminder'    // upcoming policy renewal (cron-fired)
  | 'payment_alert'       // upcoming / missed payment (cron-fired)
  | 'missing_doc';        // missing compliance/ID docs on a policy (cron-fired)

export type NotificationPriority = 'normal' | 'high';

// `Client` added for V1.5 — client portal notifications share the model so
// the bell and list UI components can be written once and parameterized.
// `senderKey` lets us dedupe cron-fired notifications so renewals/payments
// only alert once per interval (e.g. "renewal_reminder:<policyId>:2026-04").
export interface INotification extends Document {
  // Who receives it. For broadcasts we write one doc per recipient so the read
  // state is per-user; cheaper than maintaining a cross-user "seen-by" set.
  userId: Types.ObjectId;
  userModel: 'Employee' | 'Admin' | 'Client';

  type: NotificationType;
  title: string;
  body?: string;

  // Optional deep link the bell row opens when clicked. Relative URL
  // (e.g. "/employee/dashboard/news#abc") so it stays within the portal.
  link?: string;

  priority: NotificationPriority;
  read: boolean;
  readAt?: Date;

  // Who triggered the event — admin email for broadcasts, employee name for mentions.
  actorName?: string;

  // Idempotency key for cron-fired notifications. Optional for ad-hoc sends.
  // Example: `renewal_reminder:${policyId}:${YYYY-MM}`.
  senderKey?: string;

  // Track email-delivery state so the cron can check whether it has already
  // emailed this notification (portal-only notifications leave this undefined).
  emailSentAt?: Date;

  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  userModel: { type: String, enum: ['Employee', 'Admin', 'Client'], default: 'Employee', index: true },

  type: {
    type: String,
    enum: [
      'announcement', 'mention', 'system', 'broadcast', 'suggestion_reply',
      'agent_message', 'doc_uploaded', 'sr_update', 'claim_update',
      'renewal_reminder', 'payment_alert', 'missing_doc',
    ],
    required: true,
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, maxlength: 2000 },
  link: { type: String, maxlength: 500 },

  priority: { type: String, enum: ['normal', 'high'], default: 'normal', index: true },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },

  actorName: { type: String, maxlength: 120 },

  // Idempotency for cron-fired notifications. Sparse because most ad-hoc
  // notifications leave this empty.
  senderKey: { type: String, maxlength: 200, index: true, sparse: true },
  emailSentAt: { type: Date },

  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index: most common query is "this user, unread, newest first".
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-delete after 90 days to keep the collection lean — operational data,
// not an audit trail (separate audit log handles compliance).
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
