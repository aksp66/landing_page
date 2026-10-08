const express = require('express');
const { getStats, isConfigured } = require('../stats');

const router = express.Router();

router.get('/', async (req, res) => {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return res.status(503).json({ error: "Le dashboard n'est pas configuré (DASHBOARD_PASSWORD manquant)." });
  }

  const provided = req.get('X-Dashboard-Key') || '';
  if (provided !== expected) {
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }

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

module.exports = router;
