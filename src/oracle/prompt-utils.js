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

module.exports = {
  truncateText,
  formatEventsForPrompt,
  formatChatMemoryForPrompt
};
