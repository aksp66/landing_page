const { Redis } = require('@upstash/redis');

let redis = null;
let attempted = false;

function getRedis() {
  if (attempted) return redis;
  attempted = true;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

module.exports = { getRedis };
