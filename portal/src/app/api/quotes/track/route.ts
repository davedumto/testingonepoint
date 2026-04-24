import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import PendingQuote from '@/models/PendingQuote';
import { productByKey } from '@/lib/quote-catalog';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { auditLog, AUDIT_ACTIONS } from '@/lib/security/audit-log';
import { getRequestInfo } from '@/lib/security/request-info';
import { safeValidate } from '@/lib/security/validation';
import { logger } from '@/lib/logger';

// POST /api/quotes/track — called by the Quote Center when a client clicks
// a product card. We log the click as a PendingQuote (status='incomplete')
// so the My Quotes page has a row to show, and audit-log it for compliance.
//
// The actual form submission happens on the marketing site; a separate
// webhook (/api/webhooks/ghl) is responsible for flipping the quote to
// 'submitted' once GHL sees the lead come in.
const schema = z.object({
  productKey: z.string().min(1).max(60),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { ip, userAgent } = getRequestInfo(req);

  // High-ceiling rate limit — clicking around the catalog is normal behavior,
  // but a run-away script could spam activities. API tier is fine.
  const rateKey = getRateLimitKey(ip, 'quote-track');
  const rateResult = await checkRateLimit(rateKey, RATE_LIMITS.api);
  if (!rateResult.allowed) return Response.json({ error: 'Slow down.' }, { status: 429 });

  try {
    const body = await req.json();
    const validation = safeValidate(schema, body);
    if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

    const product = productByKey(validation.data.productKey);
    if (!product) return Response.json({ error: 'Unknown product.' }, { status: 400 });

    await connectDB();

    // Upsert: if the client already has an in-flight quote for this product,
    // just bump updatedAt rather than creating duplicates. Keeps "My Quotes"
    // clean when the same client clicks Auto Insurance 3 times.
    const existing = await PendingQuote.findOne({
      userId: user.userId,
      productName: product.name,
      status: { $in: ['incomplete', 'submitted', 'in_review'] },
    });

    if (existing) {
      existing.updatedAt = new Date();
      await existing.save();
    } else {
      await PendingQuote.create({
        userId: user.userId,
        productName: product.name,
        productCategory: product.group,
        formData: { source: 'quote_center', startedAt: new Date().toISOString() },
        status: 'incomplete',
      });
    }

    auditLog({
      userId: user.userId,
      userEmail: user.email,
      ipAddress: ip,
      userAgent,
      action: AUDIT_ACTIONS.DATA_ACCESS,
      status: 'success',
      details: { context: 'quote_started', productKey: product.key, group: product.group },
    });

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Quote track error', { error: String(error) });
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
