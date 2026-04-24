// Diagnostic: attempts an SMTP connection + sends a test email. Shows the
// real error instead of the fire-and-forget swallow the OTP route does.

import nodemailer from 'nodemailer';

const TO = 'ejeredavid2001@gmail.com';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  // Surface handshake errors fast rather than letting them hang.
  connectionTimeout: 15000,
  greetingTimeout: 15000,
});

console.log('SMTP config:');
console.log('  host:', process.env.SMTP_HOST);
console.log('  port:', process.env.SMTP_PORT);
console.log('  user:', process.env.SMTP_EMAIL);
console.log('  pass set:', !!process.env.SMTP_PASSWORD, 'length:', (process.env.SMTP_PASSWORD || '').length);
console.log('  from:', process.env.SMTP_FROM);
console.log('');

console.log('→ Verifying SMTP connection…');
try {
  await transporter.verify();
  console.log('✅ SMTP connection verified.');
} catch (err) {
  console.error('❌ SMTP verify failed:');
  console.error('  message:', err?.message);
  console.error('  code:', err?.code);
  console.error('  response:', err?.response);
  process.exit(1);
}

console.log('→ Sending test email to', TO, '…');
try {
  const info = await transporter.sendMail({
    from: `"OnePoint Portal Test" <${process.env.SMTP_FROM}>`,
    to: TO,
    subject: 'SMTP diagnostic test',
    text: 'If you see this, SMTP is working. You can delete this email.',
  });
  console.log('✅ Sent. messageId:', info.messageId);
  console.log('   envelope:', JSON.stringify(info.envelope));
  console.log('   response:', info.response);
} catch (err) {
  console.error('❌ Send failed:');
  console.error('  message:', err?.message);
  console.error('  code:', err?.code);
  console.error('  response:', err?.response);
  console.error('  responseCode:', err?.responseCode);
  process.exit(1);
}
