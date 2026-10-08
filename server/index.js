require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const contactRouter = require('./routes/contact');
const trackRouter = require('./routes/track');
const dashboardRouter = require('./routes/dashboard');
const devisConfigRouter = require('./routes/devisConfig');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de demandes envoyées, merci de réessayer plus tard.' },
});

const trackLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, merci de réessayer plus tard.' },
});

app.use('/api/contact', contactLimiter, contactRouter);
app.use('/api/track', trackLimiter, trackRouter);
app.use('/api/dashboard', dashboardLimiter, dashboardRouter);
app.use('/api/devis-config', devisConfigRouter);

app.listen(PORT, () => {
  console.log(`Sergio WEKA — landing page en ligne sur http://localhost:${PORT}`);
});
