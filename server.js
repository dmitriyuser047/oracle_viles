const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
    var match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');

function loadKnowledgeFile(fileName) {
  try {
    return JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, fileName), 'utf8'));
  } catch (err) {
    console.warn('Knowledge file skipped:', fileName, err.message);
    return null;
  }
}

const MONOSOV_KNOWLEDGE = loadKnowledgeFile('monosov_esoteric.json');
const MENSHIKOVA_RUNES_KNOWLEDGE = loadKnowledgeFile('menshikova_runes.json');
const ASTRO_NUMEROLOGY_KNOWLEDGE = loadKnowledgeFile('astro_numerology.json');

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'oracle-viles' });
});

const SYSTEM_PROMPT = `Ты — Велес, мудрый славянский оракул. Говоришь образно, мистично и по делу. Психологию используешь скрыто — не называй модели и термины.

ВАЖНО: Всегда используй ТОЛЬКО данные из блока "КАРТА". Имя человека, знак зодиака, числа, карты таро, руны, тотем — бери строго оттуда. Не выдумывай и не подменяй.

Правила:
- Выбери 1 главный символ и максимум 1 поддерживающий. Не перечисляй больше 2 эзотерических названий.
- Не смешивай каббалистику и руны. Луну не называй вслух.
- Не ставь диагнозы. При риске вреда — мягко верни к безопасности.
- Не спорь с верой человека в магию. Отвечай в сакральной рамке.
- Замечай повторы в хронике: "узор повторяется", "нить уже появлялась".
- Только русский, кириллица, без эмодзи. Обращайся по имени на "ты".

Формат ответа: 8-12 предложений. Развёрнуто, тепло и по делу.
1. Обратись по имени + назови один главный символ из карты.
2. Раскрой смысл ситуации через этот символ (2-3 предложения).
3. Покажи силу человека (1-2 предложения).
4. Предупреди о ловушке или риске (1-2 предложения).
5. Дай конкретный практический совет с действием и сроком.
6. Заверши фразой силы или микро-обрядом.`;

function polishReply(text) {
  return String(text || '')
    .replace(/([.!?])(?=[А-ЯЁ])/g, '$1 ')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\n{2,}/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map(function(part) { return part.trim(); })
    .filter(Boolean);
}

function cleanRuneReply(text, b) {
  var reply = String(text || '');
  var isRuneMode = b.requestMode === 'rune_code'
    || (b.requestMode === 'profile_item' && /рун/i.test(String(b.profileFocus?.section || '')))
    || (b.requestMode === 'oracle' && /рун/i.test(String(b.message || '')));
  if (!isRuneMode) return reply;

  var runeNames = [b.birthRune, b.dailyRune]
    .filter(Boolean)
    .map(function(value) { return String(value).split(/[—-]/)[0].trim(); })
    .filter(Boolean);

  var hasRune = /рун|Иггдрасил|Райдо|Феху|Уруз|Турисаз|Ансуз|Кеназ|Гебо|Вуньо|Хагалаз|Наутиз|Иса|Йера|Эйваз|Перт|Альгиз|Соулу|Тейваз|Беркана|Эваз|Манназ|Лагуз|Ингуз|Дагаз|Отал/i.test(reply)
    || runeNames.some(function(name) { return name && reply.toLowerCase().includes(name.toLowerCase()); });

  if (!hasRune) return reply;

  var forbidden = [
    /сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i,
    /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i,
    /чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i,
    /Лун/i, /лун/i, /карта дня/i, /Колесниц/i, /Маг/i, /Император/i,
    /Овн[а-яё]*/i, /Тельц[а-яё]*/i, /Близнец[а-яё]*/i, /Рак[а-яё]*/i, /Льв[а-яё]*/i, /Дев[а-яё]*/i, /Вес[а-яё]*/i, /Скорпион[а-яё]*/i, /Стрельц[а-яё]*/i, /Козерог[а-яё]*/i, /Водол[а-яё]*/i, /Рыб[а-яё]*/i,
    /Марс/i, /Венер/i, /Меркур/i, /Юпитер/i, /Сатурн/i, /Солнц/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  if (cleaned && !/Иггдрасил/i.test(cleaned)) {
    cleaned += ' В образе Иггдрасиля это путь по стволу: корни держат память, а ветви показывают возможные исходы.';
  }

  return cleaned || reply;
}

function cleanTotemReply(text, b) {
  var reply = String(text || '');
  var totemName = String(b.totem || '').split(/[—-]/)[0].trim();
  var hasTotem = /тотем|животн/i.test(reply)
    || (totemName && reply.toLowerCase().includes(totemName.toLowerCase()));

  if (!hasTotem) return reply;

  var forbidden = [
    /рун/i, /Иггдрасил/i, /Райдо/i, /Феху/i, /Уруз/i, /Турисаз/i, /Ансуз/i, /Кеназ/i, /Гебо/i, /Вуньо/i,
    /сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i, /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i,
    /чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i,
    /Лун/i, /лун/i, /карта дня/i, /Колесниц/i, /Маг/i, /Император/i,
    /Овн[а-яё]*/i, /Тельц[а-яё]*/i, /Близнец[а-яё]*/i, /Рак[а-яё]*/i, /Льв[а-яё]*/i, /Дев[а-яё]*/i, /Вес[а-яё]*/i, /Скорпион[а-яё]*/i, /Стрельц[а-яё]*/i, /Козерог[а-яё]*/i, /Водол[а-яё]*/i, /Рыб[а-яё]*/i,
    /Марс/i, /Венер/i, /Меркур/i, /Юпитер/i, /Сатурн/i, /Солнц/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  if (cleaned && totemName && (!cleaned.toLowerCase().includes(totemName.toLowerCase()) || /^(он|она|его|её)\b/i.test(cleaned))) {
    cleaned = `${b.userName || 'Твой'} тотем — ${totemName}. ` + cleaned;
  }

  return cleaned || reply;
}

function cleanMoonPositionReply(text) {
  var moonPositionPatterns = [
    /растущ[а-яё\s]+лун/i,
    /убывающ[а-яё\s]+лун/i,
    /новолун/i,
    /полнолун/i,
    /лунн[а-яё\s-]*(день|ритм|фаз|цикл|календар)/i,
    /положени[а-яё\s]+лун/i,
    /лун[а-яё\s]+сегодня/i,
    /фаз[а-яё\s]+лун/i
  ];

  return splitSentences(text)
    .filter(function(sentence) {
      return !moonPositionPatterns.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ') || text;
}

function hasImmediateDanger(message, events) {
  var text = ([message || ''].concat((events || []).map(function(e) {
    return e && e.text ? e.text : '';
  }))).join(' ').toLowerCase();

  return [
    /суицид|самоубий|покончить с собой|убить себя|не хочу жить|уйти из жизни|сделать с собой/,
    /навредить себе|порезать себя|повеситься|спрыгнуть|утопиться|передоз/,
    /убить (его|её|ее|их|человека)|навредить (ему|ей|людям)|хочу причинить вред|резать людей/,
    /голос[а-яё\s]+приказыва[а-яё\s]+(убить|навредить|порезать|спрыгнуть|сделать с собой)/
  ].some(function(pattern) { return pattern.test(text); });
}

function cleanNonCrisisClinicalReply(text, b) {
  if (hasImmediateDanger(b.message, b.events)) return text;

  var clinicalPatterns = [
    /психиат/i,
    /психотерап/i,
    /психолог/i,
    /врач/i,
    /специалист/i,
    /кризис/i,
    /экстр/i,
    /сроч/i,
    /больниц/i,
    /профессиональн[а-яё\s]+помощ/i
  ];

  return splitSentences(text)
    .filter(function(sentence) {
      return !clinicalPatterns.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ') || text;
}

function countMatches(text, patterns) {
  return patterns.reduce(function(total, pattern) {
    return total + (pattern.test(text) ? 1 : 0);
  }, 0);
}

function detectMentalHealthSignals(message, events) {
  var text = ([message || ''].concat((events || []).map(function(e) {
    return e && e.text ? e.text : '';
  }))).join(' ').toLowerCase();

  var groups = [
    {
      title: 'немедленная безопасность',
      level: 'crisis',
      patterns: [
        /суицид|самоубий|покончить с собой|убить себя|не хочу жить|не могу жить|уйти из жизни|сделать с собой/,
        /навредить себе|порезать себя|таблетк[аи]|повеситься|спрыгнуть|утопиться/,
        /убить (его|её|ее|их|человека)|навредить (ему|ей|людям)|хочу причинить вред|резать людей/
      ],
      guidance: 'Нужен режим немедленной безопасности: не оставаться одному, связаться с доверенным человеком, убрать опасные предметы или вещества, при прямой угрозе обратиться в экстренные службы.'
    },
    {
      title: 'неподтверждённые тревожные переживания',
      level: 'grounding',
      patterns: [
        /слышу голос|голоса в голове|голоса говорят|голос приказывает|мне приказали/,
        /за мной следят|меня преследуют|читают мои мысли|управляют мной|внедряют мысли|заговор против меня/,
        /не понимаю где реальность|реальность ломается|мир ненастоящий|я избран и все знаки только мне/
      ],
      guidance: 'Не подтверждай переживание как магический факт. Скажи мягко, что Велес не видит подтверждения этому в карте, знаках и хронике. Верни человека к проверяемым фактам, спокойному наблюдению и решению не действовать из страха.'
    },
    {
      title: 'перегрев и потеря опоры',
      level: 'grounding',
      patterns: [
        /не сплю (двое|трое|несколько|[2-9])|не спал (двое|трое|несколько|[2-9])|без сна/,
        /слишком много энергии|не могу остановиться|всё могу|я всемогущ|резко трачу деньги|беру кредиты/,
        /гонка мыслей|мысли несутся|говорю без остановки/
      ],
      guidance: 'Не называй диагноз. Скажи, что Велес не видит в этом подтверждения великого знака; похоже, человеку нужна пауза, сон, снижение стимулов и отказ от крупных решений до восстановления опоры.'
    },
    {
      title: 'тяжёлая депрессия или истощение',
      level: 'care',
      patterns: [
        /безнад[её]жн|ничего не чувствую|ничего не радует|нет сил жить|не встаю с кровати/,
        /не моюсь|не ем|не могу работать|не могу учиться|всё бессмысленно|я никому не нужен/
      ],
      guidance: 'Не мистифицируй тяжесть и не дави специалистами без прямой опасности. Дай маленький телесный шаг: вода, еда, сон, душ, сообщение близкому человеку, одно простое дело.'
    },
    {
      title: 'алкоголь или вещества как фактор риска',
      level: 'care',
      patterns: [
        /запой|напиваюсь|алкоголь каждый день|не могу бросить пить|наркотик|соль|меф|амфетамин|кокаин|трав[ак] каждый день/,
        /ломка|передоз|срываюсь на вещества/
      ],
      guidance: 'Не стыди. Скажи, что Велес не видит здесь силы обряда, пока тело захвачено веществом; предложи снизить риск, не оставаться одному в опасном состоянии и убрать вещества подальше.'
    }
  ];

  var found = groups.filter(function(group) {
    return countMatches(text, group.patterns) > 0;
  });

  if (found.length === 0) {
    return 'Красные флаги не обнаружены. Не ставь диагнозы и не называй человека психически нездоровым.';
  }

  var priority = found.some(function(group) { return group.level === 'crisis'; })
    ? 'кризис'
    : 'заземление без диагноза';

  return [
    `Уровень внимания: ${priority}`,
    `Сигналы: ${found.map(function(group) { return group.title; }).join('; ')}`,
    `Как отвечать: ${found.map(function(group) { return group.guidance; }).join(' ')}`
  ].join('\n');
}

function formatTarotSpread(spread) {
  if (!Array.isArray(spread) || spread.length === 0) {
    return 'Расклад не задан';
  }

  return spread.slice(0, 3).map(function(card, index) {
    return [
      `${index + 1}. ${card.position || 'Позиция'}: ${card.card || 'Карта не указана'} (${card.orientation || 'прямая'})`,
      `   Колода: ${card.deck || 'Райдер–Уэйт'}, масть: ${card.suit || 'не указана'}`,
      `   Значение: ${card.meaning || 'не указано'}`,
      `   Задача позиции: ${card.prompt || 'раскрыть вопрос'}`,
      `   Нюанс: ${card.nuance || 'открытая сила карты'}`
    ].join('\n');
  }).join('\n');
}

function formatMatrixFocus(focus) {
  if (!focus || typeof focus !== 'object') {
    return 'Фокус матрицы не выбран';
  }

  return [
    `Зона: ${focus.label || 'не указана'}`,
    `Аркан: ${focus.num || 'не указан'}`,
    `Смысл: ${focus.desc || 'не указан'}`
  ].join('\n');
}

function formatProfileFocus(focus) {
  if (!focus || typeof focus !== 'object') {
    return 'Фокус профиля не выбран';
  }

  return [
    `Раздел: ${focus.section || 'не указан'}`,
    `Позиция: ${focus.label || 'не указана'}`,
    `Значение: ${focus.value || 'не указано'}`
  ].join('\n');
}

function formatRuneCode(code) {
  if (!code || typeof code !== 'object') {
    return 'Рунический код не рассчитан';
  }

  return [
    `Руна судьбы: ${code.destiny || 'не указана'}`,
    `Руна личности: ${code.personality || 'не указана'}`,
    `Руна результата: ${code.result || 'не указана'}`,
    `Руна дня: ${code.today || 'не указана'}`
  ].join('\n');
}

function getPromptForMode(mode) {
  if (mode === 'rune_code') {
    return `Ты — Велес, оракул рун и Иггдрасиля. Режим: рунический код. Используй только руны. Не добавляй каббалистику, чакры, Луну, таро. Структура: "Руна судьбы", "Руна личности", "Руна результата", "Руна дня", "Действие". По 2-3 предложения. Русский, кириллица, без эмодзи.`;
  }
  if (mode === 'profile_item') {
    return `Ты — Велес, оракул. Разбери только выбранную позицию из "Фокус профиля". Не пересказывай весь профиль. Говори языком той системы, к которой относится позиция. Формат: "Смысл", "Сила", "Тень", "В жизни", "Практика". По 2-3 предложения. Русский, кириллица, без эмодзи.`;
  }
  if (mode === 'matrix_arcana') {
    return `Ты — Велес, оракул. Разбери только выбранный аркан из "Фокус матрицы". Не фатально — это задача, не приговор. Формат: "Аркан", "Свет", "Тень", "Как проявляется", "Практика на 3 дня". Русский, кириллица, без эмодзи.`;
  }
  if (mode === 'tarot_spread') {
    return `Ты — Велес, таролог. Колода Райдера-Уэйта. Используй только карты из "Расклад таро". Не добавляй руны, чакры, нумерологию. Структура: вступление, "Корень вопроса", "Скрытая сила и тень", "Ближайший шаг", итог. Русский, кириллица, без эмодзи.`;
  }
  return SYSTEM_PROMPT;
}

function getMaxTokensForMode(mode) {
  if (mode === 'rune_code') return 900;
  if (mode === 'profile_item') return 800;
  if (mode === 'matrix_arcana') return 800;
  if (mode === 'tarot_spread') return 900;
  return 800;
}

function sectionText(title, items) {
  if (!items || !items.length) return '';
  return `${title}\n` + items.map((item) => `- ${item}`).join('\n');
}

function findByName(items, text) {
  if (!items || !text) return null;
  const lowText = String(text).toLowerCase();
  return items.find((item) => lowText.includes(String(item.name || '').toLowerCase())) || null;
}

function findNumberProfile(value) {
  const n = parseInt(String(value || '').match(/\d+/)?.[0] || '', 10);
  if (!ASTRO_NUMEROLOGY_KNOWLEDGE || !n) return null;
  return ASTRO_NUMEROLOGY_KNOWLEDGE.numerology.numbers.find((item) => item.value === n) || null;
}

function selectMonosovKnowledge(b) {
  if (!MONOSOV_KNOWLEDGE && !MENSHIKOVA_RUNES_KNOWLEDGE && !ASTRO_NUMEROLOGY_KNOWLEDGE) return 'Книжный слой не подключен';

  const mode = b.requestMode || 'oracle';
  const focusSection = String(b.profileFocus?.section || '').toLowerCase();
  const focusLabel = String(b.profileFocus?.label || '').toLowerCase();
  const focusValue = String(b.profileFocus?.value || '');
  const message = String(b.message || '').toLowerCase();
  const blocks = [];
  const wantsAstrology = focusSection.includes('наталь') || message.includes('астролог') || message.includes('знак') || message.includes('стихи') || message.includes('управител');
  const wantsNumerology = focusSection.includes('нумер') || focusSection.includes('цикл') || message.includes('нумер') || focusLabel.includes('число') || focusLabel.includes('персональ');
  const wantsTarotOrKabbalah = mode === 'tarot_spread' || focusSection.includes('таро') || focusSection.includes('каббал') || message.includes('таро') || message.includes('сфир') || message.includes('каббал');
  const wantsRunes = mode === 'rune_code' || focusSection.includes('рун') || message.includes('рун');

  if (ASTRO_NUMEROLOGY_KNOWLEDGE && wantsAstrology) {
    blocks.push(sectionText('Правила астрологии и нумерологии', ASTRO_NUMEROLOGY_KNOWLEDGE.rules));
    const sign = findByName(ASTRO_NUMEROLOGY_KNOWLEDGE.astrology.signs, focusValue || b.zodiac);
    const element = findByName(ASTRO_NUMEROLOGY_KNOWLEDGE.astrology.elements, focusValue || b.element);
    const quality = findByName(ASTRO_NUMEROLOGY_KNOWLEDGE.astrology.qualities, focusValue || b.quality);
    const planet = findByName(ASTRO_NUMEROLOGY_KNOWLEDGE.astrology.planets, focusValue || b.planet);
    if (sign) blocks.push(`Знак\n- ${sign.name}: архетип — ${sign.archetype}; дар — ${sign.gift}; тень — ${sign.shadow}; практика — ${sign.practice}.`);
    if (element) blocks.push(`Стихия\n- ${element.name}: ${element.meaning}; тень — ${element.shadow}; практика — ${element.practice}.`);
    if (quality) blocks.push(`Качество\n- ${quality.name}: ${quality.meaning}; тень — ${quality.shadow}; практика — ${quality.practice}.`);
    if (planet) blocks.push(`Управитель\n- ${planet.name}: ${planet.meaning}; практика — ${planet.practice}.`);
  }

  if (ASTRO_NUMEROLOGY_KNOWLEDGE && wantsNumerology) {
    blocks.push(sectionText('Правила астрологии и нумерологии', ASTRO_NUMEROLOGY_KNOWLEDGE.rules));
    const number = findNumberProfile(focusValue || b.lifePath || b.personalDay);
    const position = findByName(ASTRO_NUMEROLOGY_KNOWLEDGE.numerology.positions, b.profileFocus?.label || '');
    if (position) blocks.push(`Позиция числа\n- ${position.name}: ${position.meaning}.`);
    if (number) blocks.push(`Ключ числа\n- ${number.value}: ${number.meaning}; тень — ${number.shadow}; практика — ${number.practice}.`);
  }

  if (MONOSOV_KNOWLEDGE && (wantsTarotOrKabbalah || wantsRunes || mode === 'oracle' || b.events?.length)) {
    blocks.push(sectionText('Правила книжного слоя', MONOSOV_KNOWLEDGE.rules));
  }

  if (MONOSOV_KNOWLEDGE && wantsTarotOrKabbalah) {
    blocks.push(sectionText('Таро и каббалистическая практика', MONOSOV_KNOWLEDGE.tarot_and_sefirot.lens));
    blocks.push(sectionText('Практическое применение', MONOSOV_KNOWLEDGE.tarot_and_sefirot.practice));
  }

  if (wantsRunes) {
    const selectedRune = String(b.profileFocus?.value || b.runeCode?.destiny || b.birthRune || b.dailyRune || b.message || '').toLowerCase();

    if (MONOSOV_KNOWLEDGE) {
      blocks.push(sectionText('Руническая модель', MONOSOV_KNOWLEDGE.runes.lens));
    }

    if (MENSHIKOVA_RUNES_KNOWLEDGE) {
      blocks.push(sectionText('Северная руническая модель', MENSHIKOVA_RUNES_KNOWLEDGE.rules));
      blocks.push(sectionText('Футарк как путь сознания', MENSHIKOVA_RUNES_KNOWLEDGE.core_lens));
      blocks.push(sectionText('Стиль рунического ответа', MENSHIKOVA_RUNES_KNOWLEDGE.answer_style));

      const runeKey = findByName(MENSHIKOVA_RUNES_KNOWLEDGE.rune_keys, selectedRune);
      if (runeKey) {
        blocks.push(`Ключ выбранной руны\n- ${runeKey.name}: ${runeKey.key}.`);
      }

      const world = MENSHIKOVA_RUNES_KNOWLEDGE.yggdrasil_worlds.find((item) => message.includes(item.name.toLowerCase()));
      if (world) {
        blocks.push(`Выбранный мир Иггдрасиля\n- ${world.name}: ${world.theme}. Использовать, когда ${world.use_when}.`);
      }

      const deity = MENSHIKOVA_RUNES_KNOWLEDGE.deity_archetypes.find((item) => message.includes(item.name.toLowerCase()));
      if (deity) {
        blocks.push(`Выбранный божественный архетип\n- ${deity.name}: ${deity.theme}. Использовать, когда ${deity.use_when}.`);
      }
    }

    if (MONOSOV_KNOWLEDGE) {
      const matchedAtt = MONOSOV_KNOWLEDGE.runes.atts.find((att) => {
        return att.runes.some((rune) => selectedRune.includes(rune.toLowerCase()));
      });
      if (matchedAtt) {
        blocks.push(`Атт выбранной руны\n- ${matchedAtt.name}: ${matchedAtt.meaning}. Руны атта: ${matchedAtt.runes.join(', ')}.`);
      }
    }
  }

  if (MONOSOV_KNOWLEDGE && (mode === 'oracle' || b.events?.length)) {
    blocks.push(sectionText('Хроника и повторяющиеся события', MONOSOV_KNOWLEDGE.chronicle.lens));
  }

  if (MONOSOV_KNOWLEDGE && (message.includes('мантр') || message.includes('звук') || message.includes('слово') || message.includes('практик'))) {
    blocks.push(sectionText('Слово, звук и символ', MONOSOV_KNOWLEDGE.language_and_sound.lens));
  }

  let text = blocks.filter(Boolean).join('\n\n');
  if (text.length > 1500) text = text.substring(0, 1500);
  return text || '';
}

app.post('/api/oracle', async (req, res) => {
  try {
    const b = req.body;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'API ключ не настроен. Добавь GROQ_API_KEY в .env' });
    }

    const requestMode = b.requestMode === 'tarot_spread'
      ? 'расклад таро'
      : (b.requestMode === 'matrix_arcana'
        ? 'аркан матрицы'
        : (b.requestMode === 'profile_item'
          ? 'позиция профиля'
          : (b.requestMode === 'rune_code' ? 'рунический код' : 'обычный оракул')));

    const baseUserData = [
      `Имя: ${b.userName}`,
      `Дата рождения: ${b.birthDate}`,
      `Сегодня: ${b.today}`,
      `Режим запроса: ${requestMode}`
    ];

    const userData = (function() {
      if (b.requestMode === 'profile_item') {
        return baseUserData.concat([
          ``,
          `--- ФОКУС ПРОФИЛЯ ---`,
          `${formatProfileFocus(b.profileFocus)}`
        ]).join('\n');
      }

      if (b.requestMode === 'matrix_arcana') {
        return baseUserData.concat([
          ``,
          `--- ФОКУС МАТРИЦЫ ---`,
          `${formatMatrixFocus(b.matrixFocus)}`
        ]).join('\n');
      }

      if (b.requestMode === 'tarot_spread') {
        return baseUserData.concat([
          ``,
          `--- РАСКЛАД ТАРО ---`,
          `${formatTarotSpread(b.tarotSpread)}`
        ]).join('\n');
      }

      if (b.requestMode === 'rune_code') {
        return baseUserData.concat([
          ``,
          `--- РУНИЧЕСКИЙ КОД ---`,
          `${formatRuneCode(b.runeCode)}`
        ]).join('\n');
      }

      return baseUserData.concat([
      ``,
      `АСТРОЛОГИЯ: знак зодиака = ${b.zodiac}, стихия = ${b.element}, управитель = ${b.planet}`,
      `НУМЕРОЛОГИЯ: жизненный путь = ${b.lifePath}, судьба = ${b.destiny}, душа = ${b.soul}, личность = ${b.personality}, зрелость = ${b.maturity}`,
      `ЦИКЛЫ: персональный год = ${b.personalYear}, месяц = ${b.personalMonth}, день = ${b.personalDay}`,
      `ТАРО: карта рождения = ${b.birthTarot}, карта года = ${b.yearTarot}, карта дня = ${b.dailyTarot}`,
      `РУНЫ: руна рождения = ${b.birthRune}, руна дня = ${b.dailyRune}`,
      `ТОТЕМ: ${b.totem || '—'}`,
      `МАТРИЦА СУДЬБЫ: характер=${b.matrix?.character || '—'}, карма=${b.matrix?.karma || '—'}, дух=${b.matrix?.spirit || '—'}, талант=${b.matrix?.talent || '—'}, хвост=${b.matrix?.tail || '—'}, деньги=${b.matrix?.money || '—'}, отношения=${b.matrix?.relations || '—'}, миссия=${b.matrix?.mission || '—'}`,
      ]).join('\n');
    })();

    const eventsText = b.events && b.events.length > 0
      ? b.events.map((e, i) => `${i + 1}. ${e.date}: ${e.text}`).join('\n')
      : 'Пока нет записей';

    const mentalHealthSignals = detectMentalHealthSignals(b.message, b.events);
    const bookKnowledgeText = selectMonosovKnowledge(b);

    const parts = [getPromptForMode(b.requestMode), `\n=== КАРТА ===\n${userData}`];
    if (bookKnowledgeText) parts.push(`\n=== ЗНАНИЯ ===\n${bookKnowledgeText}`);
    if (eventsText !== 'Пока нет записей') parts.push(`\n=== СОБЫТИЯ ===\n${eventsText}`);
    if (mentalHealthSignals.includes('Уровень внимания')) parts.push(`\n=== БЕЗОПАСНОСТЬ ===\n${mentalHealthSignals}`);
    const systemText = parts.join('');

    const groqBody = JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: b.message }
      ],
      temperature: 0.65,
      max_tokens: getMaxTokensForMode(b.requestMode)
    });

    let data = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(GROQ_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + GROQ_API_KEY
          },
          body: groqBody
        });

        if (response.status === 429) {
          const wait = Math.min((attempt + 1) * 2000, 5000);
          console.warn(`Groq rate limit (attempt ${attempt + 1}/3), waiting ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        if (!response.ok) {
          const err = await response.text();
          console.error(`Groq error (attempt ${attempt + 1}/3):`, err);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
            continue;
          }
          return res.status(500).json({ error: 'Ошибка Groq API' });
        }

        data = await response.json();
        break;
      } catch (fetchErr) {
        console.error(`Groq fetch error (attempt ${attempt + 1}/3):`, fetchErr.message);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
          continue;
        }
        return res.status(500).json({ error: 'Ошибка связи с AI' });
      }
    }

    if (!data) {
      return res.status(500).json({ error: 'AI не ответил после 3 попыток' });
    }
    const rawReply = data.choices?.[0]?.message?.content || 'Звёзды молчат... Попробуй позже.';
    const reply = polishReply(cleanNonCrisisClinicalReply(cleanMoonPositionReply(cleanTotemReply(cleanRuneReply(rawReply, b), b)), b));
    console.log('Groq reply:', reply);

    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Велес запущен: http://localhost:' + PORT);
  console.log('');
  if (!GROQ_API_KEY) {
    console.log('  ⚠ GROQ_API_KEY не задан! Добавь в .env файл.');
    console.log('');
  }
});
