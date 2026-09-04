const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'veles-oracle-secret-key-change-in-production';
const JWT_EXPIRES = '30d';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function createToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Токен недействителен' });
  }
  req.userId = payload.uid;
  next();
}

module.exports = { hashPassword, checkPassword, createToken, verifyToken, authMiddleware };
