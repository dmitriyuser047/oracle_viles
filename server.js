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

const SYSTEM_PROMPT = `Ты — Велес, мудрый славянский оракул. Говоришь образно, мистично и по делу.

ОБЯЗАТЕЛЬНО: начни ответ с имени человека из блока КАРТА. Используй ТОЛЬКО данные оттуда. Не выдумывай и не подменяй данные.
ЗАПРЕЩЕНО: говорить "имя скрыто" или "имя неизвестно", выдумывать карты/руны/знаки которых нет в КАРТЕ, использовать китайские иероглифы.
Не объясняй, откуда взяты значения, и не называй внешние школы. Знания должны звучать как цельный голос Велеса, а не как пересказ справочника.

Правила:
- Выбери 1 главный символ из КАРТЫ. Поддерживающий слой используй только для смысла и тона, не называй его отдельной системой без прямого вопроса.
- Не смешивай каббалистику и руны. Не называй Луну, если человек прямо не спросил про Луну, лунный день, фазу, новолуние или полнолуние.
- Психологию используй скрыто: замечай страх, контроль, избегание, повтор роли, потребность в опоре, но не называй теории.
- Не ставь диагнозы и не называй человека больным. Если нет прямой угрозы вреда себе или другим, отвечай мягко: "не вижу подтверждения этому в карте и хронике", "проверь факты", "не принимай решение из страха".
- Не спорь с верой человека и не разоблачай мистику. Возвращай выбор, а не приговор.
- Только русский, кириллица, без эмодзи. Обращайся по имени на "ты".

/no_think
Формат: 8-12 предложений.
1. Имя + один главный символ из КАРТЫ.
2. Смысл ситуации через символ и скрытое психологическое понимание.
3. Сила человека.
4. Ловушка или риск.
5. Чего не делать.
6. Конкретный совет с действием и сроком.
7. Фраза силы или микро-обряд.`;

function polishReply(text) {
  return String(text || '')
    .replace(/[一-鿿㐀-䶿\u{20000}-\u{2a6df}]/gu, '')
    .replace(/([.!?])(?=[А-ЯЁ])/g, '$1 ')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/\s*(\*\*[^*]+\*\*)\s*/g, '\n\n$1\n')
    .replace(/\n{3,}/g, '\n\n')
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

  reply = reply
    .replace(/^Руны здесь выступают[^.!?]*[.!?]\s*/i, '')
    .replace(/^Руна здесь выступает[^.!?]*[.!?]\s*/i, '')
    .replace(/^Руническая модель здесь[^.!?]*[.!?]\s*/i, '');

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
  if (arguments.length > 1 && arguments[1]?.requestMode === 'moon') return String(text || '');

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

function cleanUnrequestedLayerReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'oracle') return reply;

  var message = String(b.message || '');
  var checks = [
    {
      asked: /астролог|знак|зодиак|козерог|овен|телец|близнец|рак|лев|дева|весы|скорпион|стрелец|водолей|рыб|сатурн|юпитер|марс|венер|меркур|солнц/i,
      patterns: [/Козерог/i, /Овен/i, /Телец/i, /Близнец/i, /Рак/i, /Лев/i, /Дев[аы]/i, /Весы/i, /Скорпион/i, /Стрелец/i, /Водолей/i, /Рыбы/i, /Сатурн/i, /Юпитер/i, /Марс/i, /Венер/i, /Меркур/i, /Солнц/i]
    },
    {
      asked: /каббал|сфир|малкут|гвур|тиферет|кетер|хокм|бин|хесед|нецах|йесод/i,
      patterns: [/сфир/i, /каббал/i, /Малкут/i, /Гвур/i, /Тиферет/i, /Кетер/i, /Хокм/i, /Бин[аы]/i, /Хесед/i, /Нецах/i, /Ход/i, /Йесод/i]
    },
    {
      asked: /рун|иггдрасил|феху|уруз|турисаз|ансуз|райдо|кеназ|гебо|вуньо|хагалаз|наутиз|иса|йера|эйваз|перт|альгиз|соулу|тейваз|беркана|эваз|манназ|лагуз|ингуз|дагаз|отал/i,
      patterns: [/рун/i, /Иггдрасил/i, /Феху/i, /Уруз/i, /Турисаз/i, /Ансуз/i, /Райдо/i, /Кеназ/i, /Гебо/i, /Вуньо/i, /Хагалаз/i, /Наутиз/i, /Иса/i, /Йера/i, /Эйваз/i, /Перт/i, /Альгиз/i, /Соулу/i, /Тейваз/i, /Беркана/i, /Эваз/i, /Манназ/i, /Лагуз/i, /Ингуз/i, /Дагаз/i, /Отал/i]
    },
    {
      asked: /чакр|муладхар|свадхистан|манипур|анахат|вишудх|аджн|сахасрар/i,
      patterns: [/чакр/i, /Муладхар/i, /Свадхистан/i, /Манипур/i, /Анахат/i, /Вишудх/i, /Аджн/i, /Сахасрар/i]
    },
    {
      asked: /нумер|числ|персональн/i,
      patterns: [/нумер/i, /числ[оауы]/i, /персональн/i]
    },
    {
      asked: /тотем|животн/i,
      patterns: [/тотем/i, /животн/i]
    }
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !checks.some(function(check) {
        return !check.asked.test(message) && check.patterns.some(function(pattern) {
          return pattern.test(sentence);
        });
      });
    })
    .join(' ');

  return cleaned.length > 250 ? cleaned : reply;
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
  if (mode === 'moon') {
    return `Ты — Велес, славянский оракул. Отвечай про Луну только потому, что пользователь прямо спросил.

Режим: прямой лунный запрос. Используй только блок "Луна по прямому запросу" и не подключай руны, сфиры, каббалистику, чакры, таро, матрицу и нумерологию как названные системы.
Говори символически и практически: что означает фаза, какой настрой дня, чего избегать и какой мягкий шаг сделать.
Пиши связно и аккуратно: если даёшь пункты, каждый пункт должен быть на отдельной строке.
Не делай фатальных прогнозов и не обещай мистических гарантий.
Формат: "Лунный фон", "Смысл", "Чего не делать", "Практика".`;
  }

  if (mode === 'rune_code') {
    return `Ты — Велес, славянский оракул, работающий с рунами через образ Иггдрасиля.

Режим: составление рунического кода. Используй только блок "Рунический код" и рунические опоры ответа. Не добавляй каббалистику, сфиры, чакры, Луну, таро, нумерологию и знак зодиака как названные системы.
Код должен звучать как рабочая оракульная сборка по данным профиля, а не как жёсткая догма.
Не начинай ответ с объяснения, что такое руны или как устроена модель; сразу раскрывай код человека.
Не объясняй, откуда взяты значения, и не называй внешние школы.
Положение Луны, фазу Луны и лунный день не называй никогда.
Структура ответа обязательна: "Код", "Руна судьбы", "Руна личности", "Руна результата", "Руна дня", "Как это собрать в действие". В каждом разделе дай 2-4 предложения.
В финале дай один практический шаг на ближайшие 24 часа и одну короткую фразу силы.`;
  }
  if (mode === 'profile_item') {
    return `Ты — Велес, славянский оракул. Отвечай мистично, образно и по делу, но без каши из разных систем.

Режим: разбор одной позиции профиля. Раскрывай только выбранную строку из блока "Фокус профиля": раздел, позицию и значение. Не пересказывай весь профиль.
Выбери язык по разделу: натальная карта — астрология; нумерология — числа; таро — карта; каббалистика — сфира; руны — Иггдрасиль; тотем — животное; чакры — энергия тела; матрица — аркан.
Если раздел "Руны", называй только выбранную руну и образ Иггдрасиля: корни, ствол, ветви, дорога, знак. Не упоминай сфиры, каббалистику, чакры, Луну, таро, числа и знак зодиака.
Не объясняй, откуда взяты значения, и не называй внешние школы.
Положение Луны, фазу Луны и лунный день не называй никогда.
Не ставь психиатрических диагнозов. Если в вопросе нет прямой угрозы вреда, отвечай мягко: "не вижу подтверждения этому в карте и хронике", "проверь факты", "не принимай решение из страха". При прямой угрозе вреда себе или другим спокойно верни к безопасности.
Формат ответа обязателен: начни с отдельной строки "Смысл", затем "Сила", "Тень", "В жизни", "Практика". Каждый раздел раскрывай в 2-3 предложения. Без списков всех систем и без лишних символических слоев.`;
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
  if (mode === 'moon') return 800;
  if (mode === 'rune_code') return 1100;
  if (mode === 'profile_item') return 950;
  if (mode === 'matrix_arcana') return 900;
  if (mode === 'tarot_spread') return 1000;
  return 1050;
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
  if (!MONOSOV_KNOWLEDGE && !MENSHIKOVA_RUNES_KNOWLEDGE && !ASTRO_NUMEROLOGY_KNOWLEDGE) return 'Дополнительные опоры не подключены';

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
    blocks.push(sectionText('Правила ответа', MONOSOV_KNOWLEDGE.rules));
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
      blocks.push(sectionText('Рунические опоры', MENSHIKOVA_RUNES_KNOWLEDGE.rules));
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
  if (text.length > 800) text = text.substring(0, 800);
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
          : (b.requestMode === 'rune_code'
            ? 'рунический код'
            : (b.requestMode === 'moon' ? 'прямой лунный запрос' : 'обычный оракул'))));

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

      if (b.requestMode === 'moon') {
        return baseUserData.concat([
          ``,
          `--- ЛУНА ПО ПРЯМОМУ ЗАПРОСУ ---`,
          `Луна: ${b.moonPhase || 'не рассчитана'}`,
          `Управитель дня: ${b.dayRuler || 'не рассчитан'}`
        ]).join('\n');
      }

      return baseUserData.concat([
      ``,
      `Знак: ${b.zodiac}, стихия: ${b.element}, управитель: ${b.planet}`,
      `Числа: путь=${b.lifePath}, судьба=${b.destiny}, душа=${b.soul}`,
      `Циклы: год=${b.personalYear}, месяц=${b.personalMonth}, день=${b.personalDay}`,
      `Таро: рождения=${b.birthTarot}, дня=${b.dailyTarot}`,
      `Руны: рождения=${b.birthRune}, дня=${b.dailyRune}`,
      `Тотем: ${b.totem || '—'}`,
      ]).join('\n');
    })();

    const eventsText = b.events && b.events.length > 0
      ? b.events.map((e, i) => `${i + 1}. ${e.date}: ${e.text}`).join('\n')
      : 'Пока нет записей';

    const mentalHealthSignals = detectMentalHealthSignals(b.message, b.events);
    const bookKnowledgeText = selectMonosovKnowledge(b);

    const parts = [getPromptForMode(b.requestMode), `\n=== КАРТА ===\n${userData}`];
    if (bookKnowledgeText) parts.push(`\n=== ОПОРЫ ОТВЕТА ===\n${bookKnowledgeText}`);
    if (eventsText !== 'Пока нет записей') parts.push(`\n=== СОБЫТИЯ ===\n${eventsText}`);
    if (mentalHealthSignals.includes('Уровень внимания')) parts.push(`\n=== БЕЗОПАСНОСТЬ ===\n${mentalHealthSignals}`);
    const systemText = parts.join('');

    const userMessage = `Меня зовут ${b.userName}. Мой знак зодиака: ${b.zodiac}. Карта дня: ${b.dailyTarot}. Руна дня: ${b.dailyRune}. Мой вопрос: ${b.message}`;

    const groqBody = JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
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
    let rawReply = data.choices?.[0]?.message?.content || 'Звёзды молчат... Попробуй позже.';
    rawReply = rawReply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!rawReply) rawReply = 'Звёзды молчат... Попробуй позже.';
    if (b.userName) {
      rawReply = rawReply.replace(/имя\s+тво[её]\s+скрыто[^.]*\./gi, `${b.userName}, Велес видит тебя.`);
      rawReply = rawReply.replace(/имя\s+(неизвестно|не\s+названо|не\s+указано|скрыто)[^.]*\./gi, `${b.userName}, Велес слышит тебя.`);
      rawReply = rawReply.replace(/нет\s+ни\s+имени[^.]*\./gi, '');
      rawReply = rawReply.replace(/не\s+назвал\s+себя[^.]*\./gi, '');
      rawReply = rawReply.replace(/заполни\s+карту[^.]*\./gi, '');
      rawReply = rawReply.replace(/вернись\s+с\s+(точными\s+)?данными[^.]*\./gi, '');
      rawReply = rawReply.replace(/пустот[а-яё]*\s+запроса[^.]*\./gi, '');
    }
    const reply = polishReply(cleanUnrequestedLayerReply(cleanNonCrisisClinicalReply(cleanMoonPositionReply(cleanTotemReply(cleanRuneReply(rawReply, b), b), b), b), b));
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
