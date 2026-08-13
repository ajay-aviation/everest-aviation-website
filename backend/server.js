require('dotenv').config();
const express = require('express');
const cors = require('cors');

const enquiriesRouter = require('./src/routes/enquiries');
const paymentsRouter = require('./src/routes/payments');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

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
