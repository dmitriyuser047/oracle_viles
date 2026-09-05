function updateDiary() {
  var dl = document.getElementById('diaryList');
  var toolbar = document.getElementById('diaryToolbar');
  var months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  var diaryItems = [];

  events.forEach(function(e, originalIndex) {
    diaryItems.push({
      type: 'event',
      index: originalIndex,
      time: e.date.getTime(),
      entry: e
    });
  });

  archivedChats.forEach(function(archive, originalIndex) {
    diaryItems.push({
      type: 'archive',
      index: originalIndex,
      time: archive.endedAt || archive.startedAt || 0,
      archive: archive
    });
  });

  var entriesHtml = diaryItems.sort(function(a, b) {
    return b.time - a.time;
  }).map(function(item) {
    if (item.type === 'archive') {
      var archive = item.archive;
      var ad = new Date(archive.endedAt || archive.startedAt || Date.now());
      var total = (archive.userCount || 0) + (archive.oracleCount || 0);
      return '<div class="diary-entry" onclick="openChatArchive(' + item.index + ')">' +
        '<div class="date">' + ad.getDate() + ' ' + months[ad.getMonth()] + ' ' + ad.getFullYear() + ', ' + ad.getHours() + ':' + String(ad.getMinutes()).padStart(2,'0') + '</div>' +
        '<div class="text">Архив диалога: ' + escapeHtml(archive.title || 'Оракул') + '</div>' +
        '<div class="transit">' + total + ' сообщений • ' + escapeHtml(archive.reason || 'архив') + '</div>' +
      '</div>';
    }

    var e = item.entry;
    var d = e.date;
    var de = getDayElement(d);
    var dt = dailyTarot(d);
    return '<div class="diary-entry" onclick="openDiaryEntry(' + item.index + ')">' +
      '<div class="date">' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0') + '</div>' +
      '<div class="text">' + escapeHtml(e.text) + '</div>' +
      '<div class="transit">' + de.ruler + ' • ' + dt.name + '</div>' +
    '</div>';
  }).join('');
  dl.innerHTML = buildDiaryPatterns() +
    (diaryItems.length
      ? '<div class="diary-section-label"><div class="pattern-icon"><div class="pattern-icon-inner"></div></div>Записи и архивы</div>' + entriesHtml
      : '<div style="text-align:center; padding: 60px 24px;"><div style="font-size: 14px; color: #6f7167; line-height: 1.7;">Дневник пуст.<br>Диалоги после 2 часов тишины будут появляться здесь архивом.</div></div>');
  if (toolbar) toolbar.style.display = diaryItems.length > 0 ? 'flex' : 'none';
  document.getElementById('addEntryBtn').style.display = document.getElementById('screen-diary').classList.contains('active') && diaryItems.length > 0 ? 'flex' : 'none';
  document.getElementById('diaryDot').style.display = diaryItems.length > 0 ? 'block' : 'none';
  var ec = document.getElementById('eventCount');
  if (ec) ec.textContent = diaryItems.length;
  updatePatternCount();
}

function clearDiaryEntries() {
  if (!events.length && !archivedChats.length) return;
  if (!confirm('Очистить все записи и архивы дневника?')) return;
  events = [];
  archivedChats = [];
  updateDiary();
  saveToStorage();
  var detail = document.getElementById('diaryDetail');
  if (detail) detail.innerHTML = '';
}

function formatDiaryDate(d) {
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openDiaryEntry(index) {
  var entry = events[index];
  if (!entry) return;

  var d = entry.date;
  var de = getDayElement(d);
  var dt = dailyTarot(d);
  var detail = document.getElementById('diaryDetail');
  detail.innerHTML =
    '<button class="detail-back" onclick="switchScreen(&quot;diary&quot;)">← Назад</button>' +
    '<div class="detail-card">' +
      '<div class="detail-label">Событие</div>' +
      '<div class="detail-date">' + formatDiaryDate(d) + '</div>' +
      '<div class="detail-text">' + escapeHtml(entry.text) + '</div>' +
      '<div class="detail-meta">' +
        '<div class="detail-meta-row"><span>Управитель</span><span>' + escapeHtml(de.ruler) + ' (' + escapeHtml(de.day) + ')</span></div>' +
        '<div class="detail-meta-row"><span>Карта дня</span><span>' + escapeHtml(dt.name) + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="detail-actions">' +
      '<button class="detail-action-btn" onclick="askAboutDiaryEntry(' + index + ')">Спросить Велеса</button>' +
      '<button class="detail-action-btn secondary" onclick="switchScreen(&quot;diary&quot;)">К списку</button>' +
      '<button class="detail-action-btn danger" onclick="deleteDiaryEntry(' + index + ')">Удалить запись</button>' +
    '</div>';

  switchScreen('diary-detail');
}

function openChatArchive(index) {
  var archive = archivedChats[index];
  if (!archive) return;

  var started = new Date(archive.startedAt || archive.endedAt || Date.now());
  var ended = new Date(archive.endedAt || archive.startedAt || Date.now());
  var detail = document.getElementById('diaryDetail');
  var messages = (archive.messages || []).map(function(item) {
    var label = item.type === 'user' ? 'Ты' : (item.type === 'oracle' ? 'Велес' : 'Система');
    var ts = item.ts ? new Date(item.ts) : ended;
    return '<div class="detail-meta-row" style="display:block;">' +
      '<span>' + escapeHtml(label) + ' • ' + escapeHtml(formatDiaryDate(ts)) + '</span>' +
      '<div style="margin-top:8px;color:#d7d0ea;line-height:1.65;white-space:pre-wrap;">' + escapeHtml(item.text || '') + '</div>' +
      (item.meta ? '<div style="margin-top:6px;color:#75679c;font-size:12px;">' + escapeHtml(item.meta) + '</div>' : '') +
    '</div>';
  }).join('');

  detail.innerHTML =
    '<button class="detail-back" onclick="switchScreen(&quot;diary&quot;)">← Назад</button>' +
    '<div class="detail-card">' +
      '<div class="detail-label">Архив диалога</div>' +
      '<div class="detail-date">' + escapeHtml(archive.title || 'Оракул') + '</div>' +
      '<div class="detail-text">Начало: ' + escapeHtml(formatDiaryDate(started)) + '<br>Конец: ' + escapeHtml(formatDiaryDate(ended)) + '</div>' +
      '<div class="detail-meta">' + messages + '</div>' +
    '</div>' +
    '<div class="detail-actions">' +
      '<button class="detail-action-btn secondary" onclick="switchScreen(&quot;diary&quot;)">К списку</button>' +
      '<button class="detail-action-btn danger" onclick="deleteChatArchive(' + index + ')">Удалить архив</button>' +
    '</div>';

  switchScreen('diary-detail');
}

function deleteDiaryEntry(index) {
  if (!events[index]) return;
  if (!confirm('Удалить эту запись из дневника?')) return;
  events.splice(index, 1);
  updateDiary();
  saveToStorage();
  switchScreen('diary');
}

function deleteChatArchive(index) {
  if (!archivedChats[index]) return;
  if (!confirm('Удалить этот архив диалога?')) return;
  archivedChats.splice(index, 1);
  updateDiary();
  saveToStorage();
  switchScreen('diary');
}

function askAboutDiaryEntry(index) {
  var entry = events[index];
  if (!entry) return;
  switchScreen('oracle');
  var input = document.getElementById('msgInput');
  input.value = 'Разбери эту запись из дневника: ' + entry.text;
  input.focus();
}

function addDiaryEntry() {
  switchScreen('oracle');
  document.getElementById('msgInput').focus();
}

function getShareUrl() {
  try {
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch(e) {
    return window.location.href;
  }
}

function showToast(text) {
  document.querySelectorAll('.toast').forEach(function(t) { t.remove(); });
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 2200);
}

function copyTextFallback(text) {
  var input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch(e) {}
  input.remove();
  return ok;
}

async function shareLink() {
  var url = getShareUrl();
  var title = 'Велес';
  var text = 'Попробуй Велеса: оракул, таро и разбор переписок в одном месте.';

  if (navigator.share) {
    try {
      await navigator.share({ title: title, text: text, url: url });
      return;
    } catch(e) {
      if (e && e.name === 'AbortError') return;
    }
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована');
      return;
    }
  } catch(e) {}

  if (copyTextFallback(url)) {
    showToast('Ссылка скопирована');
  } else {
    showToast('Не удалось скопировать ссылку');
  }
}

function switchScreen(name) {
  archiveExpiredChats(Date.now(), true);
  var hasDiaryContent = events.length > 0 || archivedChats.length > 0;
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('screen-' + name).classList.add('active');
  var tabs = ['oracle','diary','bonds','profile'];
  document.querySelectorAll('.nav-item').forEach(function(n, i) {
    var isActive = tabs[i] === name;
    n.classList.toggle('active', isActive);
  });
  document.getElementById('addEntryBtn').style.display = name === 'diary' && hasDiaryContent ? 'flex' : 'none';
  var toolbar = document.getElementById('diaryToolbar');
  if (toolbar) toolbar.style.display = name === 'diary' && hasDiaryContent ? 'flex' : 'none';
  if (name === 'diary') document.getElementById('diaryDot').style.display = 'none';
  if (name === 'bonds') renderBond();
  if (name === 'profile' && typeof updateAuthUI === 'function') updateAuthUI();
  updateTopSymbols(name);
}

document.getElementById('msgInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

document.getElementById('birthInput').addEventListener('input', function() {
  this.style.borderColor = 'rgba(197,154,92,0.16)';
  this.style.background = 'rgba(8,11,10,0.78)';
});

// Автозагрузка при открытии
var hasAuthProfile = false;
if (typeof loadAuth === 'function') loadAuth();
var hasStoredProfile = loadFromStorage();
if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof applyCurrentUserProfile === 'function') {
  hasAuthProfile = applyCurrentUserProfile(true);
}
if (hasStoredProfile || hasAuthProfile) {
  if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof applyCurrentUserProfile === 'function') {
    applyCurrentUserProfile(true);
  }
  startApp(true);
  restoreSettingsPills();
  if (typeof updateAuthUI === 'function') updateAuthUI();
}

setInterval(function() {
  archiveExpiredChats(Date.now(), true);
}, 60000);
