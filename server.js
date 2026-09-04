const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
    var match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && match[1]) process.env[match[1].trim()] = match[2].trim();
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';
const KNOWLEDGE_DIR = path.join(__dirname, 'knowledge');
const DATA_DIR = path.join(__dirname, 'data');
const AI_USAGE_LOG_PATH = process.env.AI_USAGE_LOG_PATH || path.join(DATA_DIR, 'ai-usage.jsonl');
const USAGE_STATS_TOKEN = process.env.USAGE_STATS_TOKEN || '';

const ANTHROPIC_PRICES_PER_MTOK = [
  { pattern: /haiku/i, input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.10 },
  { pattern: /sonnet/i, input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 },
  { pattern: /opus/i, input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.50 }
];

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
const DREAM_SYMBOLS_KNOWLEDGE = loadKnowledgeFile('dream_symbols.json');
const TAROT_WAITE_KNOWLEDGE = loadKnowledgeFile('tarot_waite.json');
const DIALOGUE_PATTERNS_KNOWLEDGE = loadKnowledgeFile('dialogue_patterns.json');
const PSYCHOLOGY_MODELS_KNOWLEDGE = loadKnowledgeFile('psychology_models.json');
const ESOTERIC_ROUTING_KNOWLEDGE = loadKnowledgeFile('esoteric_routing.json');

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'oracle-viles' });
});

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_err) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Usage log read failed:', err.message);
    return [];
  }
}

function getAnthropicPrice(model) {
  return ANTHROPIC_PRICES_PER_MTOK.find((item) => item.pattern.test(model || '')) || ANTHROPIC_PRICES_PER_MTOK[0];
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 1000000) / 1000000;
}

function normalizeUsage(provider, model, data) {
  const rawUsage = data?.usage || {};
  if (provider === 'anthropic') {
    return {
      provider,
      model,
      inputTokens: Number(rawUsage.input_tokens || 0),
      outputTokens: Number(rawUsage.output_tokens || 0),
      cacheWriteTokens: Number(rawUsage.cache_creation_input_tokens || 0),
      cacheReadTokens: Number(rawUsage.cache_read_input_tokens || 0),
      totalTokens: Number(rawUsage.input_tokens || 0)
        + Number(rawUsage.output_tokens || 0)
        + Number(rawUsage.cache_creation_input_tokens || 0)
        + Number(rawUsage.cache_read_input_tokens || 0),
      raw: rawUsage
    };
  }

  return {
    provider,
    model,
    inputTokens: Number(rawUsage.prompt_tokens || 0),
    outputTokens: Number(rawUsage.completion_tokens || 0),
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    totalTokens: Number(rawUsage.total_tokens || 0),
    raw: rawUsage
  };
}

function estimateUsageCost(usage) {
  if (!usage || usage.provider !== 'anthropic') return null;
  const price = getAnthropicPrice(usage.model);
  return roundMoney(
    (usage.inputTokens / 1000000) * price.input
    + (usage.outputTokens / 1000000) * price.output
    + (usage.cacheWriteTokens / 1000000) * price.cacheWrite
    + (usage.cacheReadTokens / 1000000) * price.cacheRead
  );
}

function recordAiUsage(entry) {
  try {
    ensureDataDir();
    fs.appendFileSync(AI_USAGE_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.warn('Usage log write failed:', err.message);
  }
}

function isLocalRequest(req) {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function canReadUsageStats(req) {
  if (isLocalRequest(req)) return true;
  if (!USAGE_STATS_TOKEN) return false;
  return req.get('x-usage-token') === USAGE_STATS_TOKEN || req.query.token === USAGE_STATS_TOKEN;
}

function emptyUsageSummary() {
  return {
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0
  };
}

function addUsage(summary, entry) {
  const usage = entry.usage || {};
  summary.requests += 1;
  summary.inputTokens += Number(usage.inputTokens || 0);
  summary.outputTokens += Number(usage.outputTokens || 0);
  summary.cacheReadTokens += Number(usage.cacheReadTokens || 0);
  summary.cacheWriteTokens += Number(usage.cacheWriteTokens || 0);
  summary.totalTokens += Number(usage.totalTokens || 0);
  summary.estimatedCostUsd = roundMoney(summary.estimatedCostUsd + Number(entry.estimatedCostUsd || 0));
}

app.get('/api/usage-stats', (req, res) => {
  if (!canReadUsageStats(req)) {
    return res.status(403).json({ error: 'Статистика доступна только локально на сервере или по токену.' });
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const entries = readJsonLines(AI_USAGE_LOG_PATH);
  const summary = {
    total: emptyUsageSummary(),
    today: emptyUsageSummary(),
    month: emptyUsageSummary(),
    byMode: {},
    recent: entries.slice(-20).reverse()
  };

  entries.forEach((entry) => {
    const date = String(entry.createdAt || '');
    addUsage(summary.total, entry);
    if (date.startsWith(todayKey)) addUsage(summary.today, entry);
    if (date.startsWith(monthKey)) addUsage(summary.month, entry);

    const mode = entry.requestMode || 'unknown';
    if (!summary.byMode[mode]) summary.byMode[mode] = emptyUsageSummary();
    addUsage(summary.byMode[mode], entry);
  });

  res.json(summary);
});

const SYSTEM_PROMPT = `Ты — Велес, мудрый славянский оракул. Говоришь образно, мистично и по делу.

ОБЯЗАТЕЛЬНО: начни ответ с имени человека из блока КАРТА. Используй ТОЛЬКО данные оттуда. Не выдумывай и не подменяй данные.
ЗАПРЕЩЕНО: говорить "имя скрыто" или "имя неизвестно", выдумывать карты/руны/знаки которых нет в КАРТЕ, использовать китайские иероглифы.
Не объясняй, откуда взяты значения, и не называй внешние школы. Знания должны звучать как цельный голос Велеса, а не как пересказ справочника.
Не вставляй ссылки, URL, названия сайтов, строки "источник", "ссылка", "литература" и похожие отсылки. Ответ должен выглядеть как собственный разбор Велеса.

Правила:
- Выбери 1 главный символ из КАРТЫ. Поддерживающий слой используй только для смысла и тона, не называй его отдельной системой без прямого вопроса.
- В обычном режиме не говори "по карте дня", "исходя из карты дня" или "карта дня показывает", если человек прямо не спросил о карте. Карта дня нужна как внутренняя опора, а не как видимое объяснение всего ответа.
- Не смешивай каббалистику и руны. Не называй Луну, если человек прямо не спросил про Луну, лунный день, фазу, новолуние или полнолуние.
- Психологию используй скрыто: замечай страх, контроль, избегание, повтор роли, потребность в опоре, но не называй теории.
- Не отвечай односложно. Даже на простой вопрос дай ощущение анализа: что видно в ситуации, почему это могло сложиться, где ресурс человека, где ловушка и какой следующий шаг.
- Не повторяй одну мысль разными словами. Если смысл уже сказан, развивай его новым наблюдением или действием.
- Не ограничивайся советом. Сначала покажи скрытый узор ситуации, затем уже дай действие.
- Не ставь диагнозы и не называй человека больным. Если нет прямой угрозы вреда себе или другим, отвечай мягко: "не вижу подтверждения этому в карте и хронике", "проверь факты", "не принимай решение из страха".
- Не спорь с верой человека и не разоблачай мистику. Возвращай выбор, а не приговор.
- Следи за грамматикой: согласуй род, число и падежи; не смешивай "ты" и "вы"; не используй машинные фразы.
- Не используй формы с вариантами рода вроде "сделал(а)", "готов(а)", "уверенным(ой)". Перефразируй нейтрально: "было чувство", "получилось", "есть готовность".
- Только русский, кириллица, без эмодзи. Обращайся по имени на "ты".

/no_think
Формат обычного ответа: 10-14 предложений, 2-4 коротких абзаца.
1. Имя + один главный символ из КАРТЫ.
2. Что происходит в ситуации через этот символ.
3. Какой скрытый сценарий или внутреннее напряжение может стоять за вопросом.
4. Сила человека и как её использовать.
5. Тень, риск или самообман.
6. Чего не делать.
7. Конкретный совет с действием и сроком.
8. Фраза силы или микро-обряд.`;

function polishReply(text) {
  return String(text || '')
    .replace(/[一-鿿㐀-䶿\u{20000}-\u{2a6df}]/gu, '')
    .replace(/[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/gu, '')
    .replace(/дефолтн[а-яё]*/gi, 'обычный')
    .replace(/([.!?])(?=[А-ЯЁ])/g, '$1 ')
    .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
    .replace(/\s*(\*\*[^*]+\*\*)\s*/g, '\n\n$1\n')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function cleanGrammarReply(text) {
  return String(text || '')
    .replace(/([.!?])\s+(Тип сна|Главный образ|Что сон показывает|Скрытое чувство|О чём предупреждает|Что сделать сейчас|Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня|Смысл|Сила|Тень|В жизни|Практика|Аркан|Код)(?=\s|[:.\n]|$)/g, '$1\n\n$2')
    .replace(/(Тип сна|Главный образ|Что сон показывает|Скрытое чувство|О чём предупреждает|Что сделать сейчас|Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня|Смысл|Сила|Тень|В жизни|Практика|Аркан|Код)\r?\n([а-яё])/g, function(_match, heading, letter) {
      return heading + '\n' + letter.toUpperCase();
    })
    .replace(/^([^,\n]{2,40}),\s*(тип сна|смысл|главный образ|что видно|общий рисунок|аркан|код|лунный фон)(?=\s|[:.\n]|$)/iu, function(_match, name, heading) {
      return name + ', смотрю.\n\n' + heading.charAt(0).toUpperCase() + heading.slice(1);
    })
    .replace(/\bВаша психика\b/g, 'Твоя психика')
    .replace(/\bваша психика\b/g, 'твоя психика')
    .replace(/\bВаше\b/g, 'Твоё')
    .replace(/\bваше\b/g, 'твоё')
    .replace(/\bВаша\b/g, 'Твоя')
    .replace(/\bваша\b/g, 'твоя')
    .replace(/\bВаши\b/g, 'Твои')
    .replace(/\bваши\b/g, 'твои')
    .replace(/\bВаш\b/g, 'Твой')
    .replace(/\bваш\b/g, 'твой')
    .replace(/\bВас\b/g, 'тебя')
    .replace(/\bвас\b/g, 'тебя')
    .replace(/\bВам\b/g, 'тебе')
    .replace(/\bвам\b/g, 'тебе')
    .replace(/\bВашего\b/g, 'твоего')
    .replace(/\bвашего\b/g, 'твоего')
    .replace(/\bВашему\b/g, 'твоему')
    .replace(/\bвашему\b/g, 'твоему')
    .replace(/\bВашим\b/g, 'твоим')
    .replace(/\bвашим\b/g, 'твоим')
    .replace(/\bВашем\b/g, 'твоём')
    .replace(/\bвашем\b/g, 'твоём')
    .replace(/\bв твоей карт дня\b/gi, 'в твоей карте дня')
    .replace(/\bв твоей карт[ае] дня\b/gi, 'в твоей карте дня')
    .replace(/\bнакопленное усталость\b/gi, 'накопленная усталость')
    .replace(/\bнакопленное тревога\b/gi, 'накопленная тревога')
    .replace(/\bнакопленное напряжение\b/gi, 'накопленное напряжение')
    .replace(/\bнакопленную напряжение\b/gi, 'накопленное напряжение')
    .replace(/\bв внешн/gi, 'во внешн')
    .replace(/\bчувствуем в тебя\b/gi, 'чувствуют в тебе')
    .replace(/\bмасмой\b/gi, 'маской')
    .replace(/\bсигналазирует\b/gi, 'сигнализирует')
    .replace(/\bпродолжайшь\b/gi, 'продолжаешь')
    .replace(/\bначнешь\b/gi, 'начнёшь')
    .replace(/\bчувствовал\(а\) себя\b/gi, 'было ощущение себя')
    .replace(/\bсделал\(а\)\b/gi, 'сделано')
    .replace(/\bготов\(а\)\b/gi, 'есть готовность')
    .replace(/\bуверенным\(ой\)\b/gi, 'увереннее')
    .replace(/\bгнетет\b/gi, 'гнёт')
    .replace(/\badrenaline\b/gi, 'адреналине')
    .replace(/\bacted\b/gi, 'сработал')
    .replace(/\bпривычный рубашку\b/gi, 'привычную оболочку')
    .replace(/\bне пытайтесь\b/gi, 'не пытайся')
    .replace(/\bпытайтесь\b/gi, 'пытайся')
    .replace(/\bиспользуйте\b/gi, 'используй')
    .replace(/\bговорите\b/gi, 'говори')
    .replace(/\bизбегайте\b/gi, 'избегай')
    .replace(/\bпризнайте\b/gi, 'признай')
    .replace(/\bпрактикуйте\b/gi, 'практикуй')
    .replace(/\bзанимайтесь\b/gi, 'занимайся')
    .replace(/\bпрактикуйте\b/gi, 'практикуй')
    .replace(/\bобратите внимание\b/gi, 'обрати внимание')
    .replace(/\bпроверьте\b/gi, 'проверь')
    .replace(/\bзапишите\b/gi, 'запиши')
    .replace(/\bсделайте\b/gi, 'сделай')
    .replace(/\bназовите\b/gi, 'назови')
    .replace(/\bотложите\b/gi, 'отложи')
    .replace(/\bпримите\b/gi, 'прими')
    .replace(/\bпозвольте\b/gi, 'позволь')
    .replace(/(^|[^А-Яа-яЁё])Примите(?=$|[^А-Яа-яЁё])/g, '$1Прими')
    .replace(/(^|[^А-Яа-яЁё])примите(?=$|[^А-Яа-яЁё])/g, '$1прими')
    .replace(/\bслишком мало действуй\b/gi, 'слишком мало действуешь')
    .replace(/\bты рискуешь потерять энергию на то, чтобы просто жить\b/gi, 'ты рискуешь тратить энергию вместо того, чтобы просто жить')
    .replace(/\bчто происходит\?/gi, 'что происходит?')
    .replace(/([.!?]\s+)что я /gi, '$1Что я ')
    .replace(/(^|[^А-Яа-яЁё])Вас(?=$|[^А-Яа-яЁё])/g, '$1тебя')
    .replace(/(^|[^А-Яа-яЁё])вас(?=$|[^А-Яа-яЁё])/g, '$1тебя')
    .replace(/(^|[^А-Яа-яЁё])Вам(?=$|[^А-Яа-яЁё])/g, '$1тебе')
    .replace(/(^|[^А-Яа-яЁё])вам(?=$|[^А-Яа-яЁё])/g, '$1тебе')
    .replace(/(^|[^А-Яа-яЁё])Ваш(?=$|[^А-Яа-яЁё])/g, '$1твой')
    .replace(/(^|[^А-Яа-яЁё])ваш(?=$|[^А-Яа-яЁё])/g, '$1твой')
    .replace(/(^|[^А-Яа-яЁё])Ваша(?=$|[^А-Яа-яЁё])/g, '$1твоя')
    .replace(/(^|[^А-Яа-яЁё])ваша(?=$|[^А-Яа-яЁё])/g, '$1твоя')
    .replace(/(^|[^А-Яа-яЁё])Ваше(?=$|[^А-Яа-яЁё])/g, '$1твоё')
    .replace(/(^|[^А-Яа-яЁё])ваше(?=$|[^А-Яа-яЁё])/g, '$1твоё')
    .replace(/(^|[^А-Яа-яЁё])Ваши(?=$|[^А-Яа-яЁё])/g, '$1твои')
    .replace(/(^|[^А-Яа-яЁё])ваши(?=$|[^А-Яа-яЁё])/g, '$1твои')
    .replace(/(^|[^А-Яа-яЁё])используйте(?=$|[^А-Яа-яЁё])/gi, '$1используй')
    .replace(/(^|[^А-Яа-яЁё])говорите(?=$|[^А-Яа-яЁё])/gi, '$1говори')
    .replace(/(^|[^А-Яа-яЁё])избегайте(?=$|[^А-Яа-яЁё])/gi, '$1избегай')
    .replace(/(^|[^А-Яа-яЁё])не пытайтесь(?=$|[^А-Яа-яЁё])/gi, '$1не пытайся')
    .replace(/(^|[^А-Яа-яЁё])практикуйте(?=$|[^А-Яа-яЁё])/gi, '$1практикуй')
    .replace(/(^|[^А-Яа-яЁё])признайте(?=$|[^А-Яа-яЁё])/gi, '$1признай');
}

function cleanExternalReferencesReply(text, b) {
  var reply = String(text || '')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/^\s*(источник|источники|ссылка|ссылки|литература|references?)\s*:.*$/gim, '')
    .replace(/^\s*[-*]\s*(источник|ссылка)\s*:.*$/gim, '');

  var message = String(b?.message || '');
  var cardAsked = /карт[ауы] дня|таро|аркан|расклад/i.test(message);
  var dailyTarot = String(b?.dailyTarot || '').trim();
  var dailyRune = String(b?.dailyRune || '').trim();
  var dailyTarotName = dailyTarot.split(/[—-]/)[0].trim();
  var dailyRuneName = dailyRune.replace(/^[^\s]+\s+/, '').split(/[—-]/)[0].trim();
  var dailyTarotStem = dailyTarotName.length > 4 ? dailyTarotName.slice(0, -1).toLowerCase() : '';
  var dailyRuneStem = dailyRuneName.length > 4 ? dailyRuneName.slice(0, -1).toLowerCase() : '';
  var sourcePatterns = [
    /источник/i,
    /ссылк/i,
    /литератур/i,
    /на сайт/i,
    /перейд/i,
    /читай/i,
    /согласно/i,
    /по данным/i
  ];
  var cardSourcePatterns = [
    /по карт[еы] дня/i,
    /исходя из карт[ыи] дня/i,
    /карт[ауы] дня показывает/i,
    /главная карт[ауы] дня/i,
    /в карт[еы] дня видно/i,
    /карт[ауы]\s+тебе\s+шепч/i,
    /карт[ауы]\s+говор/i,
    /карт[ауы]\s+указывает/i,
    /в\s+карт[еы]\s+видно/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      if (sourcePatterns.some(function(pattern) { return pattern.test(sentence); })) return false;
      if (b?.requestMode === 'oracle' && !cardAsked) {
        if (cardSourcePatterns.some(function(pattern) { return pattern.test(sentence); })) return false;
        if (dailyTarot && sentence.toLowerCase().includes(dailyTarot.toLowerCase())) return false;
        if (dailyRune && sentence.toLowerCase().includes(dailyRune.toLowerCase())) return false;
        if (dailyTarotName && sentence.toLowerCase().includes(dailyTarotName.toLowerCase())) return false;
        if (dailyRuneName && sentence.toLowerCase().includes(dailyRuneName.toLowerCase())) return false;
        if (dailyTarotStem && sentence.toLowerCase().includes(dailyTarotStem)) return false;
        if (dailyRuneStem && sentence.toLowerCase().includes(dailyRuneStem)) return false;
        if (/(эта|данная|главная)\s+карт[ауы]|аркана?|рун[аы]/i.test(sentence)) return false;
      }
      return true;
    })
    .join(' ');

  if (b?.requestMode === 'oracle' && !cardAsked) {
    cleaned = cleaned
      .replace(/\bОна показывает, что\b/g, 'В ситуации видно, что')
      .replace(/\bона показывает, что\b/g, 'в ситуации видно, что')
      .replace(/\bОна говорит\b/g, 'Внутренний голос говорит')
      .replace(/\bона говорит\b/g, 'внутренний голос говорит')
      .replace(/\bОна шепчет\b/g, 'Внутренний голос шепчет')
      .replace(/\bона шепчет\b/g, 'внутренний голос шепчет');
  }

  return cleaned.length > 120 ? cleaned : reply;
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
  if (b?.requestMode === 'dialogue_energy') return reply;

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

function cleanDialogueEnergyReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'dialogue_energy') return reply;

  var forbidden = [
    /тотем/i, /животн/i, /волк/i, /лис/i, /медвед/i, /олень/i, /сокол/i,
    /рун/i, /Иггдрасил/i, /сфир/i, /каббал/i, /таро/i, /зодиак/i, /нумер/i, /Лун/i, /лун/i
  ];

  var cleaned = splitSentences(reply)
    .filter(function(sentence) {
      return !forbidden.some(function(pattern) { return pattern.test(sentence); });
    })
    .join(' ');

  return cleaned.length > 250 ? cleaned : reply;
}

function cleanBondReply(text, b) {
  var reply = String(text || '');
  if (!b || b.requestMode !== 'bond_analysis') return reply;

  return reply
    .replace(/(Общий рисунок|Что притягивает|Где трение|Как тебя может считывать человек|Как общаться|Чего не делать|Практика на 3 дня)\n([а-яё])/g, function(_match, heading, letter) {
      return heading + '\n' + letter.toUpperCase();
    })
    .replace(/\bтебя тянет друг к другу\b/gi, 'вас тянет друг к другу')
    .replace(/\bтебя объединяет\b/gi, 'вас объединяет')
    .replace(/\bтебе обоим\b/gi, 'вам обоим')
    .replace(/\bкто-то из тебя\b/gi, 'кто-то из вас')
    .replace(/\bни один из тебя\b/gi, 'никто из вас')
    .replace(/\bты будете\b/gi, 'ты будешь')
    .replace(/\bЧастаяManipура\b/gi, 'Манипура')
    .replace(/\bManipура\b/gi, 'Манипура')
    .replace(/\bоба партнера\b/gi, 'оба человека')
    .replace(/\bпартнера молчанием\b/gi, 'человека молчанием')
    .replace(/\bбез подковок\b/gi, 'без подколов')
    .replace(/\bваш общий язык\b/gi, 'общий язык пары')
    .replace(/(^|[^А-Яа-яЁё])Не проверяйте(?=$|[^А-Яа-яЁё])/g, '$1Не проверяй')
    .replace(/(^|[^А-Яа-яЁё])не проверяйте(?=$|[^А-Яа-яЁё])/g, '$1не проверяй')
    .replace(/(^|[^А-Яа-яЁё])Не прячьте(?=$|[^А-Яа-яЁё])/g, '$1Не прячь')
    .replace(/(^|[^А-Яа-яЁё])не прячьте(?=$|[^А-Яа-яЁё])/g, '$1не прячь')
    .replace(/(^|[^А-Яа-яЁё])Не позволяйте себе(?=$|[^А-Яа-яЁё])/g, '$1Не позволяй себе')
    .replace(/(^|[^А-Яа-яЁё])не позволяйте себе(?=$|[^А-Яа-яЁё])/g, '$1не позволяй себе')
    .replace(/(^|[^А-Яа-яЁё])Не игнорируйте(?=$|[^А-Яа-яЁё])/g, '$1Не игнорируй')
    .replace(/(^|[^А-Яа-яЁё])не игнорируйте(?=$|[^А-Яа-яЁё])/g, '$1не игнорируй')
    .replace(/(^|[^А-Яа-яЁё])Записывайте(?=$|[^А-Яа-яЁё])/g, '$1Записывай')
    .replace(/(^|[^А-Яа-яЁё])записывайте(?=$|[^А-Яа-яЁё])/g, '$1записывай')
    .replace(/(^|[^А-Яа-яЁё])выдавайте(?=$|[^А-Яа-яЁё])/gi, '$1давайте')
    .replace(/\bзамечаете ли вы\b/gi, 'замечай')
    .replace(/\bконтрольировать\b/gi, 'контролировать')
    .replace(/([.!?]\s+)(используй|избегай|записывай|практикуй|говори|признай|давайте|не позволяй|не игнорируй)/g, function(_match, prefix, word) {
      return prefix + word.charAt(0).toUpperCase() + word.slice(1);
    });
}

function ensureNameOpening(text, b) {
  var reply = String(text || '').trim();
  var name = String(b?.userName || '').trim();
  if (!name || reply.toLowerCase().startsWith(name.toLowerCase())) return reply;

  if (/^(Смысл|Сила|Тень|В жизни|Практика|Тип сна|Главный образ|Что видно|Общий рисунок|Аркан|Код|Лунный фон)(?=\s|[:.\n]|$)/i.test(reply)) {
    return `${name}, смотрю.\n\n${reply}`;
  }

  var lowered = reply.charAt(0).toLowerCase() + reply.slice(1);
  return `${name}, ${lowered}`;
}

function cleanMarkdownReply(text) {
  return String(text || '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/^[ \t]*:[ \t]*/gm, '');
}

function truncateText(value, maxLen) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  var head = Math.floor(maxLen * 0.62);
  var tail = maxLen - head - 32;
  return text.slice(0, head).trim() + ' ... [сокращено] ... ' + text.slice(-tail).trim();
}

function formatEventsForPrompt(events) {
  var list = Array.isArray(events) ? events : [];
  if (!list.length) return 'Пока нет записей';

  var limit = 5;
  var selected = list.slice(-limit);
  var hidden = Math.max(0, list.length - selected.length);
  var lines = selected.map(function(e, i) {
    var n = hidden + i + 1;
    var date = e && e.date ? e.date : 'без даты';
    var text = truncateText(e && e.text ? e.text : '', 150);
    return `${n}. ${date}: ${text}`;
  });

  if (hidden) {
    lines.unshift(`Старых записей скрыто: ${hidden}. Ниже последние ${selected.length}.`);
  }

  return lines.join('\n');
}

function formatChatMemoryForPrompt(memory) {
  if (!memory || typeof memory !== 'object') return '';
  const summary = truncateText(memory.summary || '', 600);
  const recent = Array.isArray(memory.recent) ? memory.recent.slice(-4) : [];
  const lines = recent.map((item) => {
    const role = item && item.role === 'assistant' ? 'Велес' : 'Пользователь';
    return `${role}: ${truncateText(item?.text || '', 240)}`;
  }).filter(Boolean);

  return [
    summary ? `Краткое summary прошлых реплик: ${summary}` : '',
    lines.length ? 'Последние реплики\n' + lines.join('\n') : ''
  ].filter(Boolean).join('\n\n');
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

function formatBondProfile(bond) {
  if (!bond || typeof bond !== 'object') {
    return 'Связь не рассчитана';
  }

  const self = bond.self || {};
  const partner = bond.partner || {};
  const pair = bond.pairMatrix || {};

  return [
    `Человек 1: ${self.name || 'не указан'}, дата ${self.birth || 'не указана'}, знак ${self.sign || '—'}, стихия ${self.element || '—'}, число пути ${self.lifePath || '—'}, число имени ${self.destiny || '—'}, руна ${self.rune || '—'}, чакра ${self.chakra || '—'}`,
    `Человек 2: ${partner.name || 'не указан'}, дата ${partner.birth || 'не указана'}, знак ${partner.sign || '—'}, стихия ${partner.element || '—'}, число пути ${partner.lifePath || '—'}, число имени ${partner.destiny || '—'}, руна ${partner.rune || '—'}, чакра ${partner.chakra || '—'}`,
    `Индекс связи: ${bond.score || '—'}%`,
    `Динамика: ${bond.dynamic || '—'}`,
    `Баланс: ${bond.balance || '—'}`,
    `Матрица пары, контакт: ${pair.contact || '—'}`,
    `Матрица пары, отношения: ${pair.relations || '—'}`,
    `Матрица пары, урок: ${pair.lesson || '—'}`,
    `Матрица пары, миссия: ${pair.mission || '—'}`,
    `Практический совет: ${bond.advice || '—'}`
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
  if (mode === 'dialogue_analysis') {
    return `Ты — Велес, мудрый разборщик общения. Пользователь вставляет сообщение или диалог и хочет понять, как ответить.

Режим: практический разбор переписки. Эзотерику, профиль, чакры, руны, карты и числа используй только скрыто для тона. В ответе не называй эзотерические системы, символы и традиции.
Не утверждай, что другой человек точно думает или чувствует. Говори вероятностями: "похоже", "может быть", "в тексте видно".
Не учи манипуляциям, ревности, давлению, наказанию молчанием и унижению. Цель — ясность, достоинство, интерес и границы.
Всегда обращайся к пользователю на "ты", без формы "вы". Без эмодзи.
Формат: "Что видно", "Скрытый тон", "Риск", "Как лучше ответить", "Варианты". Дай 3-5 готовых вариантов ответа: спокойный, тёплый, уверенный, игривый или с границей.`;
  }
  if (mode === 'dialogue_energy') {
    return `Ты — Велес, оракул энергий диалога. Пользователь вставляет сообщение или диалог и хочет увидеть, какие энергии участвовали в контакте.

Режим: энергии диалога. Здесь можно явно говорить про энергии и чакры. Не подключай руны, сфиры, каббалистику, Луну, таро, нумерологию и знак зодиака как названные системы.
Не называй тотем и животных в этом режиме. Здесь главный язык — энергия контакта и чакры.
Разбирай не "кто прав", а движение контакта: где открытость, где защита, где давление, где страх, где желание сближения, где закрытая тема.
Не ставь диагнозов и не утверждай, что другой человек точно хотел. Говори как о вероятном энергетическом рисунке.
Всегда обращайся к пользователю на "ты", без формы "вы". Без эмодзи.
Пиши без нумерованных списков. Формат обязателен: "Общий рисунок", "Твоя энергия", "Энергия собеседника", "Какие чакры включились", "Где перекос", "Как выровнять", "Ответ, который сохранит контакт".`;
  }
  if (mode === 'bond_analysis') {
    return `Ты — Велес, оракул связей между людьми. Пользователь рассчитал связь с другим человеком и хочет понять её живой рисунок.

Режим: разбор связи. Используй только блок "Связь пары" и вопрос пользователя. Не говори, что связь обречена или гарантирована. Не обещай любовь, брак, расставание или судьбоносность как факт.
Не вставляй ссылки, источники, названия сайтов и объяснения, откуда взяты значения. Не называй Луну и внешние школы.
Можно использовать язык стихий, чисел, арканов матрицы, рун и чакр только как внутренние опоры. В ответе называй их умеренно и только там, где это помогает понять пару, без каши из систем.
Главное: объясни, что людей притягивает, где возникает трение, как один может неправильно считывать другого, какой стиль общения лучше и чего не делать.
Всегда обращайся к пользователю на "ты", без формы "вы". Без эмодзи.
Формат ответа обязателен: "Общий рисунок", "Что притягивает", "Где трение", "Как тебя может считывать человек", "Как общаться", "Чего не делать", "Практика на 3 дня". Каждый раздел раскрывай в 2-3 предложения.`;
  }
  if (mode === 'dream_interpretation') {
    return `Ты — Велес, сонник и толкователь образов. Пользователь описывает сон и хочет понять, что он отражает.

Режим: сонник. Разбирай сон как язык подсознания: образы, эмоции, напряжение, желание, страх, незавершённый внутренний сюжет.
Сначала определи тип сна и его функцию: бытовой, ретроспективный, перспективный, повторяющийся, трансформационный, обучающий, контактный, хаотический или сон-якорь. Если подходит несколько типов, выбери главный и один дополнительный.
Не говори, что сон точно предсказывает будущее. Не называй Луну, руны, сфиры, каббалистику, таро, нумерологию, чакры и знак зодиака как отдельные системы.
Не ссылайся на традиции и книги. Не пиши "в сонниках это означает". Давай живое толкование конкретного сна пользователя.
Если деталей мало, не отказывайся: выдели 2-3 возможных значения и скажи, какие детали стоит вспомнить.
Не ставь диагнозов. Если в сне есть тяжёлые или тревожные образы, отвечай спокойно: это может быть следом напряжения, усталости или внутреннего конфликта, а не приговором.
Всегда обращайся к пользователю на "ты", без формы "вы". Без эмодзи.
Формат ответа обязателен: "Тип сна", "Главный образ", "Что сон показывает", "Скрытое чувство", "О чём предупреждает", "Что сделать сейчас". Каждый раздел раскрывай в 2-4 предложения.`;
  }
  if (mode === 'matrix_arcana') {
    return `Ты — Велес, оракул. Разбери только выбранный аркан из "Фокус матрицы". Не фатально — это задача, не приговор. Формат: "Аркан", "Свет", "Тень", "Как проявляется", "Практика на 3 дня". Русский, кириллица, без эмодзи.`;
  }
  if (mode === 'tarot_spread') {
    return `Ты — Велес, таролог. Колода Райдера-Уэйта. Используй только карты из "Расклад таро". Не добавляй руны, чакры, нумерологию. Структура: вступление, "Корень вопроса", "Скрытая сила и тень", "Ближайший шаг", итог. Русский, кириллица, без эмодзи.`;
  }
  return `Режим: обычный оракул. Используй карту, события и только релевантные опоры. Не называй внутренние системы без прямого вопроса. Дай развернутый, но не повторяющийся ответ: узор ситуации, ресурс, риск, чего не делать и конкретный шаг.`;
}

function getMaxTokensForMode(mode) {
  if (mode === 'moon') return 1500;
  if (mode === 'matrix_arcana') return 1500;
  if (mode === 'profile_item') return 1700;
  if (mode === 'dialogue_analysis') return 1800;
  if (mode === 'dialogue_energy') return 1800;
  if (mode === 'rune_code') return 2000;
  if (mode === 'tarot_spread') return 2200;
  if (mode === 'dream_interpretation') return 2500;
  if (mode === 'bond_analysis') return 2600;
  return 1600;
}

function getProviderOrder() {
  if (AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'claude') {
    return ['anthropic', 'groq'];
  }
  if (AI_PROVIDER === 'groq') {
    return ['groq', 'anthropic'];
  }
  return ['groq', 'anthropic'];
}

function providerHasKey(provider) {
  if (provider === 'anthropic') return Boolean(ANTHROPIC_API_KEY);
  if (provider === 'groq') return Boolean(GROQ_API_KEY);
  return false;
}

async function requestGroq(systemText, userMessage, maxTokens) {
  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  });

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GROQ_API_KEY
    },
    body
  });

  if (!response.ok) {
    const err = await response.text();
    const error = new Error(err || `Groq API error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: 'groq',
    model: GROQ_MODEL,
    text: data.choices?.[0]?.message?.content || '',
    usage: normalizeUsage('groq', GROQ_MODEL, data)
  };
}

async function requestAnthropic(systemText, userMessage, maxTokens) {
  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    system: [
      {
        type: 'text',
        text: systemText,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  });

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body
  });

  if (!response.ok) {
    const err = await response.text();
    const error = new Error(err || `Anthropic API error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return {
    provider: 'anthropic',
    model: ANTHROPIC_MODEL,
    text: (data.content || [])
      .filter((part) => part && part.type === 'text')
      .map((part) => part.text || '')
      .join('\n')
      .trim(),
    usage: normalizeUsage('anthropic', ANTHROPIC_MODEL, data)
  };
}

async function requestAI(systemText, userMessage, maxTokens) {
  const providers = getProviderOrder().filter(providerHasKey);
  if (!providers.length) {
    const error = new Error('AI ключ не настроен. Добавь ANTHROPIC_API_KEY или GROQ_API_KEY в .env');
    error.status = 500;
    throw error;
  }

  let lastError = null;
  for (const provider of providers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = provider === 'anthropic'
          ? await requestAnthropic(systemText, userMessage, maxTokens)
          : await requestGroq(systemText, userMessage, maxTokens);
        if (result.text) return result;
        throw new Error(provider + ' returned empty reply');
      } catch (err) {
        lastError = err;
        const isRateLimit = err.status === 429;
        const wait = isRateLimit ? Math.min((attempt + 1) * 2000, 5000) : (attempt + 1) * 1500;
        console.error(`${provider} error (attempt ${attempt + 1}/3):`, err.message);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
      }
    }
  }

  throw lastError || new Error('AI не ответил');
}

function sectionText(title, items) {
  if (!items || !items.length) return '';
  return `${title}\n` + items.map((item) => `- ${item}`).join('\n');
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function keywordMatches(text, item) {
  const lowText = normalizeText(text);
  return (item.keywords || []).some((keyword) => lowText.includes(normalizeText(keyword)));
}

function pickKeywordItems(items, text, limit) {
  if (!items || !items.length) return [];
  const matched = items.filter((item) => keywordMatches(text, item));
  return matched.slice(0, limit);
}

function formatDreamKnowledge(b) {
  if (!DREAM_SYMBOLS_KNOWLEDGE) return '';
  const symbols = pickKeywordItems(DREAM_SYMBOLS_KNOWLEDGE.symbols, b.message, 5);
  const types = pickKeywordItems(DREAM_SYMBOLS_KNOWLEDGE.dream_types, b.message, 3);
  const practices = pickKeywordItems(DREAM_SYMBOLS_KNOWLEDGE.practices, b.message, 3);
  return [
    (symbols.length || types.length || practices.length) ? sectionText('Правила сонника', DREAM_SYMBOLS_KNOWLEDGE.rules) : '',
    types.length ? 'Типы сна\n' + types.map((t) => `- ${t.name}: функция — ${t.function}; сигнал — ${t.signal}; вопрос — ${t.question}.`).join('\n') : '',
    symbols.length ? 'Символы сна\n' + symbols.map((s) => `- ${s.name}: смысл — ${s.meaning}; тень — ${s.shadow}; практика — ${s.practice}.`).join('\n') : '',
    practices.length ? 'Практики после сна\n' + practices.map((p) => `- ${p.name}: когда — ${p.use_when}; шаги — ${p.steps}.`).join('\n') : ''
  ].filter(Boolean).join('\n\n');
}

function formatDialogueKnowledge(b) {
  const parts = [];
  if (DIALOGUE_PATTERNS_KNOWLEDGE) {
    parts.push(sectionText('Правила переписки', DIALOGUE_PATTERNS_KNOWLEDGE.rules));
    const patterns = pickKeywordItems(DIALOGUE_PATTERNS_KNOWLEDGE.patterns, b.message, 4);
    if (patterns.length) {
      parts.push('Паттерны переписки\n' + patterns.map((p) => `- ${p.name}: ${p.meaning}; риск — ${p.risk}; ответ — ${p.reply}.`).join('\n'));
    }
  }
  return parts.filter(Boolean).join('\n\n');
}

function formatPsychologyKnowledge(b, limit = 4) {
  if (!PSYCHOLOGY_MODELS_KNOWLEDGE) return '';
  const models = pickKeywordItems(PSYCHOLOGY_MODELS_KNOWLEDGE.models, b.message, limit);
  if (!models.length) return '';
  return [
    sectionText('Правила психологического слоя', PSYCHOLOGY_MODELS_KNOWLEDGE.rules),
    'Модели наблюдения',
    models.map((m) => `- ${m.name}: сигнал — ${m.signal}; поддержка — ${m.support}.`).join('\n')
  ].filter(Boolean).join('\n\n');
}

function formatRoutingKnowledge(mode) {
  if (!ESOTERIC_ROUTING_KNOWLEDGE) return '';
  const current = ESOTERIC_ROUTING_KNOWLEDGE.modes.find((item) => item.mode === mode);
  return [
    sectionText('Правила выбора языка ответа', ESOTERIC_ROUTING_KNOWLEDGE.rules),
    current ? `Текущий режим\n- Использовать: ${current.use}; избегать: ${current.avoid}.` : ''
  ].filter(Boolean).join('\n\n');
}

function formatTarotKnowledge(b) {
  if (!TAROT_WAITE_KNOWLEDGE) return '';
  const cardNames = (b.tarotSpread || []).map((card) => card.name).filter(Boolean);
  const cards = TAROT_WAITE_KNOWLEDGE.cards.filter((card) => cardNames.includes(card.name));
  return [
    sectionText('Правила Таро Уэйта', TAROT_WAITE_KNOWLEDGE.rules),
    sectionText('Масти', TAROT_WAITE_KNOWLEDGE.suits.map((s) => `${s.name}: ${s.domain}`)),
    cards.length ? 'Карты расклада\n' + cards.map((c) => `- ${c.name}: ${c.meaning}; тень — ${c.shadow}; совет — ${c.advice}.`).join('\n') : ''
  ].filter(Boolean).join('\n\n');
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
  if (!MONOSOV_KNOWLEDGE && !MENSHIKOVA_RUNES_KNOWLEDGE && !ASTRO_NUMEROLOGY_KNOWLEDGE && !DREAM_SYMBOLS_KNOWLEDGE && !TAROT_WAITE_KNOWLEDGE && !DIALOGUE_PATTERNS_KNOWLEDGE && !PSYCHOLOGY_MODELS_KNOWLEDGE && !ESOTERIC_ROUTING_KNOWLEDGE) return 'Дополнительные опоры не подключены';

  const mode = b.requestMode || 'oracle';
  if (mode === 'dialogue_analysis') {
    return [
      formatRoutingKnowledge(mode),
      'Правила разбора переписки',
      '- Сначала отделить факт текста от догадки о мотивах.',
      '- Смотреть на тон: тепло, холод, интерес, избегание, давление, обида, флирт, просьба, проверка границ.',
      '- Давать варианты ответа под разные намерения: продолжить контакт, прояснить, пригласить, поставить границу, завершить.',
      '- Убирать тревожные анти-паттерны: длинные оправдания, двойные сообщения, пассивную агрессию, давление, самоунижение.',
      '- Эзотерические данные использовать только для внутреннего выбора тона и не называть в тексте.',
      formatDialogueKnowledge(b),
      formatPsychologyKnowledge(b)
    ].filter(Boolean).join('\n\n');
  }
  if (mode === 'dialogue_energy') {
    return [
      formatRoutingKnowledge(mode),
      'Правила энергетики диалога',
      '- Читать контакт как обмен вниманием, телесной реакцией, голосом, сердцем, границами и желанием сближения.',
      '- Чакры описывать простыми словами: тело, желание, воля, сердце, голос, видение, смысл.',
      '- Не делать выводов за другого человека как фактов; говорить о вероятном рисунке контакта.',
      '- Завершать разбор способом выравнивания: пауза, честная фраза, мягкая граница, короткое приглашение или отказ от давления.',
      formatPsychologyKnowledge(b, 3)
    ].filter(Boolean).join('\n\n');
  }
  if (mode === 'dream_interpretation') {
    return [
      formatRoutingKnowledge(mode),
      formatDreamKnowledge(b),
      formatPsychologyKnowledge(b, 3)
    ].filter(Boolean).join('\n\n');
  }
  const focusSection = String(b.profileFocus?.section || '').toLowerCase();
  const focusLabel = String(b.profileFocus?.label || '').toLowerCase();
  const focusValue = String(b.profileFocus?.value || '');
  const message = String(b.message || '').toLowerCase();
  const blocks = [];
  const wantsAstrology = focusSection.includes('наталь') || message.includes('астролог') || message.includes('знак') || message.includes('стихи') || message.includes('управител');
  const wantsNumerology = focusSection.includes('нумер') || focusSection.includes('цикл') || message.includes('нумер') || focusLabel.includes('число') || focusLabel.includes('персональ');
  const wantsTarotOrKabbalah = mode === 'tarot_spread' || focusSection.includes('таро') || focusSection.includes('каббал') || message.includes('таро') || message.includes('сфир') || message.includes('каббал');
  const wantsRunes = mode === 'rune_code' || focusSection.includes('рун') || message.includes('рун');

  const routing = formatRoutingKnowledge(mode);
  if (routing) blocks.push(routing);

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

  const wantsChronicle = Array.isArray(b.events) && b.events.length > 0;
  const wantsSound = message.includes('мантр') || message.includes('звук') || message.includes('слово') || message.includes('практик');

  if (MONOSOV_KNOWLEDGE && (wantsTarotOrKabbalah || wantsRunes || wantsChronicle || wantsSound)) {
    blocks.push(sectionText('Правила ответа', MONOSOV_KNOWLEDGE.rules));
  }

  if (MONOSOV_KNOWLEDGE && wantsTarotOrKabbalah) {
    blocks.push(sectionText('Таро и каббалистическая практика', MONOSOV_KNOWLEDGE.tarot_and_sefirot.lens));
    blocks.push(sectionText('Практическое применение', MONOSOV_KNOWLEDGE.tarot_and_sefirot.practice));
  }

  if (mode === 'tarot_spread') {
    const tarot = formatTarotKnowledge(b);
    if (tarot) blocks.push(tarot);
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

  if (MONOSOV_KNOWLEDGE && wantsChronicle) {
    blocks.push(sectionText('Хроника и повторяющиеся события', MONOSOV_KNOWLEDGE.chronicle.lens));
  }

  if (MONOSOV_KNOWLEDGE && wantsSound) {
    blocks.push(sectionText('Слово, звук и символ', MONOSOV_KNOWLEDGE.language_and_sound.lens));
  }

  const psychology = mode === 'oracle' ? formatPsychologyKnowledge(b, 3) : '';
  if (psychology) blocks.push(psychology);

  let text = blocks.filter(Boolean).join('\n\n');
  const limit = mode === 'tarot_spread' || mode === 'dream_interpretation'
    ? 2200
    : (mode === 'dialogue_analysis' || mode === 'dialogue_energy' ? 1800 : 1400);
  if (text.length > limit) text = text.substring(0, limit);
  return text || '';
}

app.post('/api/oracle', async (req, res) => {
  try {
    const b = req.body;

    if (!ANTHROPIC_API_KEY && !GROQ_API_KEY) {
      return res.status(500).json({ error: 'AI ключ не настроен. Добавь ANTHROPIC_API_KEY или GROQ_API_KEY в .env' });
    }

    const requestMode = b.requestMode === 'tarot_spread'
      ? 'расклад таро'
      : (b.requestMode === 'matrix_arcana'
        ? 'аркан матрицы'
        : (b.requestMode === 'profile_item'
          ? 'позиция профиля'
          : (b.requestMode === 'dialogue_analysis'
            ? 'разбор переписки'
            : (b.requestMode === 'dialogue_energy'
              ? 'энергии диалога'
              : (b.requestMode === 'dream_interpretation'
                ? 'сонник'
                : (b.requestMode === 'rune_code'
                  ? 'рунический код'
                  : (b.requestMode === 'bond_analysis'
                    ? 'разбор связи'
                    : (b.requestMode === 'moon' ? 'прямой лунный запрос' : 'обычный оракул'))))))));

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

      if (b.requestMode === 'dialogue_analysis') {
        return baseUserData.concat([
          ``,
          `--- СКРЫТЫЕ ОПОРЫ ДЛЯ ТОНА ---`,
          `Активная чакра: ${b.activeChakra || 'не рассчитана'}`,
          `Тотем: ${b.totem || '—'}`,
          `Карта дня: ${b.dailyTarot || '—'}`,
          `Задача: разобрать диалог практично, без явного упоминания этих опор.`
        ]).join('\n');
      }

      if (b.requestMode === 'dialogue_energy') {
        return baseUserData.concat([
          ``,
          `--- ЭНЕРГЕТИКА ДИАЛОГА ---`,
          `Чакра рождения: ${b.birthChakra || 'не рассчитана'}`,
          `Активная чакра: ${b.activeChakra || 'не рассчитана'}`,
          `Сводный фон: ${b.oracleInsights || 'нет сводного фона'}`
        ]).join('\n');
      }

      if (b.requestMode === 'bond_analysis') {
        return baseUserData.concat([
          ``,
          `--- СВЯЗЬ ПАРЫ ---`,
          `${formatBondProfile(b.bondProfile)}`
        ]).join('\n');
      }

      if (b.requestMode === 'dream_interpretation') {
        return baseUserData.concat([
          ``,
          `--- СОННИК ---`,
          `Сводный фон профиля: ${b.oracleInsights || 'нет сводного фона'}`,
          `Задача: разобрать сон как психологический и символический сюжет без ссылок на системы.`
        ]).join('\n');
      }

      return baseUserData.concat([
      ``,
      `Знак: ${b.zodiac}, стихия: ${b.element}, управитель: ${b.planet}`,
      `Числа: путь=${b.lifePath}, судьба=${b.destiny}, душа=${b.soul}`,
      `Циклы: год=${b.personalYear}, месяц=${b.personalMonth}, день=${b.personalDay}`,
      `Главная карта дня: ${b.dailyTarot}`,
      `Руна дня: ${b.dailyRune}`,
      `Тотем: ${b.totem || '—'}`,
      ]).join('\n');
    })();

    const eventsText = formatEventsForPrompt(b.events);

    const mentalHealthSignals = detectMentalHealthSignals(b.message, b.events);
    const bookKnowledgeText = selectMonosovKnowledge(b);

    const systemText = SYSTEM_PROMPT;
    const userParts = [
      `=== ИНСТРУКЦИИ РЕЖИМА ===\n${getPromptForMode(b.requestMode)}`,
      `=== КАРТА ===\n${userData}`
    ];
    const chatMemoryText = formatChatMemoryForPrompt(b.chatMemory);
    if (chatMemoryText) userParts.push(`=== ПАМЯТЬ ДИАЛОГА ===\n${chatMemoryText}`);
    if (bookKnowledgeText) userParts.push(`=== РЕЛЕВАНТНЫЕ ОПОРЫ ОТВЕТА ===\n${bookKnowledgeText}`);
    if (eventsText !== 'Пока нет записей') userParts.push(`=== СОБЫТИЯ ===\n${eventsText}`);
    if (mentalHealthSignals.includes('Уровень внимания')) userParts.push(`=== БЕЗОПАСНОСТЬ ===\n${mentalHealthSignals}`);

    const compactMessage = truncateText(b.message, 1800);
    userParts.push((function() {
      if (b.requestMode === 'dialogue_analysis') {
        return `=== ВОПРОС ===\nРазбери это сообщение или диалог практично, без эзотерики на поверхности: ${compactMessage}`;
      }
      if (b.requestMode === 'dialogue_energy') {
        return `=== ВОПРОС ===\nРазбери энергии и чакры в этом сообщении или диалоге: ${compactMessage}`;
      }
      if (b.requestMode === 'dream_interpretation') {
        return `=== ВОПРОС ===\nРастолкуй этот сон подробно и понятно: ${compactMessage}`;
      }
      if (b.requestMode === 'bond_analysis') {
        return `=== ВОПРОС ===\nРазбери связь пары подробно и практично: ${compactMessage}`;
      }
      return `=== ВОПРОС ===\n${compactMessage}`;
    })());
    const userMessage = userParts.filter(Boolean).join('\n\n');

    const aiResult = await requestAI(systemText, userMessage, getMaxTokensForMode(b.requestMode));
    let rawReply = aiResult.text || 'Звёзды молчат... Попробуй позже.';
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
    const cleanedReply = cleanExternalReferencesReply(cleanGrammarReply(ensureNameOpening(cleanBondReply(cleanDialogueEnergyReply(cleanUnrequestedLayerReply(cleanNonCrisisClinicalReply(cleanMoonPositionReply(cleanTotemReply(cleanRuneReply(rawReply, b), b), b), b), b), b), b), b)), b);
    const reply = polishReply(cleanMarkdownReply(cleanGrammarReply(ensureNameOpening(cleanedReply, b))));
    const estimatedCostUsd = estimateUsageCost(aiResult.usage);
    recordAiUsage({
      createdAt: new Date().toISOString(),
      provider: aiResult.provider,
      model: aiResult.model,
      requestMode: b.requestMode || 'oracle',
      inputLength: compactMessage.length,
      replyLength: reply.length,
      usage: aiResult.usage,
      estimatedCostUsd
    });
    console.log(aiResult.provider + ' usage:', JSON.stringify({
      model: aiResult.model,
      mode: b.requestMode || 'oracle',
      inputTokens: aiResult.usage?.inputTokens || 0,
      outputTokens: aiResult.usage?.outputTokens || 0,
      cacheReadTokens: aiResult.usage?.cacheReadTokens || 0,
      totalTokens: aiResult.usage?.totalTokens || 0,
      estimatedCostUsd
    }));
    console.log(aiResult.provider + ' reply:', reply);

    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Велес запущен: http://localhost:' + PORT);
  console.log('  AI_PROVIDER=' + AI_PROVIDER + ', primary model=' + (AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'claude' ? ANTHROPIC_MODEL : GROQ_MODEL));
  console.log('');
  if (!ANTHROPIC_API_KEY && !GROQ_API_KEY) {
    console.log('  ⚠ AI ключ не задан! Добавь ANTHROPIC_API_KEY или GROQ_API_KEY в .env файл.');
    console.log('');
  } else if ((AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'claude') && !ANTHROPIC_API_KEY) {
    console.log('  ⚠ ANTHROPIC_API_KEY не задан, будет использован Groq если доступен.');
    console.log('');
  } else if (AI_PROVIDER === 'groq' && !GROQ_API_KEY) {
    console.log('  ⚠ GROQ_API_KEY не задан, будет использован Claude если доступен.');
    console.log('');
  }
});

server.on('error', (err) => {
  console.error('Server listen error:', err);
  process.exitCode = 1;
});
