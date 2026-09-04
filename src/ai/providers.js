const config = require('../config');
const { normalizeUsage } = require('./usage');

function getProviderOrder() {
  if (config.AI_PROVIDER === 'anthropic' || config.AI_PROVIDER === 'claude') {
    return ['anthropic', 'groq'];
  }
  if (config.AI_PROVIDER === 'groq') {
    return ['groq', 'anthropic'];
  }
  return ['groq', 'anthropic'];
}

function providerHasKey(provider) {
  if (provider === 'anthropic') return Boolean(config.ANTHROPIC_API_KEY);
  if (provider === 'groq') return Boolean(config.GROQ_API_KEY);
  return false;
}

async function requestGroq(systemText, userMessage, maxTokens) {
  const body = JSON.stringify({
    model: config.GROQ_MODEL,
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  });

  const response = await fetch(config.GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.GROQ_API_KEY
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
    model: config.GROQ_MODEL,
    text: data.choices?.[0]?.message?.content || '',
    usage: normalizeUsage('groq', config.GROQ_MODEL, data)
  };
}

async function requestAnthropic(systemText, userMessage, maxTokens) {
  const body = JSON.stringify({
    model: config.ANTHROPIC_MODEL,
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

  const response = await fetch(config.ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.ANTHROPIC_API_KEY,
      'anthropic-version': config.ANTHROPIC_VERSION
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
    model: config.ANTHROPIC_MODEL,
    text: (data.content || [])
      .filter((part) => part && part.type === 'text')
      .map((part) => part.text || '')
      .join('\n')
      .trim(),
    usage: normalizeUsage('anthropic', config.ANTHROPIC_MODEL, data)
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

function primaryModelName() {
  return config.AI_PROVIDER === 'anthropic' || config.AI_PROVIDER === 'claude'
    ? config.ANTHROPIC_MODEL
    : config.GROQ_MODEL;
}

module.exports = {
  requestAI,
  primaryModelName
};
