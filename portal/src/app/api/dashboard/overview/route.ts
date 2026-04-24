import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';
import BillingRecord from '@/models/BillingRecord';
import ServiceRequest from '@/models/ServiceRequest';
import Claim from '@/models/Claim';
import ClientMessage from '@/models/ClientMessage';
import { logger } from '@/lib/logger';

// Everything the dashboard home needs in one round-trip. Alerts are computed
// on read (not stored) so they always reflect live state — no risk of stale
// Notification docs drifting out of sync with policies/billing.

const RENEWAL_WINDOW_DAYS = 60;
const UPCOMING_PAYMENT_DAYS = 30;

interface OverviewAction {
  kind: 'renewal' | 'payment' | 'service_request' | 'claim';
  id: string;
  title: string;
  detail: string;
  dueDate?: Date | string;
  href: string;
}

interface OverviewAlert {
  severity: 'warning' | 'error';
  title: string;
  detail: string;
  href: string;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    const userDoc = await User.findById(user.userId).select('firstName lastName name tier assignedAgent');
    if (!userDoc) return Response.json({ error: 'User not found.' }, { status: 404 });

    const [allPolicies, billing, serviceRequests, claims, messagesPreview, unreadMessages] = await Promise.all([
      Policy.find({ userId: user.userId }).sort({ createdAt: -1 }),
      BillingRecord.find({ userId: user.userId }).sort({ dueDate: 1 }),
      ServiceRequest.find({ userId: user.userId, status: { $in: ['submitted', 'in_progress', 'waiting_on_client'] } }).sort({ createdAt: -1 }),
      Claim.find({ userId: user.userId, status: { $in: ['reported', 'under_review', 'in_progress'] } }).sort({ createdAt: -1 }),
      ClientMessage.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(3),
      ClientMessage.countDocuments({ userId: user.userId, senderType: 'agent', readByClient: { $ne: true } }),
    ]);

    const now = new Date();
    const activePolicies = allPolicies.filter(p => p.status === 'active');

    // === Stats
    const monthlyPremium = activePolicies.reduce((sum, p) => sum + (p.premium || 0), 0);

    const nextPaymentRecord = billing.find(b => (b.status === 'scheduled' || b.status === 'pending') && b.dueDate.getTime() >= now.getTime());
    const nextPaymentDue = nextPaymentRecord ? {
      date: nextPaymentRecord.dueDate,
      amount: nextPaymentRecord.amount,
      carrier: nextPaymentRecord.carrierName,
      billedBy: nextPaymentRecord.billedBy,
    } : null;

    const renewalCutoff = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const renewingPolicies = activePolicies.filter(p => p.endDate && p.endDate.getTime() <= renewalCutoff.getTime() && p.endDate.getTime() >= now.getTime());

    // === Upcoming actions (cap at 6 for cards UI)
    const upcomingActions: OverviewAction[] = [];
    for (const p of renewingPolicies.slice(0, 3)) {
      upcomingActions.push({
        kind: 'renewal',
        id: p._id.toString(),
        title: `${p.productName} renewal`,
        detail: `${p.carrier} · ${p.policyNumber}`,
        dueDate: p.endDate,
        href: `/dashboard/policies/${p._id}`,
      });
    }
    const upcomingPaymentCutoff = new Date(now.getTime() + UPCOMING_PAYMENT_DAYS * 24 * 60 * 60 * 1000);
    for (const b of billing.filter(x => (x.status === 'scheduled' || x.status === 'pending') && x.dueDate.getTime() <= upcomingPaymentCutoff.getTime() && x.dueDate.getTime() >= now.getTime()).slice(0, 2)) {
      upcomingActions.push({
        kind: 'payment',
        id: b._id.toString(),
        title: `Payment of $${b.amount.toFixed(2)}`,
        detail: b.billedBy === 'carrier' ? `Direct draft from ${b.carrierName || 'carrier'}` : 'Drafted by OnePoint',
        dueDate: b.dueDate,
        href: `/dashboard/billing`,
      });
    }
    for (const sr of serviceRequests.filter(r => r.status === 'waiting_on_client').slice(0, 2)) {
      upcomingActions.push({
        kind: 'service_request',
        id: sr._id.toString(),
        title: 'A service request needs your reply',
        detail: sr.description.slice(0, 80),
        href: `/dashboard/service-requests/${sr._id}`,
      });
    }

    // === Alerts — derived from live state
    const alerts: OverviewAlert[] = [];
    const missedPayments = billing.filter(b => b.status === 'missed' || (b.status === 'pending' && b.dueDate.getTime() < now.getTime()));
    for (const m of missedPayments) {
      alerts.push({
        severity: 'error',
        title: `Missed payment of $${m.amount.toFixed(2)}`,
        detail: m.billedBy === 'carrier' ? `From ${m.carrierName || 'carrier'}` : 'OnePoint draft',
        href: '/dashboard/billing',
      });
    }
    const cancellations = allPolicies.filter(p => p.status === 'cancelled' || p.status === 'reinstatement_needed');
    for (const c of cancellations) {
      alerts.push({
        severity: 'error',
        title: `${c.productName} needs attention`,
        detail: c.status === 'reinstatement_needed' ? 'Reinstatement needed' : 'Policy is cancelled',
        href: `/dashboard/policies/${c._id}`,
      });
    }
    // Imminent renewals (< 14 days) get an alert; longer ones live under Upcoming Actions only.
    const imminentCutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const imminentRenewals = renewingPolicies.filter(p => p.endDate && p.endDate.getTime() <= imminentCutoff.getTime());
    for (const p of imminentRenewals) {
      alerts.push({
        severity: 'warning',
        title: `${p.productName} renews soon`,
        detail: `With ${p.carrier} on ${p.endDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        href: `/dashboard/policies/${p._id}`,
      });
    }

    // === Protection Portfolio — active policies, newest first, capped to 5
    const portfolio = activePolicies.slice(0, 5).map(p => ({
      _id: p._id.toString(),
      productName: p.productName,
      productCategory: p.productCategory,
      carrier: p.carrier,
      policyNumber: p.policyNumber,
      status: p.status,
      premium: p.premium,
      endDate: p.endDate,
      billingType: p.billingType,
    }));

    return Response.json({
      user: {
        firstName: userDoc.firstName || (userDoc.name?.split(' ')[0] ?? ''),
        name: userDoc.name,
        tier: userDoc.tier,
        assignedAgent: userDoc.assignedAgent,
        unreadMessages,
      },
      stats: {
        activePolicies: activePolicies.length,
        monthlyPremium,
        nextPaymentDue,
        renewalsDue: renewingPolicies.length,
        openRequests: serviceRequests.length,
        openClaims: claims.length,
      },
      portfolio,
      upcomingActions,
      alerts,
      messagesPreview: messagesPreview.map(m => ({
        _id: m._id.toString(),
        senderType: m.senderType,
        body: m.body.slice(0, 140),
        createdAt: m.createdAt,
        readByClient: m.readByClient,
      })),
    });
  } catch (error) {
    logger.error('Dashboard overview error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
