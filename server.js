const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { requestAI, primaryModelName } = require('./src/ai/providers');
const { estimateUsageCost, recordAiUsage, usageStatsHandler } = require('./src/ai/usage');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(config.STATIC_DIR));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'oracle-viles' });
});

app.get('/api/usage-stats', usageStatsHandler);


const { SYSTEM_PROMPT, getPromptForMode, getMaxTokensForMode } = require('./src/oracle/prompts');
const { polishReply, cleanGrammarReply, cleanExternalReferencesReply, cleanRuneReply, cleanTotemReply, cleanMoonPositionReply, cleanUnrequestedLayerReply, cleanDialogueEnergyReply, cleanBondReply, ensureNameOpening, cleanMarkdownReply } = require('./src/oracle/sanitizers');
const { truncateText, formatEventsForPrompt, formatChatMemoryForPrompt } = require('./src/oracle/prompt-utils');
const { selectMonosovKnowledge } = require('./src/oracle/knowledge');
const { cleanNonCrisisClinicalReply, detectMentalHealthSignals } = require('./src/oracle/safety');

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

app.post('/api/oracle', async (req, res) => {
  try {
    const b = req.body;

    if (!config.ANTHROPIC_API_KEY && !config.GROQ_API_KEY) {
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

const PORT = config.PORT;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Велес запущен: http://localhost:' + PORT);
  console.log('  AI_PROVIDER=' + config.AI_PROVIDER + ', primary model=' + primaryModelName());
  console.log('');
  if (!config.ANTHROPIC_API_KEY && !config.GROQ_API_KEY) {
    console.log('  ⚠ AI ключ не задан! Добавь ANTHROPIC_API_KEY или GROQ_API_KEY в .env файл.');
    console.log('');
  } else if ((config.AI_PROVIDER === 'anthropic' || config.AI_PROVIDER === 'claude') && !config.ANTHROPIC_API_KEY) {
    console.log('  ⚠ ANTHROPIC_API_KEY не задан, будет использован Groq если доступен.');
    console.log('');
  } else if (config.AI_PROVIDER === 'groq' && !config.GROQ_API_KEY) {
    console.log('  ⚠ GROQ_API_KEY не задан, будет использован Claude если доступен.');
    console.log('');
  }
});

server.on('error', (err) => {
  console.error('Server listen error:', err);
  process.exitCode = 1;
});
