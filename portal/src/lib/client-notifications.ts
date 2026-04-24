import mongoose from 'mongoose';
import Notification, { type NotificationType, type NotificationPriority } from '@/models/Notification';
import { publish } from '@/lib/pusher/server';
import { logger } from '@/lib/logger';

// Per-client private channel — matches the messaging channel naming so the
// existing pusher/auth route already authorizes it.
function clientChannel(userId: string) { return `private-user-${userId}`; }

interface DispatchArgs {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  priority?: NotificationPriority;
  actorName?: string;
  senderKey?: string;  // for idempotency on cron-fired notifications
}

// Create a notification doc for a client + push the live event on their private
// channel so an open dashboard updates the bell immediately. Idempotent when a
// senderKey is provided — a duplicate key returns the existing doc instead of
// creating a second row (avoids double-alerts on cron runs).
export async function dispatchClientNotification(args: DispatchArgs) {
  try {
    const userIdStr = typeof args.userId === 'string' ? args.userId : args.userId.toString();

    if (args.senderKey) {
      const existing = await Notification.findOne({ userId: userIdStr, senderKey: args.senderKey });
      if (existing) return existing;
    }

    const doc = await Notification.create({
      userId: userIdStr,
      userModel: 'Client',
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      priority: args.priority || 'normal',
      actorName: args.actorName,
      senderKey: args.senderKey,
    });

    // Live fan-out. No-op when pusher isn't configured.
    publish(clientChannel(userIdStr), 'notification:new', {
      _id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      body: doc.body,
      link: doc.link,
      priority: doc.priority,
      actorName: doc.actorName,
      createdAt: doc.createdAt,
    });

    return doc;
  } catch (error) {
    // Swallow errors — failed notifications should never block the triggering
    // write. Log for observability.
    logger.error('dispatchClientNotification error', { error: String(error), userId: String(args.userId), type: args.type });
    return null;
  }
}

// Bulk dispatch to many clients at once (e.g. a future broadcast). Writes the
// docs in one insertMany then fans out one publish per client.
export async function dispatchClientNotifications(args: DispatchArgs[]) {
  if (args.length === 0) return;
  try {
    const docs = args.map(a => ({
      userId: typeof a.userId === 'string' ? a.userId : a.userId.toString(),
      userModel: 'Client' as const,
      type: a.type,
      title: a.title,
      body: a.body,
      link: a.link,
      priority: a.priority || 'normal',
      actorName: a.actorName,
      senderKey: a.senderKey,
    }));
    const inserted = await Notification.insertMany(docs, { ordered: false });

    await Promise.all(inserted.map(d =>
      publish(clientChannel(d.userId.toString()), 'notification:new', {
        _id: d._id.toString(),
        type: d.type,
        title: d.title,
        body: d.body,
        link: d.link,
        priority: d.priority,
        actorName: d.actorName,
        createdAt: d.createdAt,
      })
    ));
  } catch (error) {
    logger.error('dispatchClientNotifications bulk error', { error: String(error), count: args.length });
  }
}
