const crypto = require('crypto');
const { getRedis } = require('./redisClient');

const PASSWORD_KEY = 'dashboard:passwordHash';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyHash(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  // Longueur fixe pour éviter les attaques par mesure de temps.
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

// Vrai si le mot de passe fourni correspond — au hash stocké dans Redis
// s'il existe, sinon au DASHBOARD_PASSWORD de secours défini en variable
// d'environnement (utile tant qu'aucun changement de mot de passe n'a eu lieu).
async function verifyDashboardPassword(password) {
  if (!password) return false;

  const redis = getRedis();
  if (redis) {
    const stored = await redis.get(PASSWORD_KEY);
    if (stored) return verifyHash(password, stored);
  }

  const fallback = process.env.DASHBOARD_PASSWORD;
  return Boolean(fallback) && password === fallback;
}

// Nécessite Redis : le mot de passe de secours (variable d'environnement)
// ne peut pas être changé depuis le dashboard, seul le hash stocké le peut.
async function setDashboardPassword(newPassword) {
  const redis = getRedis();
  if (!redis) throw new Error('STATS_NOT_CONFIGURED');
  await redis.set(PASSWORD_KEY, hashPassword(newPassword));
}

function canChangePassword() {
  return Boolean(getRedis());
}

module.exports = { verifyDashboardPassword, setDashboardPassword, canChangePassword };
