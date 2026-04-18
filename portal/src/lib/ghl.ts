// GoHighLevel webhook integration

import { logger } from '@/lib/logger';

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL;

interface GHLPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  source: string;
  [key: string]: unknown;
}

export async function sendToGHL(payload: GHLPayload) {
  if (!GHL_WEBHOOK_URL) {
    logger.warn('GHL_WEBHOOK_URL not configured — skipping webhook');
    return { success: false, reason: 'no_webhook_url' };
  }

  try {
    logger.info('GHL webhook sending', { url: GHL_WEBHOOK_URL });

    const response = await fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    logger.info('GHL webhook response', { status: response.status });

    if (!response.ok) {
      logger.error('GHL webhook failed', { status: response.status });
      return { success: false, reason: 'webhook_error', status: response.status };
    }

    return { success: true };
  } catch (error) {
    logger.error('GHL webhook error', { error: String(error) });
    return { success: false, reason: 'network_error' };
  }
}

export async function sendCartCheckout(
  user: { name: string; email: string; phone?: string },
  cartItems: string[],
  existingPolicies: string[],
  currentTier: string
) {
  const [firstName, ...lastParts] = user.name.split(' ');
  return sendToGHL({
    firstName,
    lastName: lastParts.join(' ') || undefined,
    email: user.email,
    phone: user.phone,
    source: 'Client Portal - Bundle Request',
    currentTier,
    cartItems: cartItems.join(', '),
    existingPolicies: existingPolicies.join(', '),
    requestType: 'bundle_checkout',
    timestamp: new Date().toISOString(),
  });
}

export async function sendCallBooking(
  user: { name: string; email: string },
  topic: string,
  preferredDate: string,
  preferredTime: string,
  phone: string,
  notes?: string
) {
  const [firstName, ...lastParts] = user.name.split(' ');
  return sendToGHL({
    firstName,
    lastName: lastParts.join(' ') || undefined,
    email: user.email,
    phone,
    source: 'Client Portal - Call Booking',
    callTopic: topic,
    preferredDate,
    preferredTime,
    notes: notes || '',
    requestType: 'call_booking',
    timestamp: new Date().toISOString(),
  });
}

export async function sendFormSubmission(
  user: { name: string; email: string },
  productName: string,
  formData: Record<string, unknown>
) {
  const [firstName, ...lastParts] = user.name.split(' ');
  return sendToGHL({
    firstName,
    lastName: lastParts.join(' ') || undefined,
    email: user.email,
    source: 'Client Portal - Form Submission',
    productName,
    requestType: 'form_completion',
    ...formData,
    timestamp: new Date().toISOString(),
  });
}
