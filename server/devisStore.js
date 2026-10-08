const crypto = require('crypto');
const { getRedis } = require('./redisClient');

const IDS_KEY = 'devis:submissions:ids';
const MAX_STORED = 200;
const TTL_SECONDS = 60 * 60 * 24 * 400; // ~13 mois

const submissionKey = (id) => `devis:submission:${id}`;

function isConfigured() {
  return Boolean(getRedis());
}

async function saveDevisSubmission(details, fileNames = []) {
  const redis = getRedis();
  if (!redis) return null;

  const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const record = {
    id,
    submittedAt: new Date().toISOString(),
    fileNames,
    replied: false,
    repliedAt: null,
    replyMessage: null,
    ...details,
  };

  await Promise.all([
    redis.set(submissionKey(id), record, { ex: TTL_SECONDS }),
    redis.lpush(IDS_KEY, id),
  ]);
  await redis.ltrim(IDS_KEY, 0, MAX_STORED - 1);

  return id;
}

async function getDevisSubmissions(limit = 50) {
  const redis = getRedis();
  if (!redis) return [];

  const ids = await redis.lrange(IDS_KEY, 0, limit - 1);
  if (!ids.length) return [];

  const records = await redis.mget(...ids.map(submissionKey));
  return records.filter(Boolean);
}

async function markReplied(id, replyMessage) {
  const redis = getRedis();
  if (!redis) throw new Error('STATS_NOT_CONFIGURED');

  const record = await redis.get(submissionKey(id));
  if (!record) throw new Error('NOT_FOUND');

  const updated = { ...record, replied: true, repliedAt: new Date().toISOString(), replyMessage };
  await redis.set(submissionKey(id), updated, { ex: TTL_SECONDS });
  return updated;
}

async function getDevisSubmission(id) {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(submissionKey(id));
}

module.exports = { saveDevisSubmission, getDevisSubmissions, getDevisSubmission, markReplied, isConfigured };
