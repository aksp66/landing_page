require('dotenv').config();

const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const contactRouter = require('./routes/contact');

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

app.use('/api/contact', contactLimiter, contactRouter);

app.listen(PORT, () => {
  console.log(`Sergio WEKA — landing page en ligne sur http://localhost:${PORT}`);
});
