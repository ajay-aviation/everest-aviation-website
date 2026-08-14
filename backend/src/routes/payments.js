const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const router = express.Router();
const db = require('../db');

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret || key_id.includes('xxxx')) return null;
  return new Razorpay({ key_id, key_secret });
}

// POST /api/payments/create-order
// body: { amount (INR, optional), name, email, course }
router.post('/create-order', async (req, res) => {
  const instance = getRazorpayInstance();
  if (!instance) {
    return res.status(500).json({
      ok: false,
      error: 'Payment gateway is not configured yet. Add real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env'
    });
  }

  const amountInr = Number(req.body?.amount) || Number(process.env.DEFAULT_FEE_INR) || 500;
  if (amountInr <= 0) return res.status(400).json({ ok: false, error: 'Invalid amount' });

  try {
    const order = await instance.orders.create({
      amount: Math.round(amountInr * 100), // paise
      currency: 'INR',
      receipt: 'eaa_' + Date.now(),
      notes: {
        name: req.body?.name || '',
        email: req.body?.email || '',
        course: req.body?.course || ''
      }
    });
    res.json({ ok: true, order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Could not create payment order' });
  }
});

// POST /api/payments/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, course }
router.post('/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, course } = req.body || {};
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Missing payment details' });
  }

  const expected = crypto
    .createHmac('sha256', key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = expected === razorpay_signature;

  if (isValid) {
    try {
      await db.insert('payments', {
        razorpay_order_id,
        razorpay_payment_id,
        name: name || '',
        email: email || '',
        course: course || '',
        verifiedAt: new Date().toISOString()
      });
    } catch (err) {
      // Payment is still valid even if the save fails — don't block the response
    }
  }

  res.json({ ok: isValid, verified: isValid });
});

module.exports = router;
