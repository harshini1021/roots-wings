const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER) {
    // Email is optional — just log it during development
    console.log(`[Email skipped — no SMTP] To: ${to} | ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  } catch (err) {
    console.error('[Email failed]', err.message);
  }
};

const BASE = (content) => `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#faf9f6">
    <div style="background:#0F6E56;border-radius:10px 10px 0 0;padding:20px 28px">
      <h2 style="color:#fff;margin:0;font-size:20px">🌿 Roots &amp; Wings</h2>
    </div>
    <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:28px">
      ${content}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;margin:0">— The Roots &amp; Wings Team</p>
    </div>
  </div>`;

const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Roots & Wings!',
    html: BASE(`
      <h3>Welcome, ${name}!</h3>
      <p>Your alumni registration has been submitted successfully.</p>
      <p>Our admin will review your profile within 24 hours and send you another email once approved.</p>`),
  }),
  approved: (name) => ({
    subject: '✅ Your alumni profile is approved!',
    html: BASE(`
      <h3>Congratulations, ${name}!</h3>
      <p>Your alumni registration has been <strong>approved</strong>. You're now part of the Roots &amp; Wings community.</p>
      <a href="${process.env.FRONTEND_URL}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F6E56;color:#fff;text-decoration:none;border-radius:8px">Go to portal →</a>`),
  }),
  rejected: (name) => ({
    subject: 'Update on your alumni registration',
    html: BASE(`
      <h3>Hello, ${name}</h3>
      <p>We were unable to approve your registration at this time. Please contact admin at <a href="mailto:${process.env.SMTP_USER}">${process.env.SMTP_USER}</a> for more details.</p>`),
  }),
  mentorRequest: (mentorName, fromName, message) => ({
    subject: `Mentorship request from ${fromName}`,
    html: BASE(`
      <h3>Hi ${mentorName},</h3>
      <p><strong>${fromName}</strong> has sent you a mentorship request.</p>
      ${message ? `<blockquote style="border-left:3px solid #0F6E56;margin:16px 0;padding:10px 16px;background:#f0faf5;color:#333">${message}</blockquote>` : ''}
      <p>Sign in to the portal to respond.</p>`),
  }),
  passwordReset: (name, resetUrl) => ({
    subject: 'Reset your Roots & Wings password',
    html: BASE(`
      <h3>Hi ${name},</h3>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F6E56;color:#fff;text-decoration:none;border-radius:8px">Reset password →</a>
      <p style="margin-top:16px;color:#999;font-size:12px">If you didn't request this, you can safely ignore this email.</p>`),
  }),
};

module.exports = { sendEmail, emailTemplates };
