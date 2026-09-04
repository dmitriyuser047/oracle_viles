function oracleText(message) {
  return ([message || ''].concat(events.map(function(e) { return e.text || ''; }))).join(' ').toLowerCase();
}

function hasAny(text, words) {
  return words.some(function(w) { return text.indexOf(w) >= 0; });
}

function countAny(text, words) {
  return words.reduce(function(n, w) { return n + (text.indexOf(w) >= 0 ? 1 : 0); }, 0);
}

// Лунный календарь
function getMoonPhase(date) {
  var known = new Date(2000, 0, 6, 18, 14);
  var synodic = 29.53059;
  var diff = (date - known) / 86400000;
  var phase = ((diff % synodic) + synodic) % synodic;
  var pct = phase / synodic;
  var phases = [
    { name: 'Новолуние', icon: '\u{1F311}', max: 0.0375 },
    { name: 'Растущий серп', icon: '\u{1F312}', max: 0.125 },
    { name: 'Первая четверть', icon: '\u{1F313}', max: 0.2125 },
    { name: 'Растущая луна', icon: '\u{1F314}', max: 0.375 },
    { name: 'Полнолуние', icon: '\u{1F315}', max: 0.4625 },
    { name: 'Убывающая луна', icon: '\u{1F316}', max: 0.625 },
    { name: 'Последняя четверть', icon: '\u{1F317}', max: 0.7875 },
    { name: 'Убывающий серп', icon: '\u{1F318}', max: 0.9625 },
    { name: 'Новолуние', icon: '\u{1F311}', max: 1.0 }
  ];
  for (var i = 0; i < phases.length; i++) {
    if (pct <= phases[i].max) return { name: phases[i].name, icon: phases[i].icon, day: Math.floor(phase) + 1, pct: pct };
  }
  return { name: phases[0].name, icon: phases[0].icon, day: 1, pct: 0 };
}

// Китайский зодиак
function getChineseZodiac(year) {
  var animals = ['Крыса','Бык','Тигр','Кролик','Дракон','Змея','Лошадь','Коза','Обезьяна','Петух','Собака','Свинья'];
  var elems = ['Металл','Вода','Дерево','Огонь','Земля'];
  var animalIcons = ['\u{1F400}','\u{1F402}','\u{1F405}','\u{1F407}','\u{1F409}','\u{1F40D}','\u{1F40E}','\u{1F410}','\u{1F412}','\u{1F413}','\u{1F415}','\u{1F416}'];
  return {
    animal: animals[(year - 4) % 12],
    icon: animalIcons[(year - 4) % 12],
    element: elems[Math.floor((year - 4) % 10 / 2)]
  };
}

// Таро
var tarotMajor = [
  {name:'Шут',meaning:'новые начала, свобода, спонтанность'},
  {name:'Маг',meaning:'сила воли, мастерство, ресурсы'},
  {name:'Жрица',meaning:'интуиция, тайны, внутренний голос'},
  {name:'Императрица',meaning:'изобилие, творчество, забота'},
  {name:'Император',meaning:'структура, власть, стабильность'},
  {name:'Иерофант',meaning:'мудрость, наставничество, внутренний закон'},
  {name:'Влюблённые',meaning:'выбор, союз, гармония'},
  {name:'Колесница',meaning:'воля, победа, движение вперёд'},
  {name:'Сила',meaning:'внутренняя сила, терпение, мужество'},
  {name:'Отшельник',meaning:'поиск истины, одиночество, мудрость'},
  {name:'Колесо Фортуны',meaning:'перемены, цикличность, судьба'},
  {name:'Справедливость',meaning:'баланс, закон причины и следствия'},
  {name:'Повешенный',meaning:'жертва, новый взгляд, пауза'},
  {name:'Смерть',meaning:'трансформация, конец и начало'},
  {name:'Умеренность',meaning:'баланс, терпение, срединный путь'},
  {name:'Дьявол',meaning:'привязанности, искушения, тени'},
  {name:'Башня',meaning:'разрушение старого, откровение'},
  {name:'Звезда',meaning:'надежда, вдохновение, обновление'},
  {name:'Луна',meaning:'иллюзии, подсознание, страхи'},
  {name:'Солнце',meaning:'радость, успех, ясность'},
  {name:'Суд',meaning:'пробуждение, призвание, итог'},
  {name:'Мир',meaning:'завершение, целостность, гармония'}
];

var waiteTarotDeck = [
  {name:'Шут', suit:'Старшие арканы', meaning:'новое начало, свобода, доверие пути'},
  {name:'Маг', suit:'Старшие арканы', meaning:'воля, мастерство, личная сила'},
  {name:'Верховная Жрица', suit:'Старшие арканы', meaning:'интуиция, тайна, внутреннее знание'},
  {name:'Императрица', suit:'Старшие арканы', meaning:'рост, плодородие, забота, творчество'},
  {name:'Император', suit:'Старшие арканы', meaning:'структура, власть, порядок, границы'},
  {name:'Иерофант', suit:'Старшие арканы', meaning:'наставничество, вера, духовный закон'},
  {name:'Влюблённые', suit:'Старшие арканы', meaning:'выбор, союз, согласие сердца'},
  {name:'Колесница', suit:'Старшие арканы', meaning:'движение, воля, победа через управление'},
  {name:'Сила', suit:'Старшие арканы', meaning:'мягкая власть, выдержка, укрощение страсти'},
  {name:'Отшельник', suit:'Старшие арканы', meaning:'поиск истины, уединение, внутренний свет'},
  {name:'Колесо Фортуны', suit:'Старшие арканы', meaning:'поворот судьбы, цикл, перемены'},
  {name:'Справедливость', suit:'Старшие арканы', meaning:'равновесие, честность, последствия выбора'},
  {name:'Повешенный', suit:'Старшие арканы', meaning:'пауза, иной взгляд, добровольная остановка'},
  {name:'Смерть', suit:'Старшие арканы', meaning:'завершение, очищение, переход'},
  {name:'Умеренность', suit:'Старшие арканы', meaning:'исцеление меры, терпение, смешение потоков'},
  {name:'Дьявол', suit:'Старшие арканы', meaning:'зависимость, искушение, теневая привязка'},
  {name:'Башня', suit:'Старшие арканы', meaning:'слом старого, резкая правда, освобождение'},
  {name:'Звезда', suit:'Старшие арканы', meaning:'надежда, вдохновение, тихое восстановление'},
  {name:'Луна', suit:'Старшие арканы', meaning:'страх, сны, неясность, сила подсознания'},
  {name:'Солнце', suit:'Старшие арканы', meaning:'ясность, радость, открытость, успех'},
  {name:'Суд', suit:'Старшие арканы', meaning:'пробуждение, зов, возвращение к призванию'},
  {name:'Мир', suit:'Старшие арканы', meaning:'завершение, целостность, зрелый результат'},
  {name:'Туз Жезлов', suit:'Жезлы', meaning:'искра, желание, новый импульс'},
  {name:'Двойка Жезлов', suit:'Жезлы', meaning:'план, выбор направления, взгляд вдаль'},
  {name:'Тройка Жезлов', suit:'Жезлы', meaning:'расширение, ожидание первых плодов'},
  {name:'Четвёрка Жезлов', suit:'Жезлы', meaning:'праздник, дом, закрепление успеха'},
  {name:'Пятёрка Жезлов', suit:'Жезлы', meaning:'спор, конкуренция, проверка силы'},
  {name:'Шестёрка Жезлов', suit:'Жезлы', meaning:'победа, признание, видимый успех'},
  {name:'Семёрка Жезлов', suit:'Жезлы', meaning:'оборона позиции, стойкость, вызов'},
  {name:'Восьмёрка Жезлов', suit:'Жезлы', meaning:'быстрое движение, вести, ускорение'},
  {name:'Девятка Жезлов', suit:'Жезлы', meaning:'усталость, защита, последний рубеж'},
  {name:'Десятка Жезлов', suit:'Жезлы', meaning:'бремя, перегруз, ответственность'},
  {name:'Паж Жезлов', suit:'Жезлы', meaning:'вестник идеи, любопытство, начало пути'},
  {name:'Рыцарь Жезлов', suit:'Жезлы', meaning:'рывок, страсть, смелое движение'},
  {name:'Королева Жезлов', suit:'Жезлы', meaning:'харизма, уверенность, живая сила'},
  {name:'Король Жезлов', suit:'Жезлы', meaning:'лидерство, замысел, огненная власть'},
  {name:'Туз Кубков', suit:'Кубки', meaning:'чувство, открытое сердце, новый поток'},
  {name:'Двойка Кубков', suit:'Кубки', meaning:'союз, взаимность, встреча'},
  {name:'Тройка Кубков', suit:'Кубки', meaning:'радость, круг поддержки, разделённое чувство'},
  {name:'Четвёрка Кубков', suit:'Кубки', meaning:'усталость сердца, закрытость, упущенный дар'},
  {name:'Пятёрка Кубков', suit:'Кубки', meaning:'потеря, сожаление, взгляд на пролитое'},
  {name:'Шестёрка Кубков', suit:'Кубки', meaning:'прошлое, память, детская чистота'},
  {name:'Семёрка Кубков', suit:'Кубки', meaning:'иллюзии, варианты, соблазн фантазий'},
  {name:'Восьмёрка Кубков', suit:'Кубки', meaning:'уход, поиск большего, эмоциональный переход'},
  {name:'Девятка Кубков', suit:'Кубки', meaning:'желание, удовлетворение, личная радость'},
  {name:'Десятка Кубков', suit:'Кубки', meaning:'семья, гармония, полнота чувства'},
  {name:'Паж Кубков', suit:'Кубки', meaning:'нежная весть, воображение, робкое чувство'},
  {name:'Рыцарь Кубков', suit:'Кубки', meaning:'романтический жест, предложение, мечта'},
  {name:'Королева Кубков', suit:'Кубки', meaning:'эмпатия, глубина, тонкое восприятие'},
  {name:'Король Кубков', suit:'Кубки', meaning:'зрелое чувство, спокойствие, эмоциональная власть'},
  {name:'Туз Мечей', suit:'Мечи', meaning:'ясность, решение, правда'},
  {name:'Двойка Мечей', suit:'Мечи', meaning:'сомнение, закрытый выбор, пауза ума'},
  {name:'Тройка Мечей', suit:'Мечи', meaning:'боль, правда сердца, разочарование'},
  {name:'Четвёрка Мечей', suit:'Мечи', meaning:'покой, восстановление, тишина'},
  {name:'Пятёрка Мечей', suit:'Мечи', meaning:'конфликт, победа с потерей, острый спор'},
  {name:'Шестёрка Мечей', suit:'Мечи', meaning:'переход, уход от бури, путь к тишине'},
  {name:'Семёрка Мечей', suit:'Мечи', meaning:'хитрость, скрытый ход, недосказанность'},
  {name:'Восьмёрка Мечей', suit:'Мечи', meaning:'скованность, страх, ограничение ума'},
  {name:'Девятка Мечей', suit:'Мечи', meaning:'тревога, бессонница, тяжёлая мысль'},
  {name:'Десятка Мечей', suit:'Мечи', meaning:'конец напряжения, болезненная точка'},
  {name:'Паж Мечей', suit:'Мечи', meaning:'наблюдение, вопрос, осторожная правда'},
  {name:'Рыцарь Мечей', suit:'Мечи', meaning:'напор, резкость, стремительное решение'},
  {name:'Королева Мечей', suit:'Мечи', meaning:'ясная граница, независимость, честный взгляд'},
  {name:'Король Мечей', suit:'Мечи', meaning:'разум, закон, холодная стратегия'},
  {name:'Туз Пентаклей', suit:'Пентакли', meaning:'ресурс, шанс, материальное зерно'},
  {name:'Двойка Пентаклей', suit:'Пентакли', meaning:'баланс дел, гибкость, смена ритма'},
  {name:'Тройка Пентаклей', suit:'Пентакли', meaning:'мастерство, сотрудничество, работа'},
  {name:'Четвёрка Пентаклей', suit:'Пентакли', meaning:'контроль, удержание, страх потери'},
  {name:'Пятёрка Пентаклей', suit:'Пентакли', meaning:'нехватка, холод, просьба о помощи'},
  {name:'Шестёрка Пентаклей', suit:'Пентакли', meaning:'обмен, помощь, мера отдачи'},
  {name:'Семёрка Пентаклей', suit:'Пентакли', meaning:'ожидание урожая, терпение, оценка труда'},
  {name:'Восьмёрка Пентаклей', suit:'Пентакли', meaning:'практика, ремесло, ежедневный труд'},
  {name:'Девятка Пентаклей', suit:'Пентакли', meaning:'самодостаточность, плод, достоинство'},
  {name:'Десятка Пентаклей', suit:'Пентакли', meaning:'род, наследие, устойчивый дом'},
  {name:'Паж Пентаклей', suit:'Пентакли', meaning:'обучение, первый ресурс, практический интерес'},
  {name:'Рыцарь Пентаклей', suit:'Пентакли', meaning:'медленный труд, надёжность, дисциплина'},
  {name:'Королева Пентаклей', suit:'Пентакли', meaning:'забота о теле и доме, земная щедрость'},
  {name:'Король Пентаклей', suit:'Пентакли', meaning:'материальная власть, устойчивость, результат'}
];

function birthTarot(lifePath) {
  var num = lifePath;
  if (num === 22) return tarotMajor[0]; // Мастер 22 = Шут
  while (num > 21) num = reduceNum(num);
  return tarotMajor[num];
}

function yearTarot(bDay, bMonth) {
  var py = personalYear(bDay, bMonth);
  var num = py;
  while (num > 21) num = reduceNum(num);
  return tarotMajor[num];
}

function dailyTarot(date) {
  var seed = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
  return tarotMajor[seed % 22];
}

function jsString(value) {
  return JSON.stringify(String(value || '')).replace(/</g, '\\u003c');
}

function hashText(value) {
  var text = String(value || '');
  var hash = 0;
  for (var i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildTarotSpread(message) {
  var seed = hashText([
    userName,
    userBirthValue,
    new Date().toLocaleDateString('ru-RU'),
    message
  ].join('|'));
  var used = {};
  var positions = [
    {
      title: 'Корень вопроса',
      prompt: 'что на самом деле питает ситуацию'
    },
    {
      title: 'Скрытая сила и тень',
      prompt: 'где ресурс человека и какая ловушка рядом'
    },
    {
      title: 'Ближайший шаг',
      prompt: 'что сделать в ближайшие дни'
    }
  ];

  return positions.map(function(pos, idx) {
    var cardIdx = (seed + idx * 17 + personalDay(userBirth.getDate(), userBirth.getMonth() + 1)) % waiteTarotDeck.length;
    while (used[cardIdx]) cardIdx = (cardIdx + 1) % waiteTarotDeck.length;
    used[cardIdx] = true;
    var card = waiteTarotDeck[cardIdx];
    var reversed = ((seed + idx + cardIdx) % 5) === 0;
    return {
      position: pos.title,
      prompt: pos.prompt,
      card: card.name,
      deck: 'Райдер–Уэйт',
      suit: card.suit,
      meaning: card.meaning,
      orientation: reversed ? 'перевёрнутая' : 'прямая',
      nuance: reversed ? 'тень, задержка или искажённое проявление' : 'открытая сила карты'
    };
  });
}

// Матрица Судьбы: упрощённая модель на 22 арканах
function matrixReduce(n) {
  while (n > 22) n = String(n).split('').reduce(function(a,b) { return a + parseInt(b); }, 0);
  return n;
}

var arcanEnergies = [
  '',
  'Маг — сила воли, лидерство, начало',
  'Жрица — интуиция, тайное знание',
  'Императрица — творчество, изобилие, женственность',
  'Император — порядок, власть, стабильность',
  'Иерофант — наставничество, учительство, духовность',
  'Влюблённые — выбор, любовь, испытание',
  'Колесница — движение, победа, амбиции',
  'Справедливость — баланс, закон, карма',
  'Отшельник — мудрость, поиск, одиночество',
  'Колесо Фортуны — перемены, цикличность, удача',
  'Сила — внутренняя мощь, терпение, страсть',
  'Повешенный — жертва, пауза, новый взгляд',
  'Смерть — трансформация, обновление, конец',
  'Умеренность — гармония, срединный путь',
  'Дьявол — привязанности, страхи, теневая сторона',
  'Башня — крушение, освобождение, прорыв',
  'Звезда — надежда, вдохновение, путь',
  'Луна — иллюзии, подсознание, тревоги',
  'Солнце — радость, успех, энергия',
  'Суд — пробуждение, призвание, трансформация',
  'Мир — целостность, завершение, миссия',
  'Шут — свобода, спонтанность, новые начала'
];

function calcMatrix(day, month, year) {
  var A = matrixReduce(day);
  var B = matrixReduce(month);
  var yearSum = String(year).split('').reduce(function(a,b) { return a + parseInt(b); }, 0);
  var C = matrixReduce(yearSum);
  var D = matrixReduce(A + B + C);

  var E = matrixReduce(A + B);  // зона комфорта
  var F = matrixReduce(B + C);  // зона таланта
  var G = matrixReduce(C + D);  // духовный рост
  var H = matrixReduce(A + D);  // кармический хвост

  var earthLine = matrixReduce(A + E + B);  // линия земли
  var skyLine = matrixReduce(C + G + D);    // линия неба
  var missionPersonal = matrixReduce(E + F); // личное предназначение
  var missionSocial = matrixReduce(G + H);   // социальное предназначение
  var missionGeneral = matrixReduce(missionPersonal + missionSocial); // общее предназначение

  var moneyZone = matrixReduce(E + H);     // зона денег
  var relZone = matrixReduce(F + G);       // зона отношений

  return {
    character: { num: A, desc: arcanEnergies[A] },
    connection: { num: B, desc: arcanEnergies[B] },
    karma: { num: C, desc: arcanEnergies[C] },
    spirit: { num: D, desc: arcanEnergies[D] },
    comfort: { num: E, desc: arcanEnergies[E] },
    talent: { num: F, desc: arcanEnergies[F] },
    growth: { num: G, desc: arcanEnergies[G] },
    tail: { num: H, desc: arcanEnergies[H] },
    earthLine: earthLine,
    skyLine: skyLine,
    missionPersonal: { num: missionPersonal, desc: arcanEnergies[missionPersonal] },
    missionSocial: { num: missionSocial, desc: arcanEnergies[missionSocial] },
    missionGeneral: { num: missionGeneral, desc: arcanEnergies[missionGeneral] },
    money: { num: moneyZone, desc: arcanEnergies[moneyZone] },
    relations: { num: relZone, desc: arcanEnergies[relZone] }
  };
}

// Стихия дня
function getDayElement(date) {
  var days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  var rulers = ['Солнце','Луна','Марс','Меркурий','Юпитер','Венера','Сатурн'];
  var d = date.getDay();
  return { day: days[d], ruler: rulers[d] };
}

// Сезон силы знака
function getSeasonPower(signIdx) {
  var now = new Date();
  var currentSign = getZodiac(now.getMonth()+1, now.getDate());
  var diff = ((currentSign - signIdx) + 12) % 12;
  if (diff === 0) return { status: 'Сезон силы', desc: 'Солнце в твоём знаке — максимум энергии' };
  if (diff === 6) return { status: 'Противофаза', desc: 'Солнце напротив — время для баланса' };
  if (diff <= 2 || diff >= 10) return { status: 'Близко к пику', desc: 'Высокая энергия, благоприятный период' };
  return { status: 'Фоновый режим', desc: 'Копи силы, действуй обдуманно' };
}

// SVG матрицы судьбы
function buildMatrixSVG(mx) {
  var w = 300, h = 320;
  var cx = 150, cy = 150;
  var r = 110; // radius of diamond
  var nr = 18; // node radius
  var snr = 14; // small node radius

  var nodes = [
    { x: cx, y: cy - r, num: mx.character.num, label: 'ХАРАКТЕР', fullLabel: 'Характер', desc: mx.character.desc, main: true },
    { x: cx + r, y: cy, num: mx.connection.num, label: 'СВЯЗЬ', fullLabel: 'Связь с миром', desc: mx.connection.desc, main: true },
    { x: cx, y: cy + r, num: mx.karma.num, label: 'КАРМА', fullLabel: 'Карма', desc: mx.karma.desc, main: true },
    { x: cx - r, y: cy, num: mx.spirit.num, label: 'ДУХ', fullLabel: 'Духовная задача', desc: mx.spirit.desc, main: true },
    { x: cx + r*0.5, y: cy - r*0.5, num: mx.comfort.num, label: 'КОМФОРТ', fullLabel: 'Зона комфорта', desc: mx.comfort.desc, main: false },
    { x: cx + r*0.5, y: cy + r*0.5, num: mx.talent.num, label: 'ТАЛАНТ', fullLabel: 'Зона таланта', desc: mx.talent.desc, main: false },
    { x: cx - r*0.5, y: cy + r*0.5, num: mx.growth.num, label: 'РОСТ', fullLabel: 'Духовный рост', desc: mx.growth.desc, main: false },
    { x: cx - r*0.5, y: cy - r*0.5, num: mx.tail.num, label: 'КАРМ.ХВОСТ', fullLabel: 'Кармический хвост', desc: mx.tail.desc, main: false },
    { x: cx, y: cy, num: mx.missionGeneral.num, label: 'МИССИЯ', fullLabel: 'Предназначение', desc: mx.missionGeneral.desc, main: true },
  ];

  var lines = [
    [0,4],[4,1],[1,5],[5,2],[2,6],[6,3],[3,7],[7,0], // diamond edges
    [0,2],[1,3], // diagonals
  ];

  var svg = '<svg viewBox="0 0 ' + w + ' ' + (h+10) + '" xmlns="http://www.w3.org/2000/svg">';

  // Lines
  for (var i = 0; i < lines.length; i++) {
    var a = nodes[lines[i][0]], b = nodes[lines[i][1]];
    var cls = (lines[i][0] <= 3 && lines[i][1] <= 3) ? 'matrix-line-main' : 'matrix-line';
    svg += '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" class="'+cls+'"/>';
  }

  // Nodes
  for (var j = 0; j < nodes.length; j++) {
    var n = nodes[j];
    var rad = n.main ? nr : snr;
    var circleClass = j === 8 ? 'matrix-node-center' : 'matrix-node-circle';
    var action = 'requestMatrixArcana(' + jsString(n.fullLabel) + ',' + n.num + ',' + jsString(n.desc) + ')';
    svg += '<g class="matrix-node" role="button" aria-label="Разобрать ' + escapeHtml(n.fullLabel) + ', аркан ' + n.num + '" onclick=\'' + action + '\'>';
    svg += '<title>' + escapeHtml(n.fullLabel + ': ' + n.desc) + '</title>';
    svg += '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+rad+'" class="'+circleClass+'"/>';
    svg += '<text x="'+n.x+'" y="'+(n.y+5)+'" text-anchor="middle" class="matrix-num">' + n.num + '</text>';
    var ly = n.y + rad + 12;
    if (j === 2 || j === 5 || j === 6) ly = n.y + rad + 12;
    if (j === 0 || j === 4 || j === 7) ly = n.y - rad - 5;
    if (j === 8) ly = n.y + rad + 13;
    svg += '<text x="'+n.x+'" y="'+ly+'" text-anchor="middle" class="matrix-label">' + n.label + '</text>';
    svg += '</g>';
  }

  // Money & Relations labels on sides
  svg += '<text x="'+cx+'" y="'+(h+5)+'" text-anchor="middle" style="fill:#6f7167;font-size:8px;font-family:inherit;">Деньги: ' + mx.money.num + ' • Отношения: ' + mx.relations.num + '</text>';

  svg += '</svg>';
  return svg;
}
