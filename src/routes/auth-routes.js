const express = require('express');
const { stmts } = require('../db');
const { hashPassword, checkPassword, createToken, authMiddleware } = require('../auth');
const { isCreatorEmail, isAllyProfile, getPublicLimit } = require('../creator');

const router = express.Router();

router.post('/api/register', (req, res) => {
  const { email, password, name, birthDate } = req.body;

  if (!email || !password || !name || !birthDate) {
    return res.status(400).json({ error: 'Заполни все поля' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  }
  const emailClean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  const existing = stmts.findUserByEmail.get(emailClean);
  if (existing) {
    return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
  }

  try {
    const result = stmts.createUser.run(emailClean, hashPassword(password), name.trim(), birthDate);
    const token = createToken(result.lastInsertRowid);
    const isCreator = isCreatorEmail(emailClean);
    const isAlly = isAllyProfile(emailClean, name.trim());
    res.json({
      token,
      user: {
        id: result.lastInsertRowid,
        email: emailClean,
        name: name.trim(),
        birthDate,
        plan: isCreator ? 'creator' : 'free',
        dailyLimit: isCreator ? null : 15,
        isCreator,
        isAlly,
        todayRequests: 0
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

router.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Введи email и пароль' });
  }

  const user = stmts.findUserByEmail.get(email.trim().toLowerCase());
  if (!user || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const token = createToken(user.id);
  const isCreator = isCreatorEmail(user.email);
  const isAlly = isAllyProfile(user.email, user.name);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      birthDate: user.birth_date,
      plan: isCreator ? 'creator' : user.plan,
      dailyLimit: getPublicLimit(user),
      isCreator,
      isAlly,
      todayRequests: isCreator ? 0 : stmts.countTodayRequests.get(user.id).cnt
    }
  });
});

router.get('/api/me', authMiddleware, (req, res) => {
  const user = stmts.findUserById.get(req.userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const isCreator = isCreatorEmail(user.email);
  const isAlly = isAllyProfile(user.email, user.name);
  const todayCount = isCreator ? 0 : stmts.countTodayRequests.get(req.userId).cnt;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      birthDate: user.birth_date,
      plan: isCreator ? 'creator' : user.plan,
      dailyLimit: getPublicLimit(user),
      isCreator,
      isAlly,
      todayRequests: todayCount
    },
    usage: {
      todayRequests: todayCount,
      dailyLimit: getPublicLimit(user),
      unlimited: isCreator
    }
  });
});

module.exports = router;
