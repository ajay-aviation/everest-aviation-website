const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendEnquiryNotification, sendStudentConfirmation } = require('../email');

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

// POST /api/enquiries — public, called from the contact form
router.post('/', async (req, res) => {
  const { name, email, phone, course, message, website } = req.body || {};

  // Honeypot — real users never fill this hidden field, only bots do
  if (website && website.trim() !== '') {
    return res.status(201).json({ ok: true, id: 'skipped' });
  }

  if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'Name is required' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'Valid email is required' });
  if (!phone || !PHONE_RE.test(phone)) return res.status(400).json({ ok: false, error: 'Valid phone number is required' });
  if (!course || !course.trim()) return res.status(400).json({ ok: false, error: 'Please select a course' });

  try {
    const saved = await db.insert('enquiries', {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      course: course.trim(),
      message: (message || '').trim(),
      submittedAt: new Date().toISOString()
    });

    res.status(201).json({ ok: true, id: saved.id });

    // Fire-and-forget — don't delay the response waiting on email delivery
    sendEnquiryNotification(saved);
    sendStudentConfirmation(saved);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Could not save enquiry. Please try again.' });
  }
});

// GET /api/enquiries — admin only, requires x-admin-key header
router.get('/', requireAdmin, async (req, res) => {
  try {
    const all = (await db.readAll('enquiries')).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    res.json({ ok: true, count: all.length, enquiries: all });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Could not load enquiries' });
  }
});

module.exports = router;
