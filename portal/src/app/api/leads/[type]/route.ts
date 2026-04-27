import { NextRequest } from 'next/server';
import { sendLeadConfirmation, sendLeadNotification, type LeadType } from '@/lib/email';
import { checkRateLimit, getRateLimitKey } from '@/lib/security/rate-limiter';
import { getRequestInfo } from '@/lib/security/request-info';
import { logger } from '@/lib/logger';
import { renderAutoQuotePdf } from '@/lib/pdf/render';
import { uploadBuffer, isCloudinaryConfigured } from '@/lib/cloudinary';

// React-PDF renders with Node APIs (Buffer/fs); pin to the Node runtime.
export const runtime = 'nodejs';

// POST /api/leads/[type]
// Public endpoint, called from the marketing site quote forms
// (auto/home/life/health). The form POSTs the JSON payload it would have
// sent to GHL; we email the staff inbox instead. CORS is open to the
// marketing site origins. Rate-limited per IP to keep abuse cheap.

const ALLOWED_TYPES = ['auto', 'home', 'life', 'health', 'business'] as const;

// Origins the marketing site might be served from. We echo the request's
// Origin back if it matches; otherwise we omit the header (browsers will
// then refuse the response, which is what we want for unknown callers).
const ALLOWED_ORIGINS = new Set([
  'https://onepointinsuranceagency.com',
  'https://www.onepointinsuranceagency.com',
]);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  const { type: rawType } = await params;
  const type = rawType as LeadType;

  if (!ALLOWED_TYPES.includes(type)) {
    return Response.json(
      { error: `Unknown lead type "${rawType}". Expected one of: ${ALLOWED_TYPES.join(', ')}.` },
      { status: 400, headers: cors }
    );
  }

  // 30 submissions per IP per hour. Generous because the forms are long
  // and humans occasionally double-submit; tight enough to make scripted
  // abuse expensive.
  const { ip, userAgent } = getRequestInfo(req);
  const limit = await checkRateLimit(getRateLimitKey(ip, `leads:${type}`), {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return Response.json(
      { error: 'Too many submissions, try again later.' },
      { status: 429, headers: cors }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400, headers: cors });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return Response.json({ error: 'Body must be a JSON object.' }, { status: 400, headers: cors });
  }

  // Honeypot: if a hidden form field named `_hp` is filled, it's a bot.
  // Forms don't render this field; humans never see it. Quietly accept
  // (don't 4xx) so bots can't probe for the check.
  if (typeof payload._hp === 'string' && payload._hp.trim()) {
    logger.info('Lead honeypot hit', { ip, userAgent, type });
    return Response.json({ ok: true }, { status: 200, headers: cors });
  }

  // ── Cloudflare Turnstile verification ──
  // Validate the token before doing any real work. Bots that bypass
  // honeypot still need a valid token from the rendered widget.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    logger.error('TURNSTILE_SECRET_KEY not configured');
    return Response.json({ error: 'Server not configured.' }, { status: 500, headers: cors });
  }
  const token = typeof payload.turnstile_token === 'string' ? payload.turnstile_token : '';
  if (!token) {
    return Response.json({ error: 'Missing security token.' }, { status: 400, headers: cors });
  }
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
    });
    const result = (await verify.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      logger.warn('Turnstile verification failed', { type, ip, codes: result['error-codes'] });
      return Response.json({ error: 'Security check failed.' }, { status: 403, headers: cors });
    }
  } catch (err) {
    logger.error('Turnstile verify request failed', { type, ip, error: String(err) });
    return Response.json({ error: 'Security check unavailable.' }, { status: 502, headers: cors });
  }
  // Strip the token from the payload so it doesn't end up in the email.
  delete payload.turnstile_token;

  // ── Server-side PDF generation (auto only for now) ──
  // We build the PDF before sending the staff email so the email body can
  // include the Cloudinary download link. Failure here is non-fatal: we
  // still send the email + show the lead success screen, just without a
  // PDF link. The raw payload is captured in the email's text section.
  let pdfUrl = '';
  if (type === 'auto') {
    try {
      const pdfBuf = await renderAutoQuotePdf(payload);
      if (isCloudinaryConfigured()) {
        const ref = String(payload.reference || payload.reference_number || Date.now());
        const safeRef = ref.replace(/[^A-Za-z0-9_-]/g, '');
        const upload = await uploadBuffer(pdfBuf, {
          folder: 'leads/auto',
          publicId: `${safeRef}_${Date.now()}`,
          resourceType: 'raw',
        });
        pdfUrl = upload.secure_url;
        payload.pdf_summary_url = pdfUrl;
      } else {
        logger.warn('Cloudinary not configured — skipping PDF upload', { type });
      }
    } catch (err) {
      logger.error('Lead PDF generation failed', { type, ip, error: String(err) });
      // Continue without a PDF rather than failing the whole submission.
    }
  }

  // Staff notification is the priority — if it fails, we 502 so the form
  // shows an error and the lead can retry.
  try {
    await sendLeadNotification(type, payload);
  } catch (err) {
    logger.error('Lead staff email failed', { type, ip, error: String(err) });
    return Response.json(
      { error: 'Could not send notification. Please try again.' },
      { status: 502, headers: cors }
    );
  }

  // Lead confirmation is best-effort. A bad/typo'd email shouldn't lose
  // the lead — staff already has the data, log and move on.
  sendLeadConfirmation(type, payload).catch((err) => {
    logger.warn('Lead confirmation email failed', { type, ip, error: String(err) });
  });

  return Response.json({ ok: true, pdf_url: pdfUrl || null }, { status: 200, headers: cors });
}
