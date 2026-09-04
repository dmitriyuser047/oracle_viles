function buildDailyForecast() {
  var bd = userBirth.getDate();
  var bm = userBirth.getMonth() + 1;
  var dt = dailyTarot(new Date());
  var pd = personalDay(bd, bm);
  var de = getDayElement(new Date());
  var sp = getSeasonPower(userSignIdx);
  var mx = calcMatrix(bd, bm, userBirth.getFullYear());

  var advices = {
    1: 'День новых начинаний. Действуй, начинай, не откладывай.',
    2: 'День партнёрства. Ищи союзников, слушай других.',
    3: 'День самовыражения. Творчество и общение на пике.',
    4: 'День дисциплины. Наводи порядок, строй фундамент.',
    5: 'День перемен. Будь гибким, лови возможности.',
    6: 'День гармонии. Семья, дом, забота о близких.',
    7: 'День тишины. Анализируй, размышляй, не спеши.',
    8: 'День силы. Финансы, амбиции, большие решения.',
    9: 'День завершений. Отпускай старое, прощай, закрывай дела.',
    11: 'Мастер-день. Интуиция обострена, доверяй внутреннему голосу.',
    22: 'Мастер-день. Масштабные планы обретают форму.',
    33: 'Мастер-день. Служение и помощь другим принесут награду.'
  };

  var advice = advices[pd] || advices[pd % 10] || 'Следуй интуиции.';

  var now = new Date();
  var months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();

  var html = '<div class="forecast-card">' +
    '<div class="forecast-header">' +
      '<div class="pattern-icon"><div class="pattern-icon-inner"></div></div>' +
      'Прогноз на сегодня • ' + dateStr +
    '</div>' +
    '<div class="forecast-row"><span class="forecast-key">Карта дня</span><span class="forecast-val">' + dt.name + '</span></div>' +
    '<div class="forecast-row"><span class="forecast-key">Персональный день</span><span class="forecast-val">' + pd + '</span></div>' +
    '<div class="forecast-row"><span class="forecast-key">Управитель</span><span class="forecast-val">' + de.ruler + '</span></div>' +
    '<div class="forecast-row"><span class="forecast-key">Энергия</span><span class="forecast-val">' + sp.status + '</span></div>' +
    '<div class="forecast-advice">' + advice + ' Карта дня — ' + dt.name + ': ' + dt.meaning + '.</div>' +
  '</div>';

  return html;
}

// Stars
(function() {
  const c = document.getElementById('stars');
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() > 0.8 ? 2 : 1;
    s.style.cssText = 'width:'+size+'px;height:'+size+'px;top:'+Math.random()*100+'%;left:'+Math.random()*100+'%;animation-delay:'+Math.random()*4+'s;animation-duration:'+(2+Math.random()*4)+'s;';
    c.appendChild(s);
  }
})();

function startApp(fromStorage) {
  if (!fromStorage) {
    userName = document.getElementById('nameInput').value.trim() || 'Странник';
    var bv = document.getElementById('birthInput').value;
    if (!bv) {
      var bi = document.getElementById('birthInput');
      bi.style.borderColor = 'rgba(220,80,80,0.5)';
      bi.style.background = 'rgba(220,80,80,0.05)';
      return;
    }
    userBirthValue = bv;
    userBirth = new Date(bv);
  }
  var bv = userBirthValue;
  userSignIdx = getZodiac(userBirth.getMonth()+1, userBirth.getDate());
  userSign = signSymbols[userSignIdx] + ' ' + signsRu[userSignIdx];

  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('screen-oracle').classList.add('active');
  document.getElementById('mainNav').style.display = 'flex';
  document.getElementById('userSign').textContent = userName + ' — ' + userSign;

  buildProfile(userSignIdx, bv);
  renderBond();
  if (events.length > 0) {
    updateDiary();
  } else {
    buildDiary();
  }

  saveToStorage();

  var greeting = fromStorage
    ? 'С возвращением, <span class="accent">' + userName + '</span>. Твоя карта обновлена.\n\nЧто нового произошло?'
    : 'Приветствую, <span class="accent">' + userName + '</span>. Я изучил твою карту — ' + userSign + '. Я вижу закономерности, ждущие раскрытия.\n\nРасскажи мне, что происходит в твоей жизни. Чем больше узнаю — тем точнее увижу.';

  setTimeout(function() {
    if (!chatHistories.oracle.length) {
      appendChatMessage('oracle', greeting, fromStorage ? 'Данные восстановлены' : 'Натальная карта проанализирована', 'oracle');
    } else {
      renderCurrentChat();
    }
  }, 600);

  setTimeout(function() {
    var chat = document.getElementById('chatArea');
    var d = document.createElement('div');
    d.className = 'msg';
    d.innerHTML = buildDailyForecast();
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
  }, 1200);

  setTimeout(function() { addViralCard(); }, 2800);
}

function buildProfile(zi, bv) {
  var lp = lifePathNumber(bv);
  var dn = destinyNumber(userName);
  var sn = soulNumber(userName);
  var pn = personalityNum(userName);
  var bd = userBirth.getDate();
  var bm = userBirth.getMonth() + 1;
  var bn = birthdayNum(bd);
  var mn = maturityNum(lp, dn);
  var py = personalYear(bd, bm);
  var pm = personalMonth(bd, bm);
  var pd = personalDay(bd, bm);
  var cz = getChineseZodiac(userBirth.getFullYear());
  var bt = birthTarot(lp);
  var yt = yearTarot(bd, bm);
  var dt = dailyTarot(new Date());
  var de = getDayElement(new Date());
  var sp = getSeasonPower(zi);
  var mx = calcMatrix(bd, bm, userBirth.getFullYear());
  var kb = getKabbalahPractice(bv, bd, bm);
  var br = birthRune(bv);
  var dr = dailyRune(new Date());
  var bc = birthChakra(bv);
  var ac = activeChakra(bv, bd, bm);
  var totem = getTotemAnimal(bv, zi);
  var signProfile = signProfiles[zi];

  var pc = document.getElementById('profileContent');
  pc.innerHTML =
    '<div class="profile-header">' +
      '<div class="profile-avatar">' + signSymbols[zi] + '</div>' +
      '<div class="profile-name">' + userName + '</div>' +
      '<div class="profile-sign">' + signsRu[zi] + ' • ' + elements[zi] + ' • ' + planets[zi] + '</div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Натальная карта</div>' +
      '<div class="stat-row"><span class="stat-label">Солнечный знак</span><span class="stat-value">' + signSymbols[zi] + ' ' + signsRu[zi] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Стихия</span><span class="stat-value">' + elements[zi] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Управитель</span><span class="stat-value">' + planets[zi] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Качество</span><span class="stat-value">' + qualities[zi] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Энергия сейчас</span><span class="stat-value ' + (sp.status === 'Сезон силы' ? 'good' : sp.status === 'Противофаза' ? 'warn' : '') + '">' + sp.status + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Архетип</span><span class="stat-value accent">' + signProfile.archetype + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Дар знака</span><span class="stat-value good">' + signProfile.gift + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Тень знака</span><span class="stat-value warn">' + signProfile.shadow + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Практика</span><span class="stat-value good">' + signProfile.practice + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Китайский зодиак</div>' +
      '<div class="stat-row"><span class="stat-label">Животное</span><span class="stat-value">' + cz.icon + ' ' + cz.animal + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Стихия</span><span class="stat-value">' + cz.element + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Нумерология</div>' +
      '<div class="stat-row"><span class="stat-label">Число жизненного пути</span><span class="stat-value accent">' + lp + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Смысл пути</span><span class="stat-value">' + numberMeaning(lp) + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Число судьбы (имя)</span><span class="stat-value accent">' + dn + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Число души</span><span class="stat-value accent">' + sn + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Число личности</span><span class="stat-value accent">' + pn + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Число дня рождения</span><span class="stat-value accent">' + bn + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Число зрелости</span><span class="stat-value accent">' + mn + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Практика числа</span><span class="stat-value good">' + numberPractice(lp) + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Персональные циклы</div>' +
      '<div class="stat-row"><span class="stat-label">Персональный год</span><span class="stat-value accent">' + py + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Персональный месяц</span><span class="stat-value accent">' + pm + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Персональный день</span><span class="stat-value accent">' + pd + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Таро</div>' +
      '<div class="stat-row"><span class="stat-label">Карта рождения</span><span class="stat-value accent">' + bt.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Карта года</span><span class="stat-value accent">' + yt.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Карта дня</span><span class="stat-value accent">' + dt.name + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Каббалистика</div>' +
      '<div class="stat-row"><span class="stat-label">Сфира практики</span><span class="stat-value accent">' + kb.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Смысл</span><span class="stat-value">' + kb.meaning + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Применение</span><span class="stat-value good">' + kb.practice + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Руны</div>' +
      '<div class="stat-row"><span class="stat-label">Руна рождения</span><span class="stat-value accent">' + br.symbol + ' ' + br.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Руна дня</span><span class="stat-value accent">' + dr.symbol + ' ' + dr.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Совет руны</span><span class="stat-value good">' + dr.advice + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Тотемное животное</div>' +
      '<div class="stat-row"><span class="stat-label">Тотем</span><span class="stat-value accent">' + totem.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Стихия</span><span class="stat-value">' + totem.element + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Архетип</span><span class="stat-value">' + totem.archetype + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Дар</span><span class="stat-value good">' + totem.gift + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Тень</span><span class="stat-value warn">' + totem.shadow + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Инстинкт</span><span class="stat-value">' + totem.instinct + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Защита</span><span class="stat-value">' + totem.protection + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Отношения</span><span class="stat-value">' + totem.relations + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Дело</span><span class="stat-value">' + totem.work + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Практика</span><span class="stat-value good">' + totem.practice + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Фраза силы</span><span class="stat-value accent">' + totem.phrase + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Чакры</div>' +
      '<div class="stat-row"><span class="stat-label">Чакра рождения</span><span class="stat-value accent">' + bc.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Активная чакра</span><span class="stat-value accent">' + ac.name + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Зона</span><span class="stat-value">' + ac.area + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Тень</span><span class="stat-value warn">' + ac.shadow + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Практика</span><span class="stat-value good">' + ac.practice + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Матрица Судьбы</div>' +
      '<div class="matrix-wrap">' + buildMatrixSVG(mx) + '</div>' +
      '<div class="stat-row"><span class="stat-label">Характер (' + mx.character.num + ')</span><span class="stat-value accent">' + mx.character.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Связь с миром (' + mx.connection.num + ')</span><span class="stat-value accent">' + mx.connection.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Карма (' + mx.karma.num + ')</span><span class="stat-value accent">' + mx.karma.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Духовная задача (' + mx.spirit.num + ')</span><span class="stat-value accent">' + mx.spirit.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Зона комфорта (' + mx.comfort.num + ')</span><span class="stat-value">' + mx.comfort.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Зона таланта (' + mx.talent.num + ')</span><span class="stat-value good">' + mx.talent.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Духовный рост (' + mx.growth.num + ')</span><span class="stat-value">' + mx.growth.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Кармический хвост (' + mx.tail.num + ')</span><span class="stat-value warn">' + mx.tail.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Зона денег (' + mx.money.num + ')</span><span class="stat-value accent">' + mx.money.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Зона отношений (' + mx.relations.num + ')</span><span class="stat-value accent">' + mx.relations.desc.split(' — ')[0] + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Предназначение (' + mx.missionGeneral.num + ')</span><span class="stat-value good">' + mx.missionGeneral.desc.split(' — ')[0] + '</span></div>' +
    '</div>' +

    '<div class="profile-card">' +
      '<div class="card-label">Статистика оракула</div>' +
      '<div class="stat-row"><span class="stat-label">Событий записано</span><span class="stat-value" id="eventCount">' + events.length + '</span></div>' +
      '<div class="stat-row"><span class="stat-label">Паттернов найдено</span><span class="stat-value" id="patternCount">0</span></div>' +
    '</div>' +
    '<div id="profileAuthInline"></div>' +
    '<button onclick="clearStorage()" style="width:100%;padding:14px;background:rgba(220,80,80,0.08);border:0.5px solid rgba(220,80,80,0.2);border-radius:14px;color:#c88080;font-size:14px;cursor:pointer;font-family:inherit;margin-top:8px;">Сбросить локальные данные</button>';
  bindProfileRows();
}

function bindProfileRows() {
  document.querySelectorAll('#profileContent .profile-card').forEach(function(card) {
    var section = card.querySelector('.card-label')?.textContent.trim() || 'Профиль';
    card.querySelectorAll('.stat-row').forEach(function(row) {
      var valueText = row.querySelector('.stat-value')?.textContent.trim() || '';
      if (valueText.length > 28 || valueText.indexOf(',') !== -1) {
        row.classList.add('stat-row-long');
      }
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.title = 'Получить разбор';
      row.onclick = function() {
        var label = row.querySelector('.stat-label')?.textContent.trim() || 'Позиция';
        var value = row.querySelector('.stat-value')?.textContent.trim() || '';
        requestProfileInsight(section, label, value);
      };
      row.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      };
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const diaryPatternRules = [
  {
    title: 'Тревожная тишина',
    words: ['молчит','тишина','не отвечает','пропал','игнор','жду ответа','перепис'],
    desc: 'В летописи повторяется пустое место между тобой и другим человеком. Велес видит, что тишина быстро становится знаком угрозы, даже когда фактов ещё мало.',
    advice: 'Когда эта нить появляется снова, сначала верни тело в покой, а потом пиши одно ясное сообщение вместо потока вопросов.'
  },
  {
    title: 'Узел отношений',
    words: ['партнёр','партнер','отнош','любов','ревн','расстал','расстались','ссора','близк'],
    desc: 'События часто сходятся вокруг близости, доверия и границ. Эта тема просит не гадать за другого, а ясно видеть свою потребность.',
    advice: 'Записывай не только что сделал другой, но и что ты хотел получить в этот момент: ясность, тепло, выбор или подтверждение.'
  },
  {
    title: 'Денежная тропа',
    words: ['деньг','работ','проект','клиент','зарплат','доход','бизнес','сделк','карьер'],
    desc: 'В хронике проступает линия дела и ресурсов. Здесь важно отличать знак возможности от усталого желания всё бросить.',
    advice: 'Перед решением о деньгах выпиши один практический шаг, одну опасность и один срок — так знак станет действием.'
  },
  {
    title: 'Старая роль',
    words: ['мама','отец','родител','семь','род','обид','вина','должен','должна'],
    desc: 'Эта нить похожа на родовой сценарий: тебя снова тянет в привычную роль, где приходится заслуживать право быть собой.',
    advice: 'Отдели свой выбор от ожиданий семьи и сформулируй одну границу короткой спокойной фразой.'
  },
  {
    title: 'Тело подаёт знак',
    words: ['устал','сон','болит','тело','энерг','сил нет','выгор','паник','дыш'],
    desc: 'События говорят не только умом, но и телом. Велес видит, что сила уходит, когда ты слишком долго держишь внутреннее напряжение.',
    advice: 'Сначала сон, вода, дыхание и прогулка; важные решения лучше принимать после возвращения сил.'
  },
  {
    title: 'Развилка выбора',
    words: ['выбор','решить','сомнев','не знаю','стоит ли','уйти','остаться','начать','боюсь'],
    desc: 'Повторяется место развилки: одна часть тебя зовёт вперёд, другая ищет гарантий. Так судьба проверяет не смелость, а честность намерения.',
    advice: 'Выбери шаг на сутки, а не решение на всю жизнь: маленькое действие покажет больше, чем долгие размышления.'
  },
  {
    title: 'Знаки и сны',
    words: ['сон','снилось','знак','совпад','маг','интуиц','предчув','карта','луна'],
    desc: 'В хронике появляются тонкие знаки: сны, совпадения, внутренние предчувствия. Их сила в наблюдении, а не в спешной трактовке.',
    advice: 'Записывай знак, настроение и последствие; через несколько записей станет видно, где интуиция, а где шум.'
  }
];

function analyzeDiaryPatterns() {
  var total = events.length;
  if (total === 0) return [];

  var patterns = diaryPatternRules.map(function(rule) {
    var matched = events.filter(function(e) {
      var text = String(e.text || '').toLowerCase();
      return rule.words.some(function(w) { return text.indexOf(w) >= 0; });
    });
    return {
      title: rule.title,
      desc: rule.desc,
      advice: rule.advice,
      count: matched.length,
      latest: matched.length ? matched[matched.length - 1].date : null
    };
  }).filter(function(p) {
    return p.count >= 2 || (total < 3 && p.count >= 1);
  }).sort(function(a, b) {
    return b.count - a.count;
  });

  return patterns.slice(0, 3);
}

function buildDiaryPatterns() {
  var patterns = analyzeDiaryPatterns();
  var html = '<div class="diary-patterns">' +
    '<div class="diary-section-label"><div class="pattern-icon"><div class="pattern-icon-inner"></div></div>Паттерны</div>';

  if (events.length === 0) {
    html += '<div class="diary-pattern-empty">Пока летопись пуста. Записывай события, и Велес начнёт видеть повторяющиеся нити.</div>';
  } else if (patterns.length === 0) {
    html += '<div class="diary-pattern-empty">Записей уже ' + events.length + ', но устойчивый узор ещё не проявился. Нужно больше событий, чтобы отделить знак от случайности.</div>';
  } else {
    html += patterns.map(function(p) {
      return '<div class="diary-pattern">' +
        '<div class="diary-pattern-top">' +
          '<div class="diary-pattern-title">' + escapeHtml(p.title) + '</div>' +
          '<div class="diary-pattern-count">' + p.count + ' ' + patternEventWord(p.count) + '</div>' +
        '</div>' +
        '<div class="diary-pattern-desc">' + escapeHtml(p.desc) + '</div>' +
        '<div class="diary-pattern-advice">' + escapeHtml(p.advice) + '</div>' +
      '</div>';
    }).join('');
  }

  return html + '</div>';
}

function patternEventWord(n) {
  if (n === 1) return 'событие';
  if (n > 1 && n < 5) return 'события';
  return 'событий';
}

function updatePatternCount() {
  var pc = document.getElementById('patternCount');
  if (pc) pc.textContent = analyzeDiaryPatterns().length;
}

function buildDiary() {
  var hasContent = events.length > 0 || archivedChats.length > 0;
  document.getElementById('diaryList').innerHTML =
    buildDiaryPatterns() +
    (hasContent ? '' :
      '<div style="text-align:center; padding: 60px 24px;">' +
        '<div style="font-size: 14px; color: #6f7167; line-height: 1.7;">' +
          'Дневник пуст.<br>Расскажи оракулу о событиях — они появятся здесь с космическим контекстом.' +
        '</div>' +
      '</div>');
  updatePatternCount();
}
