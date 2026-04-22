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

export async function sendEmployeePasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/employee/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Reset your employee portal password',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="color: #052847; font-size: 22px; margin-bottom: 16px;">Reset your password</h1>
        <p style="color: #1a2e42; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          We received a request to reset your OnePoint employee portal password.
          Click the button below to choose a new one. This link expires in 15 minutes.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background: #052847; color: #fff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase;">
            Reset Password
          </a>
        </div>
        <p style="color: #8a9baa; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email, your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #dde4ed; margin: 32px 0;" />
        <p style="color: #8a9baa; font-size: 11px; text-align: center;">
          OnePoint Insurance Agency, Employee Portal
        </p>
      </div>
    `,
  });
}

export async function sendAccessApprovedEmail(
  to: string,
  name: string,
  provider: string,
  providerName: string
) {
  const authLink = `${process.env.NEXT_PUBLIC_APP_URL}/employee/api/oauth/${provider}`;

  await transporter.sendMail({
    from: `"OnePoint Insurance" <${process.env.SMTP_FROM}>`,
    to,
    subject: `Access Approved: ${providerName}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="color: #052847; font-size: 22px; margin-bottom: 16px;">Access Approved</h1>
        <p style="color: #1a2e42; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #5a6c7e; font-size: 15px; line-height: 1.6;">
          Your request to access <strong style="color: #052847;">${providerName}</strong> has been approved.
          Click the button below to authenticate and start using it.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${authLink}"
             style="background: #052847; color: #fff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase;">
            Connect to ${providerName}
          </a>
        </div>
        <p style="color: #8a9baa; font-size: 13px; line-height: 1.5;">
          This link will redirect you through ${providerName}'s secure login.
          Your authentication timestamp will be recorded by the portal.
        </p>
        <hr style="border: none; border-top: 1px solid #dde4ed; margin: 32px 0;" />
        <p style="color: #8a9baa; font-size: 11px; text-align: center;">
          OnePoint Insurance Agency — Employee Portal
        </p>
      </div>
    `,
  });
}
