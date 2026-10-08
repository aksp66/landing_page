const express = require('express');
const { getStats, isConfigured } = require('../stats');
const { verifyDashboardPassword, setDashboardPassword, canChangePassword } = require('../auth');
const { getDevisConfig, updateDevisField, FIELDS } = require('../devisConfig');
const { getDevisSubmissions, markReplied } = require('../devisStore');
const { sendReplyEmail } = require('../mailer');

const router = express.Router();

async function requireDashboardAuth(req, res, next) {
  const expected = process.env.DASHBOARD_PASSWORD;
  const hasRedisPassword = canChangePassword();
  if (!expected && !hasRedisPassword) {
    return res.status(503).json({ error: "Le dashboard n'est pas configuré (DASHBOARD_PASSWORD manquant)." });
  }

  const provided = req.get('X-Dashboard-Key') || '';
  const ok = await verifyDashboardPassword(provided).catch(() => false);
  if (!ok) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  next();
}

router.use(requireDashboardAuth);

router.get('/', async (req, res) => {
  if (!isConfigured()) {
    return res.json({ configured: false });
  }
  try {
    const stats = await getStats();
    return res.json({ configured: true, ...stats });
  } catch (err) {
    console.error('[dashboard] Échec de lecture des statistiques :', err.message);
    return res.status(502).json({ error: 'Impossible de récupérer les statistiques pour le moment.' });
  }
});

router.post('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!canChangePassword()) {
    return res.status(503).json({ error: "Le changement de mot de passe nécessite Upstash (non configuré)." });
  }
  const ok = await verifyDashboardPassword(currentPassword).catch(() => false);
  if (!ok) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 200) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
  }
  try {
    await setDashboardPassword(newPassword);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[dashboard] Échec changement de mot de passe :', err.message);
    return res.status(502).json({ error: 'Impossible de changer le mot de passe pour le moment.' });
  }
});

router.put('/devis-config/:field', async (req, res) => {
  const { field } = req.params;
  const { options } = req.body || {};
  if (!FIELDS.includes(field)) {
    return res.status(404).json({ error: 'Champ inconnu.' });
  }
  try {
    const config = await updateDevisField(field, options);
    return res.json({ ok: true, config });
  } catch (err) {
    if (err.message === 'STATS_NOT_CONFIGURED') {
      return res.status(503).json({ error: "Upstash n'est pas configuré — impossible d'enregistrer." });
    }
    return res.status(400).json({ error: err.message || 'Mise à jour impossible.' });
  }
});

router.get('/devis', async (req, res) => {
  try {
    const submissions = await getDevisSubmissions(50);
    return res.json({ submissions, config: await getDevisConfig() });
  } catch (err) {
    console.error('[dashboard] Échec de lecture des devis :', err.message);
    return res.status(502).json({ error: 'Impossible de récupérer les demandes de devis.' });
  }
});

router.post('/devis/:id/reply', async (req, res) => {
  const { id } = req.params;
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 5000) {
    return res.status(400).json({ error: 'Message de réponse invalide.' });
  }

  try {
    const submissions = await getDevisSubmissions(200);
    const submission = submissions.find((s) => s.id === id);
    if (!submission) return res.status(404).json({ error: 'Demande introuvable.' });

    await sendReplyEmail({ to: submission.email, fullName: submission.fullName, message });
    const updated = await markReplied(id, message);
    return res.json({ ok: true, submission: updated });
  } catch (err) {
    if (err.message === 'SMTP_NOT_CONFIGURED') {
      return res.status(503).json({ error: "L'envoi d'email n'est pas configuré." });
    }
    console.error('[dashboard] Échec envoi réponse :', err.message);
    return res.status(502).json({ error: "L'envoi de la réponse a échoué." });
  }
});

module.exports = router;
