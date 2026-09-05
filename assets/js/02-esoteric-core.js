const signsRu = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
const signSymbols = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const elements = ['Огонь','Земля','Воздух','Вода','Огонь','Земля','Воздух','Вода','Огонь','Земля','Воздух','Вода'];
const qualities = ['Кардинальный','Фиксированный','Мутабельный','Кардинальный','Фиксированный','Мутабельный','Кардинальный','Фиксированный','Мутабельный','Кардинальный','Фиксированный','Мутабельный'];
const planets = ['Марс','Венера','Меркурий','Луна','Солнце','Меркурий','Венера','Плутон','Юпитер','Сатурн','Уран','Нептун'];
const signProfiles = [
  { archetype:'воин начала', gift:'быстро запускать движение и брать инициативу', shadow:'спешка, вспыльчивость, борьба ради борьбы', practice:'сначала выбери цель, потом делай один прямой шаг' },
  { archetype:'хранитель ценности', gift:'создавать устойчивость, ресурс и телесную опору', shadow:'упрямство, страх перемен, привязка к комфорту', practice:'закрепи одно решение материальным действием' },
  { archetype:'вестник и связующий', gift:'видеть варианты, соединять людей и смыслы', shadow:'рассеивание, суета, жизнь в бесконечных мыслях', practice:'сведи мысль к одной ясной фразе и одному разговору' },
  { archetype:'хранитель памяти и дома', gift:'чувствовать настроение, защищать близкое, помнить корни', shadow:'обида, закрытость, жизнь прошлым', practice:'отдели заботу от контроля и назови свою потребность' },
  { archetype:'сердце огня', gift:'проявляться, вдохновлять, вести через щедрость', shadow:'гордость, драматизация, зависимость от признания', practice:'покажи результат без просьбы о восхищении' },
  { archetype:'мастер порядка', gift:'видеть детали, улучшать систему, служить делу', shadow:'критика, тревожный контроль, вечная недоделанность', practice:'исправь одну деталь и остановись вовремя' },
  { archetype:'держатель равновесия', gift:'видеть обе стороны, договариваться, создавать лад', shadow:'нерешительность, зависимость от оценки, избегание конфликта', practice:'выбери позицию и скажи её спокойно' },
  { archetype:'страж глубины', gift:'видеть скрытое, выдерживать кризис, трансформировать боль', shadow:'подозрительность, контроль, разрушительная интенсивность', practice:'назови правду без давления и не усиливай драму' },
  { archetype:'искатель смысла', gift:'видеть горизонт, учиться, расширять путь', shadow:'поучение, бегство от деталей, обещания больше дела', practice:'преврати большую идею в один проверяемый шаг' },
  { archetype:'строитель вершины', gift:'выдержка, структура, ответственность, долгий результат', shadow:'жёсткость к себе, холодность, страх слабости', practice:'сделай маленький шаг к большой цели и признай уже пройденное' },
  { archetype:'проводник будущего', gift:'видеть новые системы, дружить с необычным, обновлять правила', shadow:'отстранённость, бунт ради бунта, холодная теория', practice:'проверь идею на пользе для живого человека' },
  { archetype:'слушатель тонкого', gift:'сострадание, интуиция, воображение, связь с глубиной', shadow:'растворение, уход от границ, спасательство', practice:'оставь сердце открытым, но поставь один берег' }
];
const numberProfiles = {
  1:{ meaning:'инициатива, самостоятельность, право начать', practice:'выбери одно действие, где ты первый' },
  2:{ meaning:'чувствительность, союз, дипломатия', practice:'сохрани контакт, но назови свою позицию' },
  3:{ meaning:'выражение, творчество, слово, лёгкость', practice:'оформи мысль в текст, разговор или маленький публичный жест' },
  4:{ meaning:'структура, труд, порядок, надёжность', practice:'собери план из трёх простых шагов' },
  5:{ meaning:'свобода, движение, опыт, перемены', practice:'дай себе движение, но зафиксируй границу' },
  6:{ meaning:'забота, ответственность, красота отношений', practice:'помоги без самопредательства' },
  7:{ meaning:'анализ, глубина, поиск истины, уединение', practice:'проверь одну гипотезу фактом' },
  8:{ meaning:'сила, управление, деньги, результат', practice:'измерь результат и выбери честный способ влияния' },
  9:{ meaning:'завершение, мудрость, служение большему', practice:'закрой один цикл и оставь только своё' },
  11:{ meaning:'интуитивный проводник, вдохновение, тонкий сигнал', practice:'заземли озарение одним проверяемым действием' },
  22:{ meaning:'мастер-строитель, крупная форма, воплощение идеи', practice:'разбей большую систему на первый кирпич' },
  33:{ meaning:'служение через сердце, обучение, исцеляющее присутствие', practice:'дай тепло, сохрани границу' }
};

function getZodiac(month, day) {
  const cutoffs = [
    [1,20,10],[2,19,11],[3,21,0],[4,20,1],[5,21,2],[6,21,3],
    [7,23,4],[8,23,5],[9,23,6],[10,23,7],[11,22,8],[12,22,9]
  ];
  var sign = cutoffs[month-1][2];
  if (day < cutoffs[month-1][1]) sign = (sign + 11) % 12;
  return sign;
}

function lifePathNumber(dateStr) {
  let sum = dateStr.replace(/-/g,'').split('').reduce((a,b) => a + parseInt(b), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').reduce((a,b) => a + parseInt(b), 0);
  }
  return sum;
}

function reduceNum(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce(function(a,b) { return a + parseInt(b); }, 0);
  }
  return n;
}

function cyrNumValue(ch) {
  var c = ch.toLowerCase();
  var cyr = 'абвгдежзиклмнопрстуфхцчшщъыьэюя';
  var lat = 'abcdefghijklmnopqrstuvwxyz';
  var idx = cyr.indexOf(c);
  if (idx >= 0) return (idx % 9) + 1;
  idx = lat.indexOf(c);
  if (idx >= 0) return (idx % 9) + 1;
  return 0;
}

function destinyNumber(name) {
  var sum = name.split('').reduce(function(a,c) { return a + cyrNumValue(c); }, 0);
  return reduceNum(sum);
}

function soulNumber(name) {
  var vowels = 'аеёиоуыэюяaeiou';
  var sum = name.toLowerCase().split('').filter(function(c) { return vowels.indexOf(c) >= 0; }).reduce(function(a,c) { return a + cyrNumValue(c); }, 0);
  return reduceNum(sum);
}

function personalityNum(name) {
  var vowels = 'аеёиоуыэюяaeiou';
  var all = 'абвгдежзиклмнопрстуфхцчшщэюяabcdefghijklmnopqrstuvwxyz';
  var sum = name.toLowerCase().split('').filter(function(c) { return all.indexOf(c) >= 0 && vowels.indexOf(c) < 0; }).reduce(function(a,c) { return a + cyrNumValue(c); }, 0);
  return reduceNum(sum);
}

function birthdayNum(day) { return reduceNum(day); }

function maturityNum(lifePath, destiny) { return reduceNum(lifePath + destiny); }

function numberMeaning(n) {
  return (numberProfiles[n] || numberProfiles[reduceNum(n)] || numberProfiles[1]).meaning;
}

function numberPractice(n) {
  return (numberProfiles[n] || numberProfiles[reduceNum(n)] || numberProfiles[1]).practice;
}

function personalYear(bDay, bMonth) {
  var y = new Date().getFullYear();
  var digits = String(bDay) + String(bMonth) + String(y);
  return reduceNum(digits.split('').reduce(function(a,b) { return a + parseInt(b); }, 0));
}

function personalMonth(bDay, bMonth) {
  var py = personalYear(bDay, bMonth);
  return reduceNum(py + new Date().getMonth() + 1);
}

function personalDay(bDay, bMonth) {
  var pm = personalMonth(bDay, bMonth);
  return reduceNum(pm + new Date().getDate());
}

function reduceToRange(n, max) {
  while (n > max) {
    n = String(n).split('').reduce(function(a,b) { return a + parseInt(b); }, 0);
  }
  return n <= 0 ? max : n;
}

const sephirot = [
  { name:'Кетер', meaning:'замысел, высшая воля, чистое намерение', practice:'сформулируй одно намерение без лишних условий' },
  { name:'Хокма', meaning:'озарение, импульс, первое видение пути', practice:'поймай первую ясную мысль и не перегружай её сомнениями' },
  { name:'Бина', meaning:'форма, граница, зрелое понимание', practice:'дай мысли структуру: срок, правило и предел' },
  { name:'Хесед', meaning:'милость, расширение, доверие жизни', practice:'сделай шаг щедрости без потери собственных границ' },
  { name:'Гвура', meaning:'сила, отсечение, дисциплина', practice:'убери одно лишнее действие, обещание или привязку' },
  { name:'Тиферет', meaning:'сердце, красота, равновесие', practice:'выбери поступок, где сила не спорит с мягкостью' },
  { name:'Нецах', meaning:'желание, победа, живая энергия', practice:'направь страсть в одно видимое действие' },
  { name:'Ход', meaning:'слово, мысль, точная речь', practice:'назови ситуацию честной короткой фразой' },
  { name:'Йесод', meaning:'подсознание, связь, сон и знаки', practice:'запиши сон, знак или предчувствие и проверь его позже' },
  { name:'Малкут', meaning:'земля, тело, результат, воплощение', practice:'сделай маленький материальный шаг: звонок, запись, уборку или оплату' }
];

function getKabbalahPractice(dateStr, bDay, bMonth) {
  var n = reduceToRange(lifePathNumber(dateStr) + personalDay(bDay, bMonth), 10);
  return sephirot[n - 1];
}

const runes = [
  { symbol:'ᚠ', name:'Феху', meaning:'ресурс, деньги, обладание', advice:'береги ресурс и направь его туда, где есть рост' },
  { symbol:'ᚢ', name:'Уруз', meaning:'сила тела, выносливость, первичная мощь', advice:'сначала укрепи тело, потом принимай решение' },
  { symbol:'ᚦ', name:'Турисаз', meaning:'защита, порог, грубая сила', advice:'не ломись вперёд; обозначь границу' },
  { symbol:'ᚨ', name:'Ансуз', meaning:'слово, знак, послание', advice:'слушай сказанное между строк и говори точно' },
  { symbol:'ᚱ', name:'Райдо', meaning:'путь, движение, правильный ритм', advice:'выбери маршрут и не сбивайся на чужой темп' },
  { symbol:'ᚲ', name:'Кеназ', meaning:'огонь знания, ясность, ремесло', advice:'подсвети скрытую деталь и действуй мастерски' },
  { symbol:'ᚷ', name:'Гебо', meaning:'обмен, союз, дар', advice:'ищи равновесие между давать и брать' },
  { symbol:'ᚹ', name:'Вуньо', meaning:'радость, согласие, светлая связь', advice:'замечай, где энергия становится легче' },
  { symbol:'ᚺ', name:'Хагалаз', meaning:'слом старого, очищение, буря', advice:'не удерживай то, что уже трещит' },
  { symbol:'ᚾ', name:'Наутиз', meaning:'нужда, ограничение, внутренняя печь', advice:'сократи лишнее и выбери необходимое' },
  { symbol:'ᛁ', name:'Иса', meaning:'пауза, лёд, остановка', advice:'замри, пока вода не станет прозрачной' },
  { symbol:'ᛃ', name:'Йера', meaning:'цикл, урожай, время созревания', advice:'не торопи плод; проверь, что ты уже посеял' },
  { symbol:'ᛇ', name:'Эйваз', meaning:'стойкость, переход, ось между мирами', advice:'держи центр в момент перемены' },
  { symbol:'ᛈ', name:'Перт', meaning:'тайна, жребий, скрытое знание', advice:'оставь место неизвестному и наблюдай знаки' },
  { symbol:'ᛉ', name:'Альгиз', meaning:'защита, инстинкт, высшая опора', advice:'слушай первый сигнал тела и усиливай защиту' },
  { symbol:'ᛋ', name:'Соулу', meaning:'солнце, победа, цельность', advice:'выбирай ясность и действуй открыто' },
  { symbol:'ᛏ', name:'Тейваз', meaning:'честь, воля, справедливый бой', advice:'поступи прямо, даже если это требует мужества' },
  { symbol:'ᛒ', name:'Беркана', meaning:'рост, забота, новое начало', advice:'дай слабому ростку режим и защиту' },
  { symbol:'ᛖ', name:'Эваз', meaning:'движение вдвоём, доверие, партнёрство', advice:'согласуй темп с тем, кто идёт рядом' },
  { symbol:'ᛗ', name:'Манназ', meaning:'человек, отражение, сообщество', advice:'посмотри на себя глазами другого без самообмана' },
  { symbol:'ᛚ', name:'Лагуз', meaning:'вода, интуиция, поток', advice:'доверься течению, но не теряй берег' },
  { symbol:'ᛜ', name:'Ингуз', meaning:'семя, завершение, внутренняя зрелость', advice:'собери силы внутрь перед новым шагом' },
  { symbol:'ᛞ', name:'Дагаз', meaning:'прорыв, рассвет, смена состояния', advice:'ищи точку, где ночь уже стала утром' },
  { symbol:'ᛟ', name:'Отал', meaning:'род, наследие, дом', advice:'отдели своё от родового и сохрани ценное' }
];

function runeFromSeed(seed) {
  return runes[Math.abs(seed) % runes.length];
}

function birthRune(dateStr) {
  var seed = String(dateStr).replace(/-/g,'').split('').reduce(function(a,b) { return a + parseInt(b); }, 0);
  return runeFromSeed(seed);
}

function dailyRune(date) {
  var seed = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
  return runeFromSeed(seed);
}

function nameRune(name) {
  var seed = String(name || '').split('').reduce(function(sum, ch) {
    return sum + ch.charCodeAt(0);
  }, 0);
  return runeFromSeed(seed);
}

function resultRune(dateStr, name) {
  var dateSeed = String(dateStr || '').replace(/-/g,'').split('').reduce(function(sum, ch) {
    return sum + (parseInt(ch, 10) || 0);
  }, 0);
  var nameSeed = String(name || '').split('').reduce(function(sum, ch) {
    return sum + ch.charCodeAt(0);
  }, 0);
  return runeFromSeed(dateSeed + nameSeed + lifePathNumber(dateStr) + destinyNumber(name || ''));
}

function buildRuneCode() {
  var bv = userBirthValue || document.getElementById('birthInput')?.value || '';
  var br = birthRune(bv);
  var nr = nameRune(userName);
  var rr = resultRune(bv, userName);
  var dr = dailyRune(new Date());

  return {
    destiny: br.symbol + ' ' + br.name + ' — ' + br.meaning + '. Совет: ' + br.advice,
    personality: nr.symbol + ' ' + nr.name + ' — ' + nr.meaning + '. Совет: ' + nr.advice,
    result: rr.symbol + ' ' + rr.name + ' — ' + rr.meaning + '. Совет: ' + rr.advice,
    today: dr.symbol + ' ' + dr.name + ' — ' + dr.meaning + '. Совет: ' + dr.advice
  };
}

function isRuneCodeRequest(text) {
  return /руническ(ий|ого|ому|им|ом)?\s+код|рунн(ый|ого|ому|ым|ом)?\s+код|р?унокод/i.test(text || '');
}

function isMoonRequest(text) {
  return /лун[а-яё]*|новолун|полнолун|лунн(ый|ого|ому|ым|ом)?\s+(день|цикл|календар|ритм|фаз)/i.test(text || '');
}

const chakras = [
  {
    name:'Муладхара',
    area:'корень, тело, безопасность',
    shadow:'страх, нехватка опоры, тревога за деньги или выживание',
    practice:'заземлись через тело: прогулка, еда, уборка, простое физическое действие'
  },
  {
    name:'Свадхистана',
    area:'желание, близость, удовольствие, поток чувств',
    shadow:'зажатость, зависимость от удовольствия, вина за желания',
    practice:'верни мягкость: вода, движение таза, честное признание желания без немедленного действия'
  },
  {
    name:'Манипура',
    area:'воля, границы, действие, личная сила',
    shadow:'контроль, злость, бессилие, страх проявиться',
    practice:'выбери одно действие и один ясный отказ; не распыляй огонь'
  },
  {
    name:'Анахата',
    area:'сердце, доверие, любовь, принятие',
    shadow:'обида, закрытость, спасательство, страх быть отвергнутым',
    practice:'сделай жест тепла без самопредательства и назови свою потребность'
  },
  {
    name:'Вишудха',
    area:'голос, правда, выражение, договор',
    shadow:'молчание, лишние слова, страх сказать прямо',
    practice:'произнеси одну честную фразу коротко и без обвинений'
  },
  {
    name:'Аджна',
    area:'видение, интуиция, символы, смысл',
    shadow:'иллюзии, подозрения, жизнь в догадках',
    practice:'отдели знак от фантазии: запиши факт, чувство и проверяемое действие'
  },
  {
    name:'Сахасрара',
    area:'вера, предназначение, связь с высшим',
    shadow:'оторванность от земли, ожидание чуда вместо шага',
    practice:'сведи большой смысл к одному земному поступку сегодня'
  }
];

function chakraFromNumber(n) {
  return chakras[Math.abs(n - 1) % chakras.length];
}

function birthChakra(dateStr) {
  return chakraFromNumber(lifePathNumber(dateStr));
}

function activeChakra(dateStr, bDay, bMonth) {
  return chakraFromNumber(lifePathNumber(dateStr) + personalDay(bDay, bMonth));
}

const totemAnimals = [
  {
    name:'Волк',
    element:'Земля и ночь',
    archetype:'проводник стаи и хранитель границы',
    gift:'верность себе, чутьё на своих людей, умение идти долго',
    shadow:'одиночество из гордости, недоверие, резкая защита территории',
    instinct:'сначала слушает тишину, потом выбирает направление',
    protection:'держит круг близких и не пускает случайное в личное пространство',
    relations:'нужна честность, преданность и ясные правила близости',
    work:'силён там, где нужен маршрут, стратегия и ответственность за своих',
    practice:'на этой неделе убери один чужой голос из решения и выбери свой след',
    phrase:'Я знаю свою стаю и свой путь'
  },
  {
    name:'Медведь',
    element:'Земля',
    archetype:'хранитель силы, тела и внутренней берлоги',
    gift:'выносливость, глубокая опора, способность защищать без суеты',
    shadow:'инертность, накопленная злость, уход в тяжёлое молчание',
    instinct:'сначала набирает силу, потом делает один мощный шаг',
    protection:'через тело, сон, еду, дом и восстановление границ',
    relations:'любит тепло и надёжность, но не терпит давления',
    work:'силён в долгих задачах, где важны терпение и устойчивый результат',
    practice:'верни телу режим: сон, плотная еда, порядок в одном углу дома',
    phrase:'Моя сила спокойна и весома'
  },
  {
    name:'Лиса',
    element:'Огонь и сумерки',
    archetype:'хитрый разведчик, мастер обходного пути',
    gift:'гибкость, наблюдательность, умение находить дверь там, где видят стену',
    shadow:'избегание прямого разговора, игра вместо честного выбора',
    instinct:'считывает настроение пространства раньше слов',
    protection:'через лёгкость, манёвр и отказ спорить там, где можно выйти иначе',
    relations:'нужна свобода, интерес и партнёр, который не ставит клетку',
    work:'силён в переговорах, идеях, рекламе, поиске нестандартного решения',
    practice:'найди третий вариант между атакой и отступлением',
    phrase:'Я вижу ход, который скрыт от шума'
  },
  {
    name:'Ворон',
    element:'Воздух и тень',
    archetype:'вестник знаков, памяти и переходов',
    gift:'умение видеть смысл в совпадениях, читать скрытый слой событий',
    shadow:'застревание в мрачных знаках, подозрительность, тяга к драме',
    instinct:'замечает слово, взгляд или паузу, где меняется ход судьбы',
    protection:'через наблюдение, молчание и точную речь в нужный момент',
    relations:'нужна глубина, интеллектуальная связь и уважение к тайне',
    work:'силён в анализе, письме, исследовании, кризисных переходах',
    practice:'запиши три знака дня и отдели факт от толкования',
    phrase:'Я вижу знак, но не становлюсь его пленником'
  },
  {
    name:'Олень',
    element:'Воздух и лес',
    archetype:'тонкий проводник красоты, достоинства и мягкой силы',
    gift:'чуткость, благородство, способность проходить через грубость не грубея',
    shadow:'пугливость, уход от конфликта, зависимость от чужой оценки',
    instinct:'чувствует опасность раньше, чем ум успевает объяснить',
    protection:'через дистанцию, изящество и право не входить в грубую энергию',
    relations:'нужны бережность, уважение и пространство для доверия',
    work:'силён там, где важны вкус, дипломатия, эстетика и тонкое влияние',
    practice:'не доказывай силу громкостью; сделай один красивый точный шаг',
    phrase:'Моя мягкость не делает меня слабым'
  },
  {
    name:'Змея',
    element:'Земля и вода',
    archetype:'хранительница обновления, кожи и скрытой силы',
    gift:'трансформация, глубинное чутьё, умение сбрасывать старое',
    shadow:'скрытая обида, соблазн манипулировать, холодная закрытость',
    instinct:'чувствует, где энергия уже мертва и требует смены формы',
    protection:'через тишину, границу и отказ отдавать силу лишним людям',
    relations:'нужна честность без вторжения и уважение к личной глубине',
    work:'силён в кризисах, терапии смыслов, деньгах, тайных процессах',
    practice:'назови одну старую кожу, которую пора снять без сожаления',
    phrase:'Я обновляюсь и не тащу мёртвое дальше'
  },
  {
    name:'Сова',
    element:'Воздух и ночь',
    archetype:'ночной наблюдатель, мудрость тишины и точного зрения',
    gift:'видеть в темноте, понимать мотивы, сохранять ясность в неопределённости',
    shadow:'отстранённость, холод, жизнь в наблюдении вместо участия',
    instinct:'молчит, пока картина не сложится целиком',
    protection:'через паузу, сон, уединение и отказ от поспешных ответов',
    relations:'нужен человек, который уважает тишину и не требует мгновенной реакции',
    work:'силён в диагностике, обучении, стратегии, разборе сложных систем',
    practice:'дай вопросу ночь; утром запиши первое спокойное понимание',
    phrase:'Я вижу ясно, когда не тороплюсь'
  },
  {
    name:'Рысь',
    element:'Земля и снег',
    archetype:'скрытый следопыт, независимость и точный прыжок',
    gift:'самостоятельность, зоркость, умение ждать правильный момент',
    shadow:'закрытость, недоверие к помощи, резкий уход без объяснений',
    instinct:'идёт тихо и не показывает намерение раньше времени',
    protection:'через приватность, наблюдение и точное дозирование близости',
    relations:'нужна свобода и уважение к личным границам',
    work:'силён в самостоятельных проектах, расследовании, точечной экспертизе',
    practice:'не рассказывай план всем; сделай один тихий шаг до объявления',
    phrase:'Я выбираю момент и действую точно'
  },
  {
    name:'Конь',
    element:'Огонь и ветер',
    archetype:'движение, верность пути и сила живого ритма',
    gift:'энергия, скорость, тяга к простору, способность нести дело вперёд',
    shadow:'нетерпение, бегство от тяжёлого чувства, страх узды',
    instinct:'чувствует, где путь открыт, а где дорога давит грудь',
    protection:'через движение, честный темп и отказ от чужой упряжи',
    relations:'нужна свобода вместе, а не контроль под видом заботы',
    work:'силён в запусках, поездках, продажах, развитии новых направлений',
    practice:'сделай путь телом: прогулка, дорога, звонок, первый запуск',
    phrase:'Я бегу своим ходом и несу свою силу'
  },
  {
    name:'Ястреб',
    element:'Воздух и солнце',
    archetype:'высокий обзор, фокус и точный удар',
    gift:'видение цели, быстрая оценка ситуации, умение отсечь лишнее',
    shadow:'жёсткость, нетерпимость к слабости, одиночный контроль сверху',
    instinct:'поднимается выше эмоций, чтобы увидеть направление',
    protection:'через дистанцию, ясный фокус и один выбранный приоритет',
    relations:'нужна честность и уважение к личной миссии',
    work:'силён в управлении, стратегии, запуске, выборе главного',
    practice:'сократи список до одной цели и одного действия на сегодня',
    phrase:'Я вижу главное и выбираю точный удар'
  },
  {
    name:'Бык',
    element:'Земля',
    archetype:'земная мощь, ресурс и терпеливое воплощение',
    gift:'надёжность, способность строить, держать обещание и копить силу',
    shadow:'упрямство, страх перемен, тяжесть накопленных обязательств',
    instinct:'проверяет почву и не двигается, пока не почувствует опору',
    protection:'через режим, деньги, тело, договор и понятные границы',
    relations:'нужна стабильность, уважение к труду и отсутствие игр',
    work:'силён в материальных проектах, финансах, строительстве, ремесле',
    practice:'закрепи намерение материально: оплата, запись, договор, порядок',
    phrase:'Я строю медленно, но надолго'
  },
  {
    name:'Лебедь',
    element:'Вода и воздух',
    archetype:'чистота чувства, красота перехода и верность сердцу',
    gift:'гармония, эстетика, способность смягчать пространство',
    shadow:'идеализация, обида из-за несовершенства, уход в красивую мечту',
    instinct:'ищет лад и чувствует фальшь в отношениях',
    protection:'через достоинство, красоту быта и честность сердечного выбора',
    relations:'нужны взаимность, нежность и ясность намерений',
    work:'силён в творчестве, красоте, медиации, создании атмосферы',
    practice:'убери одну фальшивую ноту: в слове, обещании или ожидании',
    phrase:'Я выбираю красоту без самообмана'
  }
];

function getTotemAnimal(dateStr, signIdx, name) {
  var digits = String(dateStr || '').replace(/-/g,'').split('').reduce(function(sum, part) {
    return sum + (parseInt(part, 10) || 0);
  }, 0);
  var nameSeed = normalizeCreatorText(name || userName || '').split('').reduce(function(sum, ch) {
    return sum + ch.charCodeAt(0);
  }, 0);
  var seed = digits + lifePathNumber(dateStr) * 3 + (signIdx + 1) * 5 + nameSeed;
  return totemAnimals[Math.abs(seed) % totemAnimals.length];
}

function formatTotem(totem) {
  return [
    totem.name + ' — ' + totem.archetype,
    'Стихия: ' + totem.element,
    'Дар: ' + totem.gift,
    'Тень: ' + totem.shadow,
    'Инстинкт: ' + totem.instinct,
    'Защита: ' + totem.protection,
    'Отношения: ' + totem.relations,
    'Дело: ' + totem.work,
    'Практика: ' + totem.practice,
    'Фраза силы: ' + totem.phrase
  ].join('\n');
}

const alchemyStages = [
  { name:'Нигредо', sphere:'кризис, тень, распад старого', light:'честное очищение', shadow:'застревание в мраке и самокопании', practice:'назови, что должно уйти, и не тащи это в следующий шаг' },
  { name:'Альбедо', sphere:'очищение, тишина, восстановление', light:'ясность после смуты', shadow:'холодная отстранённость и бегство от чувства', practice:'сделай паузу, очисти пространство и отдели факт от страха' },
  { name:'Цитринитас', sphere:'смысл, видение, зрелое решение', light:'внутреннее золото и понимание пути', shadow:'слишком много размышлений без воплощения', practice:'сформулируй намерение и выбери один проверяемый шаг' },
  { name:'Рубедо', sphere:'воплощение, союз, действие', light:'живое соединение смысла и поступка', shadow:'спешка, давление и желание доказать силу', practice:'воплоти решение в материи: письмо, разговор, запуск или завершение' }
];

const slavicArchetypes = [
  { name:'Велес', sphere:'мудрость, переходы, тайное знание, договор', light:'видеть скрытый узор и вести через порог', shadow:'застревать в тумане знаков', practice:'запиши знак и преврати его в одно земное действие' },
  { name:'Макошь', sphere:'нить судьбы, род, забота, женская линия', light:'плести события в цельную ткань', shadow:'тащить чужую долю как свою', practice:'отдели свою нить от чужих ожиданий' },
  { name:'Перун', sphere:'воля, граница, защита, прямое слово', light:'сказать прямо и встать на свою сторону', shadow:'давить силой там, где нужна ясность', practice:'поставь одну границу без угроз и лишних объяснений' },
  { name:'Лада', sphere:'любовь, согласие, красота, мягкость', light:'создавать лад без самопредательства', shadow:'мириться ценой правды', practice:'выбери жест тепла и одну честную просьбу' },
  { name:'Мара', sphere:'завершение, сон, отпускание, зимняя тишина', light:'дать умереть тому, что исчерпало срок', shadow:'путать паузу с приговором', practice:'закрой один незавершённый круг' },
  { name:'Даждьбог', sphere:'солнце, дар, проявление, щедрость', light:'вынести силу в мир', shadow:'доказывать ценность через блеск', practice:'покажи один результат без оправданий' }
];

function getAlchemyStage(message) {
  var text = oracleText(message);
  var pd = userBirth ? personalDay(userBirth.getDate(), userBirth.getMonth() + 1) : 1;
  if (hasAny(text, ['кризис','больно','разруш','конец','страх','тревог','потер','плохо'])) return alchemyStages[0];
  if (hasAny(text, ['отпустить','очист','устал','пауза','восстанов','простить'])) return alchemyStages[1];
  if (hasAny(text, ['понять','смысл','выбор','решить','зачем','куда','путь'])) return alchemyStages[2];
  if (hasAny(text, ['запуск','начать','сделать','действ','прояв','договор','письмо'])) return alchemyStages[3];
  return alchemyStages[(pd - 1) % alchemyStages.length];
}

function getElementBalance(message) {
  var text = oracleText(message);
  var scores = {
    Огонь: elements[userSignIdx] === 'Огонь' ? 2 : 0,
    Земля: elements[userSignIdx] === 'Земля' ? 2 : 0,
    Воздух: elements[userSignIdx] === 'Воздух' ? 2 : 0,
    Вода: elements[userSignIdx] === 'Вода' ? 2 : 0
  };
  scores.Огонь += countAny(text, ['зл','смел','начать','действ','страст','прояв','побед']);
  scores.Земля += countAny(text, ['деньг','тело','дом','работ','стабил','безопас','практи']);
  scores.Воздух += countAny(text, ['дум','слово','письм','разговор','иде','сомнев','объясн']);
  scores.Вода += countAny(text, ['чувств','любов','страх','тревог','сон','интуиц','слез']);
  var entries = Object.keys(scores).map(function(k) { return { name:k, score:scores[k] }; }).sort(function(a,b) { return b.score - a.score; });
  var need = entries[entries.length - 1].name;
  return {
    dominant: entries[0].name,
    missing: need,
    meaning: 'ведущая стихия сейчас — ' + entries[0].name + ', а для равновесия нужна ' + need,
    practice: elementPractice(need)
  };
}

function elementPractice(element) {
  if (element === 'Огонь') return 'добавь решимости: одно смелое действие без долгого разогрева';
  if (element === 'Земля') return 'заземли смысл: сделай запись, оплату, уборку или конкретный план';
  if (element === 'Воздух') return 'проясни словами: сформулируй мысль в одной честной фразе';
  return 'верни чувство: дай себе тишину, воду и признание того, что ты переживаешь';
}

function getSlavicArchetype(message) {
  var text = oracleText(message);
  if (hasAny(text, ['род','семь','мама','отец','судьб','нить'])) return slavicArchetypes[1];
  if (hasAny(text, ['границ','защит','конфликт','зл','сказать','отказать'])) return slavicArchetypes[2];
  if (hasAny(text, ['любов','отнош','партн','серд','близк'])) return slavicArchetypes[3];
  if (hasAny(text, ['конец','отпустить','сон','пауза','расстал','устал'])) return slavicArchetypes[4];
  if (hasAny(text, ['прояв','запуск','успех','дар','деньг','работ'])) return slavicArchetypes[5];
  return slavicArchetypes[0];
}

function buildOracleEngine(message, dateStr, bDay, bMonth) {
  var stage = getAlchemyStage(message);
  var balance = getElementBalance(message);
  var archetype = getSlavicArchetype(message);
  var kb = getKabbalahPractice(dateStr, bDay, bMonth);
  var dr = dailyRune(new Date());
  var ac = activeChakra(dateStr, bDay, bMonth);
  return {
    alchemy: insight('Алхимия', stage.name, stage.sphere, stage.light, stage.shadow, stage.practice),
    elements: insight('Баланс стихий', balance.dominant + ' / нужна ' + balance.missing, 'энергетический перекос ситуации', balance.meaning, 'перекос без недостающей стихии', balance.practice),
    slavic: insight('Славянский архетип', archetype.name, archetype.sphere, archetype.light, archetype.shadow, archetype.practice),
    practice: insight('Практический ключ', kb.name + ' + ' + dr.name + ' + ' + ac.name, 'воплощение ответа', kb.practice + '; ' + dr.advice, ac.shadow, ac.practice)
  };
}

function insight(system, symbol, sphere, light, shadow, practice) {
  return { system:system, symbol:symbol, sphere:sphere, light:light, shadow:shadow, practice:practice };
}

function formatOracleInsights(engine) {
  return Object.keys(engine).map(function(key) {
    var i = engine[key];
    return i.system + ': ' + i.symbol + '. Сфера: ' + i.sphere + '. Свет: ' + i.light + '. Тень: ' + i.shadow + '. Практика: ' + i.practice + '.';
  }).join('\n');
}
