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

// Sends a confirmation email to the student who submitted the enquiry —
// reassures them it went through, without waiting on a human reply.
// Also fire-and-forget; a failure here should never affect the saved enquiry.
async function sendStudentConfirmation(entry) {
  const transporter = getTransporter();
  if (!transporter) return { sent: false, reason: 'Email not configured' };
  if (!entry.email) return { sent: false, reason: 'No student email' };

  try {
    await transporter.sendMail({
      from: `"Everest Aviation Academy" <${process.env.EMAIL_USER}>`,
      to: entry.email,
      subject: `We've received your enquiry — Everest Aviation Academy`,
      text: [
        `Hi ${entry.name},`,
        ``,
        `Thank you for reaching out to Everest Aviation Academy! We've received your enquiry for:`,
        ``,
        `Course: ${entry.course}`,
        ``,
        `Our admissions team will contact you shortly at ${entry.phone || entry.email} to guide you through the next steps.`,
        ``,
        `If you have any urgent questions in the meantime, feel free to call us at +91 90330 21835 or reply to this email.`,
        ``,
        `Warm regards,`,
        `Everest Aviation Academy`,
        `E 404, Galaxy Arcade, Opp. Galaxy Cinema, Naroda, Ahmedabad – 382330`
      ].join('\n')
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: 'Send failed' };
  }
}

module.exports = { sendEnquiryNotification, sendStudentConfirmation };
