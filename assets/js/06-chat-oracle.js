let responseIdx = 0;
let useAI = true;
let oracleMode = 'oracle';

const screenSymbols = {
  oracle: {
    oracle: 'ᚨ ᚱ ᚠ ᛊ ᚷ ᛞ ᛟ',
    tarot: 'I II III IV V VI VII',
    dialogue: '',
    dialogue_energy: 'I II III IV V VI VII',
    dream: '◐ ◯ ◌ ✧ ◌ ◯ ◑'
  },
  diary: '✦ · ◌ · ✧ · ◌ · ✦',
  bonds: '☌ ☍ △ □ ✶ △ ☌',
  profile: '☉ ☿ ♀ ♂ ♃ ♄ ☉',
  'diary-detail': '✧ · ◌ · ✦ · ◌ · ✧',
  onboard: 'ᚨ ᚱ ᚠ ᛊ ᚷ ᛞ ᛟ'
};

function updateTopSymbols(screenName) {
  var appEl = document.getElementById('app');
  if (!appEl) return;
  var currentScreen = screenName || document.querySelector('.screen.active')?.id?.replace('screen-', '') || 'oracle';
  var symbols = '';

  if (currentScreen === 'oracle') {
    symbols = Object.prototype.hasOwnProperty.call(screenSymbols.oracle, oracleMode)
      ? screenSymbols.oracle[oracleMode]
      : screenSymbols.oracle.oracle;
  } else {
    symbols = screenSymbols[currentScreen] || screenSymbols.onboard;
  }

  appEl.setAttribute('data-symbols', symbols);
}

const fallbackResponses = [
  function(n, s) { return 'Я чувствую, как твоя энергия смещается, ' + n + '. Как ' + s + ', ты ощущаешь это нутром. Прислушайся к тому, что говорит тело на этой неделе.'; },
  function(n, s) { return 'Интересно… Это связано с чем-то более глубоким. Я вижу формирующийся паттерн — нужно больше данных. Продолжай записывать события.'; },
  function(n, s) { return 'Звёзды указывают на смену направления впереди. Не резкую — мягкую. Как река, находящая новое русло. Доверься своей интуиции, ' + n + '.'; },
  function(n, s) { return 'Я чувствую напряжение с кем-то близким. Не конфликт — просто несовпадение ритмов. Дай этому три дня. Энергия сменится в четверг.'; },
  function(n, s) { return n + ', то что ты описываешь — классическая энергия ' + s + ' под этим транзитом. Ты чувствовал это раньше — в сентябре. Помнишь?'; },
  function(n, s) { return 'Это цикл, который замыкается. То, что началось месяцы назад, подходит к развязке. Не форсируй результат — дай ему прийти самому.'; },
];

function setOracleDepth(depth) {
  oracleDepth = ['brief', 'detailed', 'deep'].includes(depth) ? depth : 'detailed';
  document.querySelectorAll('#depthPills .pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-value') === oracleDepth);
  });
  saveToStorage();
}

function setOracleTone(tone) {
  oracleTone = ['soft', 'practical', 'harsh'].includes(tone) ? tone : 'practical';
  document.querySelectorAll('#tonePills .pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-value') === oracleTone);
  });
  saveToStorage();
}

function restoreSettingsPills() {
  document.querySelectorAll('#depthPills .pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-value') === oracleDepth);
  });
  document.querySelectorAll('#tonePills .pill').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-value') === oracleTone);
  });
}

function setOracleMode(mode) {
  oracleMode = ['tarot', 'dialogue', 'dialogue_energy', 'dream'].includes(mode) ? mode : 'oracle';
  var modeMap = {
    oracle: document.getElementById('modeOracle'),
    tarot: document.getElementById('modeTarot'),
    dialogue: document.getElementById('modeDialogue'),
    dialogue_energy: document.getElementById('modeDialogueEnergy'),
    dream: document.getElementById('modeDream')
  };
  var input = document.getElementById('msgInput');
  Object.keys(modeMap).forEach(function(key) {
    if (modeMap[key]) modeMap[key].classList.toggle('active', oracleMode === key);
  });
  if (input) {
    var placeholders = {
      oracle: 'Расскажи оракулу, что произошло...',
      tarot: 'Сформулируй вопрос для расклада...',
      dialogue: 'Вставь сообщение или диалог для разбора...',
      dialogue_energy: 'Вставь диалог, чтобы увидеть энергии контакта...',
      dream: 'Опиши сон, образы, чувства и чем он закончился...'
    };
    input.placeholder = placeholders[oracleMode] || placeholders.oracle;
  }
  updateTopSymbols('oracle');
  renderCurrentChat();
}

function getCurrentChatKey() {
  return ['oracle', 'tarot', 'dialogue', 'dialogue_energy', 'dream'].includes(oracleMode) ? oracleMode : 'oracle';
}

function getChatTitle(key) {
  var titles = {
    oracle: 'Оракул',
    tarot: 'Расклад таро',
    dialogue: 'Переписка',
    dialogue_energy: 'Энергии диалога',
    dream: 'Сонник'
  };
  return titles[key] || 'Оракул';
}

function compactText(value, limit) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 16)).trim() + '...';
}

function buildChatMemoryForApi(key, currentMessage) {
  var history = Array.isArray(chatHistories[key]) ? chatHistories[key] : [];
  var meaningful = history.filter(function(item) {
    if (!item || !String(item.text || '').trim()) return false;
    if (item.type !== 'user' && item.type !== 'oracle') return false;
    return String(item.text || '').trim() !== String(currentMessage || '').trim();
  });

  if (!meaningful.length) {
    return { summary: '', recent: [] };
  }

  var recent = meaningful.slice(-4).map(function(item) {
    return {
      role: item.type === 'oracle' ? 'assistant' : 'user',
      text: compactText(item.text, 260)
    };
  });

  var older = meaningful.slice(0, Math.max(0, meaningful.length - 4));
  var userCount = older.filter(function(item) { return item.type === 'user'; }).length;
  var oracleCount = older.filter(function(item) { return item.type === 'oracle'; }).length;
  var firstUser = older.find(function(item) { return item.type === 'user'; });
  var lastUser = older.slice().reverse().find(function(item) { return item.type === 'user'; });
  var summaryParts = [];

  if (older.length) {
    summaryParts.push('Ранее в этом чате было ' + older.length + ' реплик: ' + userCount + ' от пользователя и ' + oracleCount + ' от Велеса.');
    if (firstUser) summaryParts.push('Первый запрос: ' + compactText(firstUser.text, 160));
    if (lastUser && lastUser !== firstUser) summaryParts.push('Последний старый запрос: ' + compactText(lastUser.text, 160));
  }

  return {
    summary: compactText(summaryParts.join(' '), 520),
    recent: recent
  };
}

function shouldArchiveChat(history, now) {
  if (!Array.isArray(history) || history.length === 0) return false;
  var meaningful = history.some(function(item) {
    return item && (item.type === 'user' || item.type === 'oracle') && String(item.text || '').trim();
  });
  if (!meaningful) return false;
  var lastTs = history.reduce(function(max, item) {
    return Math.max(max, item && item.ts ? item.ts : 0);
  }, 0);
  return lastTs > 0 && now - lastTs >= CHAT_ARCHIVE_TTL;
}

function archiveChat(key, reason) {
  var history = chatHistories[key] || [];
  if (!history.length) return false;

  var firstTs = history.reduce(function(min, item) {
    var ts = item && item.ts ? item.ts : Date.now();
    return Math.min(min, ts);
  }, Date.now());
  var lastTs = history.reduce(function(max, item) {
    return Math.max(max, item && item.ts ? item.ts : firstTs);
  }, firstTs);
  var userCount = history.filter(function(item) { return item && item.type === 'user'; }).length;
  var oracleCount = history.filter(function(item) { return item && item.type === 'oracle'; }).length;

  archivedChats.unshift({
    id: 'chat_' + lastTs + '_' + key,
    key: key,
    title: getChatTitle(key),
    reason: reason || 'Диалог перенесён в архив',
    startedAt: firstTs,
    endedAt: lastTs,
    userCount: userCount,
    oracleCount: oracleCount,
    messages: history.map(function(item) {
      return {
        type: item.type,
        text: item.text || '',
        meta: item.meta || '',
        ts: item.ts || lastTs
      };
    })
  });

  chatHistories[key] = [];
  return true;
}

function archiveExpiredChats(now, silent, exceptKey) {
  var changed = false;
  Object.keys(chatHistories).forEach(function(key) {
    if (key === exceptKey) return;
    if (shouldArchiveChat(chatHistories[key], now)) {
      changed = archiveChat(key, 'Автоархив через 2 часа тишины') || changed;
    }
  });
  if (changed) {
    updateDiary();
    saveToStorage();
    if (!silent) showToast('Диалог перенесён в дневник');
  }
  return changed;
}

function renderMarkdown(text) {
  var s = escapeHtml(text || '');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/^#{3}\s+(.+)$/gm, '<h4 class="md-h">$1</h4>');
  s = s.replace(/^#{2}\s+(.+)$/gm, '<h3 class="md-h">$1</h3>');
  s = s.replace(/^#{1}\s+(.+)$/gm, '<h3 class="md-h">$1</h3>');
  s = s.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>\n?)+/g, function(m) { return '<ul class="md-list">' + m + '</ul>'; });
  s = s.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function renderChatItem(item) {
  if (!item) return '';
  if (item.type === 'user') {
    return '<div class="msg-user-wrap"><div class="msg-user">' + escapeHtml(item.text || '') + '</div></div>';
  }
  if (item.type === 'viral') {
    return '<div class="viral-card">' +
      '<p>' + escapeHtml(item.text || '').replace(/\n/g, '<br>') + '</p>' +
      '<div class="viral-btns">' +
        '<button class="btn-send" onclick="shareLink()">Отправить ссылку</button>' +
        '<button class="btn-later" onclick="this.closest(&quot;.viral-card&quot;).style.display=&quot;none&quot;">Позже</button>' +
      '</div>' +
    '</div>';
  }
  return '<div class="msg"><div class="msg-oracle"><div class="oracle-text">' + renderMarkdown(item.text) + '</div>' +
    (item.meta ? '<div class="meta"><div class="meta-dot"></div>' + escapeHtml(item.meta) + '</div>' : '') +
    '</div></div>';
}

function renderCurrentChat() {
  var chat = document.getElementById('chatArea');
  if (!chat) return;
  var key = getCurrentChatKey();
  var history = chatHistories[key] || [];
  if (history.length === 0) {
    chat.innerHTML = '<div class="msg"><div class="msg-oracle"><p>' + getEmptyChatHint(key) + '</p></div></div>';
  } else {
    chat.innerHTML = history.map(renderChatItem).join('');
  }
  chat.scrollTop = chat.scrollHeight;
}

function getEmptyChatHint(key) {
  var hints = {
    oracle: 'Здесь будет твой разговор с Велесом. Расскажи, что происходит, и он посмотрит на узор.',
    tarot: 'Здесь отдельный чат раскладов Таро. Сформулируй вопрос, и Велес разложит карты.',
    dialogue: 'Здесь отдельный чат для разбора переписок. Вставь сообщение или диалог, и Велес предложит варианты ответа.',
    dialogue_energy: 'Здесь отдельный чат энергий диалога. Вставь фрагмент общения, и Велес посмотрит чакры и движение контакта.',
    dream: 'Здесь отдельный сонник. Опиши сон как сцену: место, людей, предметы, чувство и финал.'
  };
  return hints[key] || hints.oracle;
}

function appendChatMessage(type, text, meta, key) {
  var chatKey = key || getCurrentChatKey();
  if (!chatHistories[chatKey]) chatHistories[chatKey] = [];
  if (chatHistories[chatKey].length && shouldArchiveChat(chatHistories[chatKey], Date.now())) {
    archiveChat(chatKey, 'Автоархив через 2 часа тишины');
    updateDiary();
  }
  chatHistories[chatKey].push({
    type: type,
    text: text,
    meta: meta || '',
    ts: Date.now()
  });
  renderCurrentChat();
  saveToStorage();
}

function buildEsotericContext(message) {
  var bv = userBirthValue || document.getElementById('birthInput')?.value || '';
  var bd = userBirth.getDate();
  var bm = userBirth.getMonth() + 1;
  var lp = lifePathNumber(bv);
  var cz = getChineseZodiac(userBirth.getFullYear());
  var bt = birthTarot(lp);
  var yt = yearTarot(bd, bm);
  var dt = dailyTarot(new Date());
  var de = getDayElement(new Date());
  var sp = getSeasonPower(userSignIdx);
  var kb = getKabbalahPractice(bv, bd, bm);
  var br = birthRune(bv);
  var dr = dailyRune(new Date());
  var bc = birthChakra(bv);
  var ac = activeChakra(bv, bd, bm);
  var totem = getTotemAnimal(bv, userSignIdx, userName);
  var engine = buildOracleEngine(message || '', bv, bd, bm);

  return {
    userName: userName,
    isCreator: typeof isCreatorProfile === 'function' ? isCreatorProfile() : false,
    isAlly: typeof isAllyProfile === 'function' ? isAllyProfile() : false,
    birthDate: bv,
    zodiac: signsRu[userSignIdx],
    element: elements[userSignIdx],
    quality: qualities[userSignIdx],
    planet: planets[userSignIdx],
    seasonPower: sp.status + ' — ' + sp.desc,
    chinese: cz.animal + ' (' + cz.element + ')',
    lifePath: lp,
    destiny: destinyNumber(userName),
    soul: soulNumber(userName),
    personality: personalityNum(userName),
    birthday: birthdayNum(bd),
    maturity: maturityNum(lp, destinyNumber(userName)),
    personalYear: personalYear(bd, bm),
    personalMonth: personalMonth(bd, bm),
    personalDay: personalDay(bd, bm),
    birthTarot: bt.name + ' — ' + bt.meaning,
    yearTarot: yt.name + ' — ' + yt.meaning,
    dailyTarot: dt.name + ' — ' + dt.meaning,
    kabbalah: kb.name + ' — ' + kb.meaning + '. Практика: ' + kb.practice,
    birthRune: br.symbol + ' ' + br.name + ' — ' + br.meaning + '. Совет: ' + br.advice,
    dailyRune: dr.symbol + ' ' + dr.name + ' — ' + dr.meaning + '. Совет: ' + dr.advice,
    totem: formatTotem(totem),
    birthChakra: bc.name + ' — ' + bc.area + '. Тень: ' + bc.shadow + '. Практика: ' + bc.practice,
    activeChakra: ac.name + ' — ' + ac.area + '. Тень: ' + ac.shadow + '. Практика: ' + ac.practice,
    oracleInsights: formatOracleInsights(engine),
    dayRuler: de.ruler + ' (' + de.day + ')',
    today: new Date().toLocaleDateString('ru-RU'),
    matrix: (function() {
      var mx = calcMatrix(bd, bm, userBirth.getFullYear());
      return {
        character: mx.character.num + ' ' + mx.character.desc,
        connection: mx.connection.num + ' ' + mx.connection.desc,
        karma: mx.karma.num + ' ' + mx.karma.desc,
        spirit: mx.spirit.num + ' ' + mx.spirit.desc,
        comfort: mx.comfort.num + ' ' + mx.comfort.desc,
        talent: mx.talent.num + ' ' + mx.talent.desc,
        tail: mx.tail.num + ' ' + mx.tail.desc,
        money: mx.money.num + ' ' + mx.money.desc,
        relations: mx.relations.num + ' ' + mx.relations.desc,
        mission: mx.missionGeneral.num + ' ' + mx.missionGeneral.desc
      };
    })()
  };
}

async function askOracle(message, options) {
    var eventsForApi = events.map(function(e) {
      return { text: e.text, date: e.date.toLocaleDateString('ru-RU') };
    });

    var ctx = buildEsotericContext(message);
    ctx.events = eventsForApi;
    ctx.message = message;
    var memoryChatKey = options && options.chatKey ? options.chatKey : getCurrentChatKey();
    ctx.chatMemory = buildChatMemoryForApi(memoryChatKey, message);
    ctx.depth = oracleDepth || 'detailed';
    ctx.tone = oracleTone || 'practical';
    ctx.requestMode = options && options.requestMode
      ? options.requestMode
      : (oracleMode === 'tarot'
        ? 'tarot_spread'
        : (oracleMode === 'dialogue'
          ? 'dialogue_analysis'
          : (oracleMode === 'dialogue_energy'
            ? 'dialogue_energy'
            : (oracleMode === 'dream' ? 'dream_interpretation' : 'oracle'))));
    if (ctx.requestMode === 'oracle' && isRuneCodeRequest(message)) {
      ctx.requestMode = 'rune_code';
    }
    if (ctx.requestMode === 'oracle' && isMoonRequest(message)) {
      ctx.requestMode = 'moon';
    }
    if (ctx.requestMode === 'moon') {
      var moon = getMoonPhase(new Date());
      var de = getDayElement(new Date());
      ctx.moonPhase = moon.name + ', ' + moon.day + '-й лунный день';
      ctx.dayRuler = de.ruler + ' (' + de.day + ')';
    }
    if (ctx.requestMode === 'tarot_spread') {
      ctx.tarotSpread = buildTarotSpread(message);
    }
    if (ctx.requestMode === 'rune_code') {
      ctx.runeCode = buildRuneCode();
    }
    if (options && options.matrixFocus) {
      ctx.matrixFocus = options.matrixFocus;
    }
    if (options && options.profileFocus) {
      ctx.profileFocus = options.profileFocus;
    }
    if (options && options.bondProfile) {
      ctx.bondProfile = options.bondProfile;
    }

    var lastErr = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var headers = Object.assign({ 'Content-Type': 'application/json' }, typeof getAuthHeaders === 'function' ? getAuthHeaders() : {});
        var response = await fetch('/api/oracle', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(ctx)
        });
        var data = await response.json();
        if (!response.ok) {
          if (response.status === 429) {
            return data.error || 'Дневной лимит запросов исчерпан. Завтра лимит обновится.';
          }
          throw new Error('API error ' + response.status);
        }
        if (data.reply) {
          useAI = true;
          if (typeof applyUsageStatus === 'function') applyUsageStatus(data.usage);
          return data.reply;
        }
        throw new Error('empty reply');
      } catch(err) {
        lastErr = err;
        if (attempt < 1) {
          await new Promise(function(r) { setTimeout(r, 2000); });
        }
      }
    }
    console.error('Oracle failed after retries:', lastErr);
    useAI = false;
    var sign = signsRu[userSignIdx];
    return fallbackResponses[responseIdx % fallbackResponses.length](userName, sign);
}

async function requestMatrixArcana(label, num, desc) {
  var message = 'Разбери аркан матрицы: ' + label + ' — ' + num + ' ' + desc;
  switchScreen('oracle');
  setOracleMode('oracle');

  var chat = document.getElementById('chatArea');
  appendChatMessage('user', label + ': аркан ' + num, '', 'oracle');

  var typing = document.createElement('div');
  typing.className = 'msg';
  typing.innerHTML = '<div class="msg-oracle"><div class="typing"><span></span><span></span><span></span><span class="typing-label">Велес думает...</span></div></div>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  var resp = await askOracle(message, {
    requestMode: 'matrix_arcana',
    matrixFocus: {
      label: label,
      num: num,
      desc: desc
    }
  });

  if (typing.parentNode) chat.removeChild(typing);
  appendChatMessage('oracle', resp, 'AI-оракул • аркан матрицы', 'oracle');
}

async function requestProfileInsight(section, label, value) {
  var message = 'Разбери позицию профиля: ' + section + ' — ' + label + ': ' + value;
  switchScreen('oracle');
  setOracleMode('oracle');

  var chat = document.getElementById('chatArea');
  appendChatMessage('user', section + ' • ' + label, '', 'oracle');

  var typing = document.createElement('div');
  typing.className = 'msg';
  typing.innerHTML = '<div class="msg-oracle"><div class="typing"><span></span><span></span><span></span><span class="typing-label">Велес думает...</span></div></div>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  var resp = await askOracle(message, {
    requestMode: 'profile_item',
    profileFocus: {
      section: section,
      label: label,
      value: value
    }
  });

  if (typing.parentNode) chat.removeChild(typing);
  appendChatMessage('oracle', resp, 'AI-оракул • позиция профиля', 'oracle');
}

async function requestBondInsight() {
  if (!bondProfile) {
    switchScreen('bonds');
    showToast('Сначала рассчитай связь');
    return;
  }

  var message = 'Разбери связь между ' + userName + ' и ' + bondProfile.partner.name;
  switchScreen('oracle');
  setOracleMode('oracle');

  var chat = document.getElementById('chatArea');
  appendChatMessage('user', 'Связь • ' + bondProfile.partner.name, '', 'oracle');

  var typing = document.createElement('div');
  typing.className = 'msg';
  typing.innerHTML = '<div class="msg-oracle"><div class="typing"><span></span><span></span><span></span><span class="typing-label">Велес думает...</span></div></div>';
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  var resp = await askOracle(message, {
    requestMode: 'bond_analysis',
    bondProfile: bondProfile
  });

  if (typing.parentNode) chat.removeChild(typing);
  appendChatMessage('oracle', resp, 'AI-оракул • связь', 'oracle');
}

function addOracleMsg(text, meta) {
  appendChatMessage('oracle', text, meta);
}

function addViralCard() {
  var chat = document.getElementById('chatArea');
  var d = document.createElement('div');
  d.className = 'viral-card';
  var months = ['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
  var rm = months[Math.floor(Math.random()*12)];
  d.innerHTML =
    '<p>Я чувствую сильную связь с кем-то, рождённым в ' + rm + '. Отправь ему ссылку — я раскрою, что между вами.</p>' +
    '<div class="viral-btns">' +
      '<button class="btn-send" onclick="shareLink()">Отправить ссылку</button>' +
      '<button class="btn-later" onclick="this.closest(\'.viral-card\').style.display=\'none\'">Позже</button>' +
    '</div>';
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  var input = document.getElementById('msgInput');
  var text = input.value.trim();
  if (!text) return;
  input.value = '';

  var chatKey = getCurrentChatKey();
  var chat = document.getElementById('chatArea');
  appendChatMessage('user', text, '', chatKey);

  if (chatKey === 'oracle' || chatKey === 'tarot') {
    events.push({ text: text, date: new Date() });
    updateDiary();
    saveToStorage();
  }

  var typing = document.createElement('div');
  typing.className = 'msg';
  typing.innerHTML = '<div class="msg-oracle"><div class="typing"><span></span><span></span><span></span><span class="typing-label">Велес думает...</span></div></div>';
  chat = document.getElementById('chatArea');
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  var resp = await askOracle(text);
  responseIdx++;

  if (typing.parentNode) chat.removeChild(typing);

  var evtWord = events.length === 1 ? 'событие' : (events.length < 5 ? 'события' : 'событий');
  var modeText = isRuneCodeRequest(text)
    ? 'AI-оракул • рунический код + '
    : (isMoonRequest(text)
      ? 'AI-оракул • луна + '
      : (chatKey === 'tarot'
        ? 'AI-оракул • расклад таро + '
        : (chatKey === 'dialogue'
          ? 'AI-оракул • переписка + '
          : (chatKey === 'dialogue_energy'
            ? 'AI-оракул • энергии диалога + '
            : (chatKey === 'dream' ? 'AI-оракул • сонник + ' : 'AI-оракул • карта + ')))));
  var metaText = useAI
    ? ((chatKey === 'dialogue' || chatKey === 'dialogue_energy' || chatKey === 'dream')
      ? modeText.replace(' + ', '')
      : modeText + events.length + ' ' + evtWord)
    : 'На основе карты + ' + events.length + ' ' + evtWord;
  appendChatMessage('oracle', resp, metaText, chatKey);

  if ((chatKey === 'oracle' || chatKey === 'tarot') && events.length === 3) {
    setTimeout(function() {
      var pc = document.createElement('div');
      pc.className = 'pattern-card';
      pc.innerHTML =
        '<div class="label"><div class="pattern-icon"><div class="pattern-icon-inner"></div></div>Паттерн обнаружен</div>' +
        '<p>Ты склонен описывать <span class="hl">межличностное напряжение</span> во второй половине месяца. 3 из 3 событий совпадают. Следующее окно риска: <span class="hl">14–19 декабря</span></p>';
      chat.appendChild(pc);
      chat.scrollTop = chat.scrollHeight;
      updatePatternCount();
    }, 900);
  }

  if (responseIdx % 4 === 0) {
    setTimeout(function() { addViralCard(); }, 1200);
  }
}
