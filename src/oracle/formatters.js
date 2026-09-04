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

module.exports = {
  formatTarotSpread,
  formatMatrixFocus,
  formatProfileFocus,
  formatBondProfile,
  formatRuneCode
};
