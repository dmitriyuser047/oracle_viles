const CREATOR_EMAILS = new Set(['sergeevich.9567@gmail.com']);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isCreatorEmail(email) {
  return CREATOR_EMAILS.has(normalizeEmail(email));
}

function getPublicLimit(user) {
  if (isCreatorEmail(user && user.email)) return null;
  return user && (user.daily_limit || user.dailyLimit) ? (user.daily_limit || user.dailyLimit) : 15;
}

module.exports = {
  isCreatorEmail,
  getPublicLimit
};
