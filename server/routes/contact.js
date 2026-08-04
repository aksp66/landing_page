const express = require('express');
const { sendContactEmail } = require('../mailer');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = { name: 120, email: 120, phone: 40, message: 4000 };

router.post('/', async (req, res) => {
  const body = req.body || {};

  // Honeypot: real users never fill this hidden field, bots often do.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return res.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Merci de remplir tous les champs obligatoires.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "L'adresse email n'est pas valide." });
  }
  if (name.length > MAX_LEN.name || email.length > MAX_LEN.email ||
      phone.length > MAX_LEN.phone || message.length > MAX_LEN.message) {
    return res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
  }

  try {
    await sendContactEmail({ name, email, phone, message });
    return res.json({ ok: true });
  } catch (err) {
    if (err.message === 'SMTP_NOT_CONFIGURED') {
      // Dev fallback so the flow is testable before SMTP credentials exist.
      console.warn('[contact] SMTP non configuré — demande reçue mais non envoyée par email :');
      console.warn({ name, email, phone, message });
      return res.json({ ok: true, warning: 'SMTP non configuré (mode dev)' });
    }
    console.error('[contact] Échec d\'envoi email :', err);
    return res.status(502).json({ error: "L'envoi a échoué, merci de réessayer ou de contacter directement par email." });
  }
});

module.exports = router;
