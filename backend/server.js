require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const enquiriesRouter = require('./src/routes/enquiries');
const paymentsRouter = require('./src/routes/payments');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

// Rate limit form submissions: max 5 per IP every 10 minutes.
// Stops someone from spamming the enquiry form or flooding the database.
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many submissions. Please try again in a few minutes.' }
});
app.use('/api/enquiries', formLimiter);
app.use('/api/payments', formLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'everest-aviation-backend' }));

app.use('/api/enquiries', enquiriesRouter);
app.use('/api/payments', paymentsRouter);

// Fallback for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// Central error handler — keeps responses clean, no stack traces leaked to client
app.use((err, req, res, next) => {
  res.status(500).json({ ok: false, error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Everest Aviation backend running on port ${PORT}`);
});
