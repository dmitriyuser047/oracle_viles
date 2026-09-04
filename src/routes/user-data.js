const express = require('express');
const { stmts } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

router.get('/api/user-data', authMiddleware, (req, res) => {
  const row = stmts.getUserData.get(req.userId);
  if (!row) {
    return res.json({ events: [], chats: {}, archivedChats: [], bond: null, settings: {} });
  }
  try {
    res.json({
      events: JSON.parse(row.events_json || '[]'),
      chats: JSON.parse(row.chats_json || '{}'),
      archivedChats: JSON.parse(row.archived_chats_json || '[]'),
      bond: JSON.parse(row.bond_json || 'null'),
      settings: JSON.parse(row.settings_json || '{}')
    });
  } catch (e) {
    res.json({ events: [], chats: {}, archivedChats: [], bond: null, settings: {} });
  }
});

router.post('/api/user-data', authMiddleware, (req, res) => {
  const { events, chats, archivedChats, bond, settings } = req.body;
  try {
    stmts.upsertUserData.run(
      req.userId,
      JSON.stringify({}),
      JSON.stringify(events || []),
      JSON.stringify(chats || {}),
      JSON.stringify(archivedChats || []),
      JSON.stringify(bond || null),
      JSON.stringify(settings || {})
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Save user data error:', err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

module.exports = router;
