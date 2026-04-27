import nodemailer from 'nodemailer';
import { LEAD_SIGNATURE_HTML } from './lead-signature';

// Port 465 → implicit SSL (SMTPS). Port 587 → STARTTLS upgrade from plain.
// We pick `secure` from the port so SMTP_PORT is the only thing that needs
// to change between the two modes (some ISPs/cloud networks block 587 and
// only allow 465, e.g. on residential Comcast/Spectrum).
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  // Fail fast on bad networks instead of hanging the API for ~100s.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

// Sent when a recognized client requests a one-time sign-in code.
export async function sendClientLoginCode(to: string, name: string, code: string) {
  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to,
    subject: `Your OnePoint sign-in code: ${code}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="color: #052847; font-size: 24px; text-align: center; margin-bottom: 24px;">Your sign-in code</h1>
        <p style="color: #1a2e42; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          Use the code below to sign in to your OnePoint client portal. It expires in 10 minutes.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f4f7fb; border: 1.5px solid #dde4ed; padding: 20px 32px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.4em; color: #052847;">
            ${code}
          </div>
        </div>
        <p style="color: #8a9baa; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can ignore this email. No one can access your account without this code.
        </p>
        <hr style="border: none; border-top: 1px solid #dde4ed; margin: 32px 0;" />
        <p style="color: #8a9baa; font-size: 11px; text-align: center;">
          OnePoint Insurance Agency | 888-899-8117
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Welcome to OnePoint Insurance Portal',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #052847; font-size: 24px; margin: 0;">Welcome to OnePoint</h1>
        </div>
        <p style="color: #1a2e42; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          Your client portal is ready. You can now view your policies, manage your coverage,
          and explore ways to save with bundled protection.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login"
             style="background: #4a90d9; color: #fff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase;">
            Go to My Portal
          </a>
        </div>
        <p style="color: #8a9baa; font-size: 13px; line-height: 1.5;">
          Questions? Call us at <a href="tel:888-899-8117" style="color: #4a90d9;">888-899-8117</a> or reply to this email.
        </p>
        <hr style="border: none; border-top: 1px solid #dde4ed; margin: 32px 0;" />
        <p style="color: #8a9baa; font-size: 11px; text-align: center;">
          OnePoint Insurance Agency | 555 NorthPoint Center E, Alpharetta, GA 30022
        </p>
      </div>
    `,
  });
}

export async function sendAlertEmail(to: string, subject: string, message: string) {
  await transporter.sendMail({
    from: `"OnePoint Security" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="color: #dc2626; font-size: 20px;">Security Alert</h1>
        <p style="color: #1a2e42; font-size: 15px; line-height: 1.6;">${message}</p>
        <p style="color: #8a9baa; font-size: 12px; margin-top: 32px;">This is an automated alert from the OnePoint Portal security system.</p>
      </div>
    `,
  });
}

export async function sendCheckoutNotification(to: string, name: string, cartItems: string[], currentTier: string) {
  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Your Bundle Request Has Been Received!',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="color: #052847; font-size: 24px; text-align: center; margin-bottom: 24px;">Bundle Request Received</h1>
        <p style="color: #1a2e42; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          We've received your interest in adding the following coverage:
        </p>
        <ul style="color: #1a2e42; font-size: 15px; line-height: 2; padding-left: 20px;">
          ${cartItems.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          A licensed OnePoint advisor will call you within one business day to review your options,
          compare carriers, and finalize the best rates for your bundle.
        </p>
        <p style="color: #4a90d9; font-size: 14px; font-weight: 700;">
          Current tier: ${currentTier}
        </p>
        <hr style="border: none; border-top: 1px solid #dde4ed; margin: 32px 0;" />
        <p style="color: #8a9baa; font-size: 11px; text-align: center;">
          OnePoint Insurance Agency | 888-899-8117
        </p>
      </div>
    `,
  });
}

// ─────────────────────────────────────────────────────────────────────
// LEAD NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────
// Sent when a public quote form on the marketing site (auto / home / life
// / health) is submitted. The marketing forms POST a JSON payload to
// /api/leads/[type]; this helper turns that payload into a branded email
// to the staff inbox configured via LEADS_NOTIFY_EMAIL.

export type LeadType = 'auto' | 'home' | 'life' | 'health' | 'business';

const LEAD_LABELS: Record<LeadType, string> = {
  auto: 'Auto',
  home: 'Homeowners',
  life: 'Life',
  health: 'Health',
  business: 'Business',
};

// Pull a value from arbitrarily-shaped lead payloads. Auto/health are flat;
// home/life are nested (applicant.first, etc). We try the flat key first
// and fall back to known nested locations so one helper handles all four.
function pick(payload: Record<string, unknown>, ...paths: string[]): string {
  for (const path of paths) {
    const segments = path.split('.');
    let cur: unknown = payload;
    for (const seg of segments) {
      if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && cur !== null && cur !== '') return String(cur);
  }
  return '';
}

export async function sendLeadNotification(
  type: LeadType,
  payload: Record<string, unknown>
) {
  const to = process.env.LEADS_NOTIFY_EMAIL || 'info@onepointinsuranceagency.com';
  const label = LEAD_LABELS[type];

  const firstName = pick(payload, 'first_name', 'applicant.first');
  const lastName  = pick(payload, 'last_name', 'applicant.last');
  const fullName  = `${firstName} ${lastName}`.trim() || 'New lead';
  const email     = pick(payload, 'email', 'applicant.email', 'c_email');
  const phone     = pick(payload, 'phone', 'applicant.phone', 'c_phone');
  const zip       = pick(payload, 'postal_code', 'zip', 'quick_quote.zip', 'demographics.zip');
  const reference = pick(payload, 'reference', 'reference_number');
  const pdfUrl    = pick(payload, 'pdf_summary_url');
  const fullText  = pick(payload, 'full_submission', 'email_body');

  // Pre-built subject (auto form sets these); otherwise build it.
  const subject = pick(payload, 'email_subject')
    || `New ${label} Quote — ${fullName}${zip ? ` | ${zip}` : ''}`;

  // Plain-text fallback so spam filters get a multipart message.
  const textBody = [
    `New ${label} quote lead`,
    `─────────────────────────────`,
    `Name:      ${fullName}`,
    `Email:     ${email || '—'}`,
    `Phone:     ${phone || '—'}`,
    `ZIP:       ${zip || '—'}`,
    reference ? `Reference: ${reference}` : '',
    pdfUrl ? `\nPDF:       ${pdfUrl}` : '',
    fullText ? `\n\n${fullText}` : '',
  ].filter(Boolean).join('\n');

  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; color: #1a2e42;">
      <div style="background: #052847; color: #fff; padding: 20px 24px; border-radius: 10px 10px 0 0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.6);">New ${label} Quote</div>
        <div style="font-size: 22px; font-weight: 700; margin-top: 4px;">${escape(fullName)}</div>
        ${reference ? `<div style="font-size: 12px; color: rgba(255,255,255,.55); margin-top: 6px; font-family: 'Courier New', monospace;">Ref ${escape(reference)}</div>` : ''}
      </div>
      <div style="background: #fff; border: 1px solid #dde4ed; border-top: none; border-radius: 0 0 10px 10px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #5a6c7e; width: 90px; vertical-align: top;">Email</td><td style="padding: 8px 0;">${email ? `<a href="mailto:${escape(email)}" style="color:#0a3d6b">${escape(email)}</a>` : '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5a6c7e; vertical-align: top;">Phone</td><td style="padding: 8px 0;">${phone ? `<a href="tel:${escape(phone)}" style="color:#0a3d6b">${escape(phone)}</a>` : '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #5a6c7e; vertical-align: top;">ZIP</td><td style="padding: 8px 0;">${escape(zip) || '—'}</td></tr>
        </table>
        ${pdfUrl ? `
        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${escape(pdfUrl)}" style="display: inline-block; background: #052847; color: #fff; padding: 12px 24px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 14px;">Download PDF Summary</a>
        </div>` : ''}
        ${fullText ? `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #dde4ed;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #5a6c7e; margin-bottom: 10px;">Full submission</div>
          <pre style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.55; color: #1a2e42; background: #f4f7fb; padding: 16px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; margin: 0;">${escape(fullText)}</pre>
        </div>` : ''}
      </div>
      <p style="color: #8a9baa; font-size: 11px; text-align: center; margin: 16px 0 24px;">
        Sent automatically from the OnePoint marketing site. Reply directly to contact the lead.
      </p>
      ${LEAD_SIGNATURE_HTML}
    </div>
  `;

  await transporter.sendMail({
    from: `"OnePoint Quotes" <${process.env.SMTP_FROM}>`,
    to,
    replyTo: email || undefined, // staff can hit Reply to email the lead
    subject,
    text: textBody,
    html: htmlBody,
  });
}

// Confirmation email back to the lead. Intentionally short and contains
// no PDF / full-submission data, since that includes sensitive fields
// (SSN, DOB, etc.) we don't want to re-transmit over plain email.
// Returns silently if the lead didn't provide an email address.
export async function sendLeadConfirmation(
  type: LeadType,
  payload: Record<string, unknown>
) {
  const email = pick(payload, 'email', 'applicant.email', 'c_email');
  if (!email) return; // nothing to confirm to

  const label = LEAD_LABELS[type];
  const firstName = pick(payload, 'first_name', 'applicant.first');
  const reference = pick(payload, 'reference', 'reference_number');
  const greeting  = firstName ? `Hi ${firstName},` : 'Hi there,';
  const article   = type === 'auto' ? 'an auto' : type === 'home' ? 'a home' : `a ${label.toLowerCase()}`;

  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const textBody = [
    greeting,
    '',
    `Thanks for requesting ${article} insurance quote with OnePoint Insurance Agency. We've received your information and a licensed advisor will be in touch within one business day.`,
    '',
    reference ? `Your reference number: ${reference}` : '',
    '',
    'Need to reach us sooner?',
    'Toll-Free: 1-888-899-8117',
    'Local:     770-884-8117',
    'Email:     info@onepointinsuranceagency.com',
    '',
    '— The OnePoint Team',
  ].filter(Boolean).join('\n');

  const htmlBody = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1a2e42;">
      <h1 style="color: #052847; font-size: 22px; margin: 0 0 18px; font-weight: 700;">We received your ${escape(label)} quote request</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #1a2e42; margin: 0 0 14px;">${escape(greeting)}</p>
      <p style="font-size: 15px; line-height: 1.6; color: #1a2e42; margin: 0 0 14px;">
        Thanks for requesting ${article} insurance quote with OnePoint Insurance Agency. We've received your information and a licensed advisor will be in touch within <strong>one business day</strong>.
      </p>
      ${reference ? `
      <div style="background: #f4f7fb; border: 1px solid #dde4ed; border-left: 4px solid #052847; padding: 14px 18px; margin: 22px 0; border-radius: 0 6px 6px 0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #5a6c7e; margin-bottom: 4px;">Your reference number</div>
        <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #052847; letter-spacing: .04em;">${escape(reference)}</div>
      </div>` : ''}
      <p style="font-size: 14px; color: #5a6c7e; line-height: 1.6; margin: 22px 0 18px;">Need to reach us sooner? Use the contact info below.</p>
      ${LEAD_SIGNATURE_HTML}
    </div>
  `;

  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to: email,
    replyTo: 'info@onepointinsuranceagency.com',
    subject: `We received your ${label} quote request${reference ? ` (Ref ${reference})` : ''}`,
    text: textBody,
    html: htmlBody,
  });
}
