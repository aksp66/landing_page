const express = require('express');
const multer = require('multer');
const { sendContactEmail } = require('../mailer');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LEN = {
  fullName: 120, company: 120, email: 120, phone: 40,
  otherText: 200, referenceLink: 300, message: 4000,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo
}).single('scriptFile');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Les groupes de cases à cocher arrivent en tableau s'il y a plusieurs
// valeurs cochées, ou en simple chaîne s'il n'y en a qu'une.
const list = (v) => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
};

router.post('/', (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message = uploadErr.code === 'LIMIT_FILE_SIZE'
        ? 'Le fichier joint dépasse la taille maximale de 15 Mo.'
        : "Le fichier joint n'a pas pu être traité.";
      return res.status(400).json({ error: message });
    }

    const body = req.body || {};

    // Honeypot: real users never fill this hidden field, bots often do.
    if (str(body.website) !== '') {
      return res.json({ ok: true });
    }

    const fullName = str(body.fullName);
    const company = str(body.company);
    const email = str(body.email);
    const phone = str(body.phone);
    const acceptPayment = Boolean(body.acceptPayment);

    if (!fullName || !email || !acceptPayment) {
      return res.status(400).json({ error: 'Merci de remplir tous les champs obligatoires.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "L'adresse email n'est pas valide." });
    }
    if (fullName.length > MAX_LEN.fullName || company.length > MAX_LEN.company ||
        email.length > MAX_LEN.email || phone.length > MAX_LEN.phone) {
      return res.status(400).json({ error: 'Un des champs dépasse la longueur autorisée.' });
    }

    const details = {
      fullName, company, email, phone,
      projectType: list(body.projectType),
      projectTypeOther: str(body.projectTypeOther).slice(0, MAX_LEN.otherText),
      voiceTone: list(body.voiceTone),
      voiceToneOther: str(body.voiceToneOther).slice(0, MAX_LEN.otherText),
      referenceLink: str(body.referenceLink).slice(0, MAX_LEN.referenceLink),
      platform: list(body.platform),
      broadcastZone: list(body.broadcastZone),
      usageDuration: list(body.usageDuration),
      length: list(body.length),
      longFormType: list(body.longFormType),
      scriptStatus: str(body.scriptStatus),
      deadline: str(body.deadline),
      deadlineDate: str(body.deadlineDate),
      audioMix: str(body.audioMix),
      deliveryFormat: list(body.deliveryFormat),
      message: str(body.message).slice(0, MAX_LEN.message),
    };

    try {
      await sendContactEmail(details, req.file);
      return res.json({ ok: true });
    } catch (err) {
      if (err.message === 'SMTP_NOT_CONFIGURED') {
        // Dev fallback so the flow is testable before SMTP credentials exist.
        console.warn('[contact] SMTP non configuré — demande reçue mais non envoyée par email :');
        console.warn(details);
        return res.json({ ok: true, warning: 'SMTP non configuré (mode dev)' });
      }
      console.error('[contact] Échec d\'envoi email :', err);
      return res.status(502).json({ error: "L'envoi a échoué, merci de réessayer ou de contacter directement par email." });
    }
  });
});

module.exports = router;
