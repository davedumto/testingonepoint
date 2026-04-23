import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'announcement'      // admin-broadcast announcement
  | 'mention'           // tagged by another user in a suggestion/post
  | 'system'            // generic system message
  | 'broadcast'         // admin BOLO to all users (priority: high)
  | 'suggestion_reply'; // admin responded to a suggestion you submitted

export type NotificationPriority = 'normal' | 'high';

export interface INotification extends Document {
  // Who receives it. For broadcasts we write one doc per recipient so the read
  // state is per-user; cheaper than maintaining a cross-user "seen-by" set.
  userId: Types.ObjectId;
  userModel: 'Employee' | 'Admin'; // future-proofing for admin-targeted sends

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

  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  userModel: { type: String, enum: ['Employee', 'Admin'], default: 'Employee', index: true },

  type: { type: String, enum: ['announcement', 'mention', 'system', 'broadcast', 'suggestion_reply'], required: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, maxlength: 2000 },
  link: { type: String, maxlength: 500 },

  priority: { type: String, enum: ['normal', 'high'], default: 'normal', index: true },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },

  actorName: { type: String, maxlength: 120 },

  createdAt: { type: Date, default: Date.now, index: true },
});

// Compound index: most common query is "this user, unread, newest first".
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-delete after 90 days to keep the collection lean — operational data,
// not an audit trail (separate audit log handles compliance).
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
