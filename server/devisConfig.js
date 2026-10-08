const { getRedis } = require('./redisClient');

const CONFIG_KEY = 'devis:config';

// Options par défaut — reflètent ce qui était codé en dur dans index.html.
// Servent de base tant que personne n'a encore modifié quoi que ce soit
// depuis le dashboard, et de solution de repli si Redis n'est pas configuré.
const DEFAULT_CONFIG = {
  projectType: [
    'Publicité / Promotion',
    'Narration / Documentaire',
    'Institutionnel / Corporatif',
    'E-learning / Formation',
    'SVI / Répondeur téléphonique',
  ],
  voiceTone: [
    'Dynamique / Énergique',
    'Chaleureux / Rassurant',
    'Sérieux / Institutionnel',
    'Jeune / Moderne',
    'Grave / Autoritaire',
  ],
  platform: ['TV national', 'radio', 'Web / Réseaux sociaux'],
  broadcastZone: ['National', 'International'],
  usageDuration: ['6 mois', '1 an', '2 ans', 'Illimitée'],
  length: [
    '0 à 1 minute (≈150 mots)',
    '1 à 3 minutes (≈450 mots)',
    '1 à 5 minutes (≈700 mots)',
    '1 à 10 minutes (≈1500 mots)',
  ],
  longFormType: ['Livre audio', 'Documentaire long métrage'],
  mixType: ['Mixage', 'Mixage & Mastering', 'Mixage avec musique'],
  deliveryFormat: ['Fichier WAV', 'Fichier MP3'],
};

const FIELDS = Object.keys(DEFAULT_CONFIG);

async function getDevisConfig() {
  const redis = getRedis();
  if (!redis) return DEFAULT_CONFIG;

  const stored = await redis.get(CONFIG_KEY);
  if (!stored) return DEFAULT_CONFIG;

  // Fusionne avec les valeurs par défaut au cas où un nouveau champ serait
  // ajouté au code après que Sergio ait déjà personnalisé sa config.
  return { ...DEFAULT_CONFIG, ...stored };
}

async function updateDevisField(field, options) {
  if (!FIELDS.includes(field)) throw new Error(`Champ inconnu : ${field}`);
  if (!Array.isArray(options) || !options.every((o) => typeof o === 'string')) {
    throw new Error('Options invalides.');
  }
  const cleaned = options.map((o) => o.trim()).filter(Boolean).slice(0, 30);

  const redis = getRedis();
  if (!redis) throw new Error('STATS_NOT_CONFIGURED');

  const current = await getDevisConfig();
  const next = { ...current, [field]: cleaned };
  await redis.set(CONFIG_KEY, next);
  return next;
}

module.exports = { getDevisConfig, updateDevisField, FIELDS, DEFAULT_CONFIG };
