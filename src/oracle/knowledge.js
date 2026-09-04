const fs = require('fs');
const path = require('path');
const config = require('../config');

function loadKnowledgeFile(fileName) {
  try {
    return JSON.parse(fs.readFileSync(path.join(config.KNOWLEDGE_DIR, fileName), 'utf8'));
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

module.exports = {
  selectMonosovKnowledge
};
