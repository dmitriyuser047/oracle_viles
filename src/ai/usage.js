const fs = require('fs');
const config = require('../config');

const ANTHROPIC_PRICES_PER_MTOK = [
  { pattern: /haiku/i, input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.10 },
  { pattern: /sonnet/i, input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.30 },
  { pattern: /opus/i, input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.50 }
];

function ensureDataDir() {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
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
    fs.appendFileSync(config.AI_USAGE_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
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
  if (!config.USAGE_STATS_TOKEN) return false;
  return req.get('x-usage-token') === config.USAGE_STATS_TOKEN || req.query.token === config.USAGE_STATS_TOKEN;
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

function usageStatsHandler(req, res) {
  if (!canReadUsageStats(req)) {
    return res.status(403).json({ error: 'Статистика доступна только локально на сервере или по токену.' });
  }

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const monthKey = now.toISOString().slice(0, 7);
  const entries = readJsonLines(config.AI_USAGE_LOG_PATH);
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
}

module.exports = {
  normalizeUsage,
  estimateUsageCost,
  recordAiUsage,
  usageStatsHandler
};
