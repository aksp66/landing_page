const { getRedis } = require('./redisClient');

const getClient = getRedis;

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const DAY_SECONDS = 60 * 60 * 24;

async function trackView() {
  const r = getClient();
  if (!r) return;
  const day = todayKey();
  await Promise.all([
    r.incr('stats:views:total'),
    r.incr(`stats:views:${day}`),
    r.expire(`stats:views:${day}`, DAY_SECONDS * 400), // ~13 mois, nettoyage auto
  ]);
}

async function trackQuote() {
  const r = getClient();
  if (!r) return;
  await r.incr('stats:quotes:total');
}

async function trackMedia(type, id) {
  const r = getClient();
  if (!r || !type || !id) return;
  const key = `${type}:${id}`;
  await Promise.all([
    r.incr(`stats:media:${key}`),
    r.sadd('stats:media:ids', key),
  ]);
}

async function getStats() {
  const r = getClient();
  if (!r) return null;

  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const [totalViews, totalQuotes, dayCounts, mediaIds] = await Promise.all([
    r.get('stats:views:total'),
    r.get('stats:quotes:total'),
    r.mget(...days.map((d) => `stats:views:${d}`)),
    r.smembers('stats:media:ids'),
  ]);

  let mediaCounts = [];
  if (mediaIds.length) {
    const counts = await r.mget(...mediaIds.map((id) => `stats:media:${id}`));
    mediaCounts = mediaIds
      .map((id, i) => {
        const [type, ...rest] = id.split(':');
        return { type, id: rest.join(':'), count: Number(counts[i]) || 0 };
      })
      .sort((a, b) => b.count - a.count);
  }

  return {
    totalViews: Number(totalViews) || 0,
    totalQuotes: Number(totalQuotes) || 0,
    dailyViews: days.map((date, i) => ({ date, count: Number(dayCounts[i]) || 0 })),
    media: mediaCounts,
  };
}

module.exports = { trackView, trackQuote, trackMedia, getStats, isConfigured: () => Boolean(getClient()) };
