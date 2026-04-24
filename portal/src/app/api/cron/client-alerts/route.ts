import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Policy from '@/models/Policy';
import BillingRecord from '@/models/BillingRecord';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendAlertEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

// GET /api/cron/client-alerts — scheduled daily to surface renewals, payments,
// and missed drafts as both portal notifications (via Notification docs) and
// email. Idempotency is keyed via `senderKey` so re-running the cron doesn't
// duplicate reminders.
//
// Auth: Bearer CRON_SECRET. Same pattern as /api/cron/audit-archive et al.
//
// Windows:
//   - Renewal reminder: policies expiring within RENEWAL_DAYS (30d)
//   - Payment alert: scheduled/pending payments due within UPCOMING_PAYMENT_DAYS (7d)
//   - Missed payment: bills past due and not paid
//
// Email failures are caught and logged but don't stop the batch — we want
// to surface as many in-portal notifications as possible even if SMTP is down.

const CRON_SECRET = process.env.CRON_SECRET;

const RENEWAL_DAYS = 30;
const UPCOMING_PAYMENT_DAYS = 7;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const renewalCutoff = new Date(now.getTime() + RENEWAL_DAYS * 24 * 60 * 60 * 1000);
    const paymentCutoff = new Date(now.getTime() + UPCOMING_PAYMENT_DAYS * 24 * 60 * 60 * 1000);

    let renewalsNotified = 0;
    let upcomingPaymentsNotified = 0;
    let missedPaymentsNotified = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    // === Renewal reminders ===
    const expiring = await Policy.find({
      status: 'active',
      endDate: { $gte: now, $lte: renewalCutoff },
    });

    for (const p of expiring) {
      if (!p.endDate) continue;
      const senderKey = `renewal_reminder:${p._id.toString()}:${monthKey(p.endDate)}`;
      // dispatchClientNotification is idempotent on senderKey — we use the
      // same raw-create pattern here so we can track emailSentAt alongside
      // the notification creation in one step.
      const existing = await Notification.findOne({ userId: p.userId, senderKey });
      if (existing) continue;

      const user = await User.findById(p.userId).select('email name');
      if (!user) continue;

      const notification = await Notification.create({
        userId: p.userId,
        userModel: 'Client',
        type: 'renewal_reminder',
        title: `${p.productName} renews ${formatDate(p.endDate)}`,
        body: `Your policy with ${p.carrier} (#${p.policyNumber}) is up for renewal. Review your coverage before it lapses.`,
        link: `/dashboard/policies/${p._id.toString()}`,
        priority: 'normal',
        senderKey,
      });

      renewalsNotified++;

      try {
        await sendAlertEmail(
          user.email,
          `Policy Renewal Coming Up: ${p.productName}`,
          `Your ${p.productName} policy with ${p.carrier} (#${p.policyNumber}) renews on ${formatDate(p.endDate)}. Log in to review your coverage at https://portal.onepointinsuranceagency.com/dashboard/policies/${p._id.toString()}`,
        );
        notification.emailSentAt = new Date();
        await notification.save();
        emailsSent++;
      } catch (err) {
        logger.error('Renewal reminder email failed', { error: String(err), policyId: p._id.toString() });
        emailsFailed++;
      }
    }

    // === Upcoming payment alerts ===
    const upcoming = await BillingRecord.find({
      status: { $in: ['scheduled', 'pending'] },
      dueDate: { $gte: now, $lte: paymentCutoff },
    });

    for (const b of upcoming) {
      const senderKey = `payment_alert:${b._id.toString()}:upcoming`;
      const existing = await Notification.findOne({ userId: b.userId, senderKey });
      if (existing) continue;

      const user = await User.findById(b.userId).select('email name');
      if (!user) continue;

      const source = b.billedBy === 'carrier' ? (b.carrierName || 'the carrier') : 'OnePoint';
      const notification = await Notification.create({
        userId: b.userId,
        userModel: 'Client',
        type: 'payment_alert',
        title: `$${b.amount.toFixed(2)} payment due ${formatDate(b.dueDate)}`,
        body: `Billed by ${source}. Make sure you have funds available to avoid a missed draft.`,
        link: '/dashboard/billing',
        priority: 'normal',
        senderKey,
      });

      upcomingPaymentsNotified++;

      try {
        await sendAlertEmail(
          user.email,
          `Upcoming Payment: $${b.amount.toFixed(2)}`,
          `A $${b.amount.toFixed(2)} payment is scheduled for ${formatDate(b.dueDate)}, billed by ${source}. Log in to see details at https://portal.onepointinsuranceagency.com/dashboard/billing`,
        );
        notification.emailSentAt = new Date();
        await notification.save();
        emailsSent++;
      } catch (err) {
        logger.error('Payment alert email failed', { error: String(err), billingId: b._id.toString() });
        emailsFailed++;
      }
    }

    // === Missed payment alerts — these are HIGH priority ===
    // Using status=missed OR pending with dueDate in the past. Idempotent
    // per record so we don't spam the client; they get one notification
    // when the payment first flips to missed.
    const missed = await BillingRecord.find({
      $or: [
        { status: 'missed' },
        { status: 'pending', dueDate: { $lt: now } },
      ],
    });

    for (const b of missed) {
      const senderKey = `payment_alert:${b._id.toString()}:missed`;
      const existing = await Notification.findOne({ userId: b.userId, senderKey });
      if (existing) continue;

      const user = await User.findById(b.userId).select('email name');
      if (!user) continue;

      const source = b.billedBy === 'carrier' ? (b.carrierName || 'the carrier') : 'OnePoint';
      const notification = await Notification.create({
        userId: b.userId,
        userModel: 'Client',
        type: 'payment_alert',
        title: `Missed payment: $${b.amount.toFixed(2)}`,
        body: `Your payment to ${source} didn't go through. Resolve this to keep your coverage active.`,
        link: '/dashboard/billing',
        priority: 'high',
        senderKey,
      });

      missedPaymentsNotified++;

      try {
        await sendAlertEmail(
          user.email,
          `Action Needed: Missed Payment of $${b.amount.toFixed(2)}`,
          `A payment of $${b.amount.toFixed(2)} billed by ${source} was missed. Log in to resolve at https://portal.onepointinsuranceagency.com/dashboard/billing. Coverage may lapse if not addressed.`,
        );
        notification.emailSentAt = new Date();
        await notification.save();
        emailsSent++;
      } catch (err) {
        logger.error('Missed payment email failed', { error: String(err), billingId: b._id.toString() });
        emailsFailed++;
      }
    }

    return Response.json({
      success: true,
      counts: {
        renewalsNotified,
        upcomingPaymentsNotified,
        missedPaymentsNotified,
        emailsSent,
        emailsFailed,
      },
    });
  } catch (error) {
    logger.error('Client alerts cron error', { error: String(error) });
    return Response.json({ error: 'Cron run failed.' }, { status: 500 });
  }
}
