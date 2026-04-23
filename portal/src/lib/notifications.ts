import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Notification, { type NotificationType, type NotificationPriority } from '@/models/Notification';
import Employee from '@/models/Employee';
import { publish } from '@/lib/pusher/server';
import { logger } from '@/lib/logger';

interface DispatchInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  priority?: NotificationPriority;
  actorName?: string;
}

// Pusher channel name for a single employee's notification stream. Private so
// the auth endpoint must gate subscriptions against the employee session.
export function notificationChannel(userId: string): string {
  return `private-user-${userId}`;
}

// Create a Notification and push it to the user's private channel. Safe to
// await from inside a write route — we wrap the push in try/catch so a Pusher
// outage never fails the calling write.
export async function dispatch(input: DispatchInput): Promise<void> {
  await connectDB();
  const uid = typeof input.userId === 'string' ? new Types.ObjectId(input.userId) : input.userId;

  const doc = await Notification.create({
    userId: uid,
    userModel: 'Employee',
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    priority: input.priority || 'normal',
    actorName: input.actorName,
  });

  const payload = {
    _id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    link: doc.link,
    priority: doc.priority,
    read: false,
    actorName: doc.actorName,
    createdAt: doc.createdAt,
  };

  try {
    await publish(notificationChannel(uid.toString()), 'notification:new', payload);
  } catch (err) {
    logger.error('Notification push failed', { userId: uid.toString(), error: String(err) });
  }
}

// Dispatch the same notification to all active employees. Writes one doc per
// recipient so each has their own read state. Pusher fan-out is O(n) pushes;
// at dozens of employees this is comfortably under free-tier limits.
interface BroadcastInput {
  title: string;
  body?: string;
  link?: string;
  priority?: NotificationPriority;
  actorName?: string;
  type?: NotificationType; // default 'broadcast'
}

export async function broadcastToAllEmployees(input: BroadcastInput): Promise<{ sentTo: number }> {
  await connectDB();
  const employees = await Employee.find({ isSetup: true }).select('_id');

  const type = input.type || 'broadcast';
  const priority = input.priority || 'high';

  // Bulk-insert the docs first so the DB write is one round-trip.
  const docs = employees.map(e => ({
    userId: e._id,
    userModel: 'Employee' as const,
    type,
    title: input.title,
    body: input.body,
    link: input.link,
    priority,
    actorName: input.actorName,
    read: false,
  }));
  const inserted = docs.length ? await Notification.insertMany(docs) : [];

  // Fan-out pushes. Parallel since each channel is independent.
  await Promise.all(inserted.map(n => {
    const payload = {
      _id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      priority: n.priority,
      read: false,
      actorName: n.actorName,
      createdAt: n.createdAt,
    };
    return publish(notificationChannel(n.userId.toString()), 'notification:new', payload)
      .catch(err => logger.error('Broadcast push failed', { userId: n.userId.toString(), error: String(err) }));
  }));

  return { sentTo: inserted.length };
}
