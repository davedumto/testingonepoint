import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
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
