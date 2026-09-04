const { getPromptForMode, getDepthInstruction, getToneInstruction } = require('./prompts');
const { truncateText, formatEventsForPrompt, formatChatMemoryForPrompt } = require('./prompt-utils');
const { selectMonosovKnowledge } = require('./knowledge');
const { detectMentalHealthSignals } = require('./safety');
const {
  formatTarotSpread,
  formatMatrixFocus,
  formatProfileFocus,
  formatBondProfile,
  formatRuneCode
} = require('./formatters');

function getRequestModeLabel(mode) {
  return mode === 'tarot_spread'
    ? 'расклад таро'
    : (mode === 'matrix_arcana'
      ? 'аркан матрицы'
      : (mode === 'profile_item'
        ? 'позиция профиля'
        : (mode === 'dialogue_analysis'
          ? 'разбор переписки'
          : (mode === 'dialogue_energy'
            ? 'энергии диалога'
            : (mode === 'dream_interpretation'
              ? 'сонник'
              : (mode === 'rune_code'
                ? 'рунический код'
                : (mode === 'bond_analysis'
                  ? 'разбор связи'
                  : (mode === 'moon' ? 'прямой лунный запрос' : 'обычный оракул'))))))));
}

function buildUserData(b) {
  const baseUserData = [
    `Имя: ${b.userName}`,
    `Дата рождения: ${b.birthDate}`,
    `Сегодня: ${b.today}`,
    `Режим запроса: ${getRequestModeLabel(b.requestMode)}`
  ];

  if (b.requestMode === 'profile_item') {
    return baseUserData.concat(['', '--- ФОКУС ПРОФИЛЯ ---', formatProfileFocus(b.profileFocus)]).join('\n');
  }
  if (b.requestMode === 'matrix_arcana') {
    return baseUserData.concat(['', '--- ФОКУС МАТРИЦЫ ---', formatMatrixFocus(b.matrixFocus)]).join('\n');
  }
  if (b.requestMode === 'tarot_spread') {
    return baseUserData.concat(['', '--- РАСКЛАД ТАРО ---', formatTarotSpread(b.tarotSpread)]).join('\n');
  }
  if (b.requestMode === 'rune_code') {
    return baseUserData.concat(['', '--- РУНИЧЕСКИЙ КОД ---', formatRuneCode(b.runeCode)]).join('\n');
  }
  if (b.requestMode === 'moon') {
    return baseUserData.concat([
      '',
      '--- ЛУНА ПО ПРЯМОМУ ЗАПРОСУ ---',
      `Луна: ${b.moonPhase || 'не рассчитана'}`,
      `Управитель дня: ${b.dayRuler || 'не рассчитан'}`
    ]).join('\n');
  }
  if (b.requestMode === 'dialogue_analysis') {
    return baseUserData.concat([
      '',
      '--- СКРЫТЫЕ ОПОРЫ ДЛЯ ТОНА ---',
      `Активная чакра: ${b.activeChakra || 'не рассчитана'}`,
      `Тотем: ${b.totem || '—'}`,
      `Карта дня: ${b.dailyTarot || '—'}`,
      'Задача: разобрать диалог практично, без явного упоминания этих опор.'
    ]).join('\n');
  }
  if (b.requestMode === 'dialogue_energy') {
    return baseUserData.concat([
      '',
      '--- ЭНЕРГЕТИКА ДИАЛОГА ---',
      `Чакра рождения: ${b.birthChakra || 'не рассчитана'}`,
      `Активная чакра: ${b.activeChakra || 'не рассчитана'}`,
      `Сводный фон: ${b.oracleInsights || 'нет сводного фона'}`
    ]).join('\n');
  }
  if (b.requestMode === 'bond_analysis') {
    return baseUserData.concat(['', '--- СВЯЗЬ ПАРЫ ---', formatBondProfile(b.bondProfile)]).join('\n');
  }
  if (b.requestMode === 'dream_interpretation') {
    return baseUserData.concat([
      '',
      '--- СОННИК ---',
      `Сводный фон профиля: ${b.oracleInsights || 'нет сводного фона'}`,
      'Задача: разобрать сон как психологический и символический сюжет без ссылок на системы.'
    ]).join('\n');
  }

  return baseUserData.concat([
    '',
    `Знак: ${b.zodiac}, стихия: ${b.element}, управитель: ${b.planet}`,
    `Числа: путь=${b.lifePath}, судьба=${b.destiny}, душа=${b.soul}`,
    `Циклы: год=${b.personalYear}, месяц=${b.personalMonth}, день=${b.personalDay}`,
    `Главная карта дня: ${b.dailyTarot}`,
    `Руна дня: ${b.dailyRune}`,
    `Тотем: ${b.totem || '—'}`
  ]).join('\n');
}

function buildQuestionBlock(b, compactMessage) {
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
}

function buildOraclePayload(b) {
  const eventsText = formatEventsForPrompt(b.events);
  const mentalHealthSignals = detectMentalHealthSignals(b.message, b.events);
  const bookKnowledgeText = selectMonosovKnowledge(b);
  const compactMessage = truncateText(b.message, 1800);

  const modePrompt = getPromptForMode(b.requestMode) + getDepthInstruction(b.depth) + getToneInstruction(b.tone);

  const userParts = [
    `=== ИНСТРУКЦИИ РЕЖИМА ===\n${modePrompt}`,
    `=== КАРТА ===\n${buildUserData(b)}`
  ];

  const chatMemoryText = formatChatMemoryForPrompt(b.chatMemory);
  if (chatMemoryText) userParts.push(`=== ПАМЯТЬ ДИАЛОГА ===\n${chatMemoryText}`);
  if (bookKnowledgeText) userParts.push(`=== РЕЛЕВАНТНЫЕ ОПОРЫ ОТВЕТА ===\n${bookKnowledgeText}`);
  if (eventsText !== 'Пока нет записей') userParts.push(`=== СОБЫТИЯ ===\n${eventsText}`);
  if (mentalHealthSignals.includes('Уровень внимания')) userParts.push(`=== БЕЗОПАСНОСТЬ ===\n${mentalHealthSignals}`);

  userParts.push(buildQuestionBlock(b, compactMessage));

  return {
    compactMessage,
    userMessage: userParts.filter(Boolean).join('\n\n')
  };
}

module.exports = {
  buildOraclePayload
};
