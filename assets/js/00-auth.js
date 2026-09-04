let authToken = null;
let currentUser = null;

function getAuthHeaders() {
  if (!authToken) return {};
  return { 'Authorization': 'Bearer ' + authToken };
}

function saveAuth() {
  try {
    if (authToken && currentUser) {
      localStorage.setItem('veles_auth', JSON.stringify({ token: authToken, user: currentUser }));
    } else {
      localStorage.removeItem('veles_auth');
    }
  } catch (e) {}
}

function loadAuth() {
  try {
    var data = JSON.parse(localStorage.getItem('veles_auth'));
    if (data && data.token && data.user) {
      authToken = data.token;
      currentUser = data.user;
      return true;
    }
  } catch (e) {}
  return false;
}

function isLoggedIn() {
  return !!authToken && !!currentUser;
}

function showAuthScreen() {
  document.getElementById('screen-auth').classList.add('active');
  document.getElementById('authError').textContent = '';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
  document.getElementById('authName').value = '';
  document.getElementById('authBirth').value = '';
  setAuthMode('login');
}

function setAuthMode(mode) {
  var isReg = mode === 'register';
  document.getElementById('authNameGroup').style.display = isReg ? 'block' : 'none';
  document.getElementById('authBirthGroup').style.display = isReg ? 'block' : 'none';
  document.getElementById('authSubmitBtn').textContent = isReg ? 'Создать аккаунт' : 'Войти';
  document.getElementById('authToggle').innerHTML = isReg
    ? 'Уже есть аккаунт? <a href="#" onclick="setAuthMode(\'login\'); return false;">Войти</a>'
    : 'Нет аккаунта? <a href="#" onclick="setAuthMode(\'register\'); return false;">Зарегистрироваться</a>';
  document.getElementById('authForm').setAttribute('data-mode', mode);
  document.getElementById('authError').textContent = '';
}

async function submitAuth() {
  var form = document.getElementById('authForm');
  var mode = form.getAttribute('data-mode');
  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value;
  var errorEl = document.getElementById('authError');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Заполни email и пароль';
    return;
  }

  var body = { email: email, password: password };
  if (mode === 'register') {
    var name = document.getElementById('authName').value.trim();
    var birth = document.getElementById('authBirth').value;
    if (!name || !birth) {
      errorEl.textContent = 'Заполни имя и дату рождения';
      return;
    }
    body.name = name;
    body.birthDate = birth;
  }

  var url = mode === 'register' ? '/api/register' : '/api/login';
  document.getElementById('authSubmitBtn').disabled = true;

  try {
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await resp.json();
    if (!resp.ok) {
      errorEl.textContent = data.error || 'Ошибка';
      return;
    }

    authToken = data.token;
    currentUser = data.user;
    saveAuth();

    if (mode === 'register') {
      userName = currentUser.name;
      userBirthValue = currentUser.birthDate;
      userBirth = new Date(currentUser.birthDate);
      startApp();
    } else {
      await loadServerData();
      if (userName && userBirthValue) {
        startApp(true);
      } else {
        userName = currentUser.name;
        userBirthValue = currentUser.birthDate;
        userBirth = new Date(currentUser.birthDate);
        startApp();
      }
    }

    document.getElementById('screen-auth').classList.remove('active');
    updateAuthUI();
  } catch (e) {
    errorEl.textContent = 'Ошибка сети';
  } finally {
    document.getElementById('authSubmitBtn').disabled = false;
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  saveAuth();
  clearStorage();
  updateAuthUI();
  location.reload();
}

function updateAuthUI() {
  var profileAuth = document.getElementById('profileAuthInline') || document.getElementById('profileAuthSection');
  if (!profileAuth) return;
  if (isLoggedIn()) {
    profileAuth.innerHTML =
      '<div class="auth-status">' +
        '<div class="auth-status-label">Аккаунт</div>' +
        '<div class="auth-status-email">' + escapeHtml(currentUser.email) + '</div>' +
        '<div class="auth-status-plan">Тариф: ' + escapeHtml(currentUser.plan === 'free' ? 'Бесплатный' : 'Премиум') +
          ' (' + (currentUser.dailyLimit || 15) + ' запросов/день)</div>' +
        '<button class="auth-logout-btn" onclick="logout()">Выйти</button>' +
      '</div>';
  } else {
    profileAuth.innerHTML =
      '<div class="auth-status">' +
        '<div class="auth-status-label">Аккаунт</div>' +
        '<p style="color:var(--dim);font-size:13px;margin:8px 0;">Войди, чтобы сохранить данные на сервере и использовать с любого устройства.</p>' +
        '<button class="auth-login-btn" onclick="showAuthScreen()">Войти или создать аккаунт</button>' +
      '</div>';
  }
}

async function loadServerData() {
  if (!isLoggedIn()) return;
  try {
    var resp = await fetch('/api/user-data', { headers: getAuthHeaders() });
    if (!resp.ok) return;
    var data = await resp.json();
    if (data.events && data.events.length) {
      events = data.events.map(function(e) { return { text: e.text, date: new Date(e.ts) }; });
    }
    if (data.chats && Object.keys(data.chats).length) {
      chatHistories = Object.assign(createEmptyChats(), data.chats);
    }
    if (data.archivedChats && data.archivedChats.length) {
      archivedChats = data.archivedChats;
    }
    if (data.bond) {
      bondProfile = data.bond;
    }
    if (data.settings) {
      oracleDepth = data.settings.depth || 'detailed';
      oracleTone = data.settings.tone || 'practical';
    }
    saveToStorage();
  } catch (e) {
    console.error('Load server data error:', e);
  }
}

async function syncToServer() {
  if (!isLoggedIn()) return;
  try {
    await fetch('/api/user-data', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, getAuthHeaders()),
      body: JSON.stringify({
        events: events.map(function(e) { return { text: e.text, ts: e.date.getTime() }; }),
        chats: chatHistories,
        archivedChats: archivedChats,
        bond: bondProfile,
        settings: { depth: oracleDepth, tone: oracleTone }
      })
    });
  } catch (e) {
    console.error('Sync error:', e);
  }
}

var syncTimer = null;
function scheduleSyncToServer() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncToServer, 3000);
}
