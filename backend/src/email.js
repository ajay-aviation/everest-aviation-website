const nodemailer = require('nodemailer');

function getTransporter() {
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS || EMAIL_PASS.includes('xxxx')) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
}

// Sends a plain notification email. Never throws — a failed email should
// never block saving the enquiry, so callers can fire-and-forget this.
async function sendEnquiryNotification(entry) {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'Email not configured' };

  const to = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;

  try {
    await transporter.sendMail({
      from: `"Everest Aviation Website" <${process.env.EMAIL_USER}>`,
      to,
      subject: `New Enquiry — ${entry.name} (${entry.course})`,
      text: [
        `New enquiry received on the website:`,
        ``,
        `Name: ${entry.name}`,
        `Email: ${entry.email}`,
        `Phone: ${entry.phone}`,
        `Course: ${entry.course}`,
        `Message: ${entry.message || '-'}`,
        `Submitted: ${entry.submittedAt}`
      ].join('\n')
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'Send failed' };
  }
}

module.exports = { sendEnquiryNotification };
