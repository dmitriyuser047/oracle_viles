const fs = require('fs');
const path = require('path');
const config = require('./config');

if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}

const STORE_PATH = path.join(config.DATA_DIR, 'veles-store.json');

function createEmptyStore() {
  return {
    nextUserId: 1,
    nextRequestId: 1,
    users: [],
    userData: {},
    requestLog: []
  };
}

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return createEmptyStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return {
      nextUserId: parsed.nextUserId || 1,
      nextRequestId: parsed.nextRequestId || 1,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      userData: parsed.userData && typeof parsed.userData === 'object' ? parsed.userData : {},
      requestLog: Array.isArray(parsed.requestLog) ? parsed.requestLog : []
    };
  } catch (err) {
    console.error('DB read error:', err);
    return createEmptyStore();
  }
}

function writeStore(store) {
  const tmpPath = STORE_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function mutateStore(mutator) {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    birth_date: user.birth_date,
    plan: user.plan || 'free',
    daily_limit: user.daily_limit || 15,
    created_at: user.created_at
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const stmts = {
  createUser: {
    run(email, passwordHash, name, birthDate) {
      return mutateStore((store) => {
        if (store.users.some((user) => user.email === email)) {
          const err = new Error('UNIQUE constraint failed: users.email');
          err.code = 'SQLITE_CONSTRAINT_UNIQUE';
          throw err;
        }
        const now = new Date().toISOString();
        const id = store.nextUserId++;
        store.users.push({
          id,
          email,
          password_hash: passwordHash,
          name,
          birth_date: birthDate,
          plan: 'free',
          daily_limit: 15,
          created_at: now,
          updated_at: now
        });
        return { lastInsertRowid: id };
      });
    }
  },
  findUserByEmail: {
    get(email) {
      return readStore().users.find((user) => user.email === email) || null;
    }
  },
  findUserById: {
    get(id) {
      const numericId = Number(id);
      const user = readStore().users.find((item) => item.id === numericId);
      return toPublicUser(user);
    }
  },
  upsertUserData: {
    run(userId, profileJson, eventsJson, chatsJson, archivedChatsJson, bondJson, settingsJson) {
      return mutateStore((store) => {
        const id = String(userId);
        store.userData[id] = {
          user_id: Number(userId),
          profile_json: profileJson || '{}',
          events_json: eventsJson || '[]',
          chats_json: chatsJson || '{}',
          archived_chats_json: archivedChatsJson || '[]',
          bond_json: bondJson || null,
          settings_json: settingsJson || '{}',
          updated_at: new Date().toISOString()
        };
        return { changes: 1 };
      });
    }
  },
  getUserData: {
    get(userId) {
      return readStore().userData[String(userId)] || null;
    }
  },
  countTodayRequests: {
    get(userId) {
      const since = startOfToday();
      const numericId = Number(userId);
      const cnt = readStore().requestLog.filter((item) => {
        return item.user_id === numericId && new Date(item.created_at).getTime() >= since;
      }).length;
      return { cnt };
    }
  },
  logRequest: {
    run(userId, requestMode) {
      return mutateStore((store) => {
        const id = store.nextRequestId++;
        store.requestLog.push({
          id,
          user_id: Number(userId),
          request_mode: requestMode || 'oracle',
          created_at: new Date().toISOString()
        });
        return { lastInsertRowid: id };
      });
    }
  }
};

module.exports = {
  db: null,
  stmts
};
