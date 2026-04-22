import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Policy from '@/models/Policy';
import { hmacEmail } from '@/lib/security/encryption';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';

function verifyWebhookSecret(provided: string | null): boolean {
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Inbound webhook from GHL — receives policy updates when advisor binds a new policy
export async function POST(req: NextRequest) {
  const { ip, userAgent } = getRequestInfo(req);

  // Verify shared secret before reading body. GHL workflow "Outbound Webhook"
  // action is configured to send x-webhook-secret matching GHL_WEBHOOK_SECRET.
  const provided = req.headers.get('x-webhook-secret');
  if (!verifyWebhookSecret(provided)) {
    auditLog({
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.WEBHOOK_AUTH_FAILED,
      status: 'failure',
      severity: 'critical',
      details: { endpoint: 'ghl-webhook', reason: provided ? 'mismatch' : 'missing' },
    });
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await req.json();

    const { type, email, contactId } = payload;

    if (!email) {
      return Response.json({ error: 'Email required in payload.' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ hmacEmail: hmacEmail(email) });
    if (!user) {
      // User not in portal yet — log and return
      logger.info('GHL webhook: no portal user found', { email });
      return Response.json({ received: true, matched: false });
    }

    // Handle different event types
    if (type === 'ContactUpdate' || type === 'PolicyUpdate') {
      // If GHL sends policy data in custom fields, sync it
      const { customFields } = payload;
      if (customFields && Array.isArray(customFields)) {
        for (const field of customFields) {
          if (field.key?.startsWith('policy_') && field.value) {
            // Parse: "Progressive #12345 - Auto Insurance"
            const parts = field.value.split(' - ');
            const carrierAndNumber = parts[0] || '';
            const productName = parts[1] || field.key.replace('policy_', '');
            const [carrier, policyNumber] = carrierAndNumber.split(' #');

            await Policy.findOneAndUpdate(
              { userId: user._id, productName },
              {
                userId: user._id,
                userEmail: email.toLowerCase(),
                productName,
                productCategory: inferCategory(productName),
                carrier: carrier || 'Unknown',
                policyNumber: policyNumber || `GHL-${Date.now()}`,
                status: 'active',
              },
              { upsert: true }
            );
          }
        }
      }
    }

    return Response.json({ received: true, matched: true, userId: user._id });
  } catch (error) {
    logger.error('GHL webhook error', { error: String(error) });
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}

function inferCategory(productName: string): string {
  const lower = productName.toLowerCase();
  if (['auto', 'motorcycle', 'boat', 'atv', 'rv', 'scooter', 'snowmobile', 'classic'].some(k => lower.includes(k))) return 'auto';
  if (['home', 'condo', 'renters', 'flood', 'landlord', 'umbrella', 'mobile'].some(k => lower.includes(k))) return 'home';
  if (['health', 'dental', 'vision', 'medicare', 'medical', 'hospital', 'accident'].some(k => lower.includes(k))) return 'health';
  if (['life', 'term', 'whole', 'universal', 'final expense', 'annuity'].some(k => lower.includes(k))) return 'life';
  if (['disability', 'overhead'].some(k => lower.includes(k))) return 'disability';
  if (['liability', 'commercial', 'workers', 'cyber', 'trucking', 'garage', 'bop', 'malpractice'].some(k => lower.includes(k))) return 'business';
  return 'auto';
}
