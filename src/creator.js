const CREATOR_EMAILS = new Set(['sergeevich.9567@gmail.com']);
const ALLY_NAMES = new Set(['тася']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCreatorEmail(email) {
  return CREATOR_EMAILS.has(normalizeEmail(email));
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/ё/g, 'е');
}

function isAllyProfile(email, name) {
  if (isCreatorEmail(email)) return false;
  return ALLY_NAMES.has(normalizeName(name));
}

function getPublicLimit(user) {
  if (isCreatorEmail(user && user.email)) return null;
  return user && (user.daily_limit || user.dailyLimit) ? (user.daily_limit || user.dailyLimit) : 15;
}

module.exports = {
  isCreatorEmail,
  isAllyProfile,
  getPublicLimit
};
