function buildPersonProfile(name, birthValue) {
  var date = new Date(birthValue);
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var signIdx = getZodiac(month, day);
  var lp = lifePathNumber(birthValue);
  var mx = calcMatrix(day, month, date.getFullYear());
  var br = birthRune(birthValue);
  var chakra = birthChakra(birthValue);
  return {
    name: String(name || 'Человек').trim(),
    birth: birthValue,
    day: day,
    month: month,
    year: date.getFullYear(),
    signIdx: signIdx,
    sign: signsRu[signIdx],
    element: elements[signIdx],
    planet: planets[signIdx],
    lifePath: lp,
    destiny: destinyNumber(name || ''),
    soul: soulNumber(name || ''),
    rune: br.symbol + ' ' + br.name,
    chakra: chakra.name,
    matrix: mx
  };
}

function calculateBondScore(a, b) {
  var score = 42;
  if (a.element === b.element) score += 18;
  if ((a.element === 'Огонь' && b.element === 'Воздух') || (a.element === 'Воздух' && b.element === 'Огонь')) score += 12;
  if ((a.element === 'Земля' && b.element === 'Вода') || (a.element === 'Вода' && b.element === 'Земля')) score += 12;
  if (Math.abs(a.lifePath - b.lifePath) <= 1) score += 9;
  if (a.destiny === b.destiny) score += 8;
  if (a.matrix.relations.num === b.matrix.relations.num) score += 10;
  if (a.matrix.connection.num === b.matrix.connection.num) score += 8;
  score -= Math.min(14, Math.abs(a.matrix.tail.num - b.matrix.tail.num));
  return Math.max(18, Math.min(96, score));
}

function getBondDynamic(a, b, score) {
  if (score >= 78) return 'сильное притяжение, быстрое узнавание и высокая чувствительность друг к другу';
  if (score >= 62) return 'рабочая связь: много точек контакта, но важны ясные правила общения';
  if (score >= 46) return 'неровная связь: интерес есть, но ритмы и ожидания могут расходиться';
  return 'сложная связь: она может чему-то учить, но требует спокойных границ и проверки фактами';
}

function buildBondProfile(partnerName, partnerBirth) {
  var self = buildPersonProfile(userName, userBirthValue);
  var partner = buildPersonProfile(partnerName, partnerBirth);
  var score = calculateBondScore(self, partner);
  var pairMatrix = {
    contact: matrixReduce(self.matrix.connection.num + partner.matrix.connection.num),
    relations: matrixReduce(self.matrix.relations.num + partner.matrix.relations.num),
    lesson: matrixReduce(self.matrix.tail.num + partner.matrix.tail.num),
    mission: matrixReduce(self.matrix.missionGeneral.num + partner.matrix.missionGeneral.num)
  };
  return {
    createdAt: Date.now(),
    self: self,
    partner: partner,
    score: score,
    dynamic: getBondDynamic(self, partner, score),
    pairMatrix: {
      contact: pairMatrix.contact + ' ' + arcanEnergies[pairMatrix.contact],
      relations: pairMatrix.relations + ' ' + arcanEnergies[pairMatrix.relations],
      lesson: pairMatrix.lesson + ' ' + arcanEnergies[pairMatrix.lesson],
      mission: pairMatrix.mission + ' ' + arcanEnergies[pairMatrix.mission]
    },
    balance: self.element === partner.element
      ? 'одна стихия усиливает узнавание, но может делать реакции похожими'
      : self.element + ' встречает ' + partner.element + ': связь требует перевода языка одного человека на язык другого',
    advice: score >= 62
      ? 'сохраняйте прямой разговор и не проверяйте связь молчанием'
      : 'не торопи сближение: сначала смотри на поступки, ритм ответа и способность держать договорённости'
  };
}

function renderBond() {
  var result = document.getElementById('bondResult');
  if (!result) return;
  var nameInput = document.getElementById('bondNameInput');
  var birthInput = document.getElementById('bondBirthInput');

  if (!bondProfile) {
    result.innerHTML = '';
    return;
  }

  var b = bondProfile;
  if (nameInput && !nameInput.value) nameInput.value = b.partner.name || '';
  if (birthInput && !birthInput.value) birthInput.value = b.partner.birth || '';
  var width = Math.max(18, Math.min(96, b.score));
  result.innerHTML =
    '<div class="bond-card">' +
      '<div class="bond-card-title">' + escapeHtml(userName) + ' и ' + escapeHtml(b.partner.name) + '</div>' +
      '<div class="bond-card-sub">' + escapeHtml(b.dynamic) + '</div>' +
      '<div class="bond-meter"><div class="bond-meter-fill" style="width:' + width + '%"></div></div>' +
      '<div class="bond-grid">' +
        '<div class="bond-chip"><span>Ты</span><strong>' + escapeHtml(b.self.sign) + ' • ' + escapeHtml(b.self.element) + '</strong></div>' +
        '<div class="bond-chip"><span>Человек</span><strong>' + escapeHtml(b.partner.sign) + ' • ' + escapeHtml(b.partner.element) + '</strong></div>' +
        '<div class="bond-chip"><span>Индекс</span><strong>' + b.score + '%</strong></div>' +
        '<div class="bond-chip"><span>Контакт</span><strong>' + escapeHtml(b.pairMatrix.contact.split(' — ')[0]) + '</strong></div>' +
        '<div class="bond-chip"><span>Отношения</span><strong>' + escapeHtml(b.pairMatrix.relations.split(' — ')[0]) + '</strong></div>' +
        '<div class="bond-chip"><span>Урок</span><strong>' + escapeHtml(b.pairMatrix.lesson.split(' — ')[0]) + '</strong></div>' +
      '</div>' +
      '<div class="bond-note">' + escapeHtml(b.balance) + '. ' + escapeHtml(b.advice) + '.</div>' +
      '<div class="bond-result-actions">' +
        '<button class="invite-btn compact" onclick="requestBondInsight()">Разобрать</button>' +
        '<button class="invite-btn compact" onclick="clearBond()">Очистить</button>' +
      '</div>' +
    '</div>';
}

function calculateBond() {
  var nameInput = document.getElementById('bondNameInput');
  var birthInput = document.getElementById('bondBirthInput');
  var name = nameInput.value.trim() || 'Человек';
  var birth = birthInput.value;
  if (!birth) {
    birthInput.style.borderColor = 'rgba(220,80,80,0.55)';
    birthInput.style.background = 'rgba(220,80,80,0.06)';
    return;
  }
  birthInput.style.borderColor = 'rgba(197,154,92,0.18)';
  birthInput.style.background = 'rgba(8,11,10,0.78)';
  bondProfile = buildBondProfile(name, birth);
  saveToStorage();
  renderBond();
}

function clearBond() {
  bondProfile = null;
  var nameInput = document.getElementById('bondNameInput');
  var birthInput = document.getElementById('bondBirthInput');
  if (nameInput) nameInput.value = '';
  if (birthInput) birthInput.value = '';
  saveToStorage();
  renderBond();
}
