const express = require('express');
const { trackView, trackMedia } = require('../stats');

const router = express.Router();

const VALID_TYPES = new Set(['audio', 'video']);

router.post('/view', async (req, res) => {
  try {
    await trackView();
  } catch (err) {
    console.error('[track] Échec trackView :', err.message);
  }
  res.status(204).end();
});

router.post('/media', async (req, res) => {
  const { type, id } = req.body || {};
  if (VALID_TYPES.has(type) && typeof id === 'string' && id.trim() && id.length <= 80) {
    try {
      await trackMedia(type, id.trim());
    } catch (err) {
      console.error('[track] Échec trackMedia :', err.message);
    }
  }
  res.status(204).end();
});

module.exports = router;
