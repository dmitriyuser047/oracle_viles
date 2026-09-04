const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(config.DATA_DIR, 'veles.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    daily_limit INTEGER DEFAULT 15,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_data (
    user_id INTEGER PRIMARY KEY,
    profile_json TEXT DEFAULT '{}',
    events_json TEXT DEFAULT '[]',
    chats_json TEXT DEFAULT '{}',
    archived_chats_json TEXT DEFAULT '[]',
    bond_json TEXT,
    settings_json TEXT DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    request_mode TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_request_log_user_date
    ON request_log(user_id, created_at);
`);

const stmts = {
  createUser: db.prepare(
    'INSERT INTO users (email, password_hash, name, birth_date) VALUES (?, ?, ?, ?)'
  ),
  findUserByEmail: db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ),
  findUserById: db.prepare(
    'SELECT id, email, name, birth_date, plan, daily_limit, created_at FROM users WHERE id = ?'
  ),
  upsertUserData: db.prepare(`
    INSERT INTO user_data (user_id, profile_json, events_json, chats_json, archived_chats_json, bond_json, settings_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      profile_json = excluded.profile_json,
      events_json = excluded.events_json,
      chats_json = excluded.chats_json,
      archived_chats_json = excluded.archived_chats_json,
      bond_json = excluded.bond_json,
      settings_json = excluded.settings_json,
      updated_at = datetime('now')
  `),
  getUserData: db.prepare(
    'SELECT * FROM user_data WHERE user_id = ?'
  ),
  countTodayRequests: db.prepare(
    "SELECT COUNT(*) as cnt FROM request_log WHERE user_id = ? AND created_at >= date('now')"
  ),
  logRequest: db.prepare(
    'INSERT INTO request_log (user_id, request_mode) VALUES (?, ?)'
  )
};

module.exports = { db, stmts };
