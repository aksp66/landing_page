const express = require('express');
const { getDevisConfig } = require('../devisConfig');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const config = await getDevisConfig();
    return res.json(config);
  } catch (err) {
    console.error('[devis-config] Échec de lecture :', err.message);
    return res.status(502).json({ error: 'Configuration indisponible.' });
  }
});

module.exports = router;
