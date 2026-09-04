const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const envPath = path.join(ROOT_DIR, '.env');

if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
    var match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && match[1]) process.env[match[1].trim()] = match[2].trim();
  });
}

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';

module.exports = {
  ROOT_DIR,
  STATIC_DIR: ROOT_DIR,
  KNOWLEDGE_DIR: path.join(ROOT_DIR, 'knowledge'),
  DATA_DIR: path.join(ROOT_DIR, 'data'),
  AI_USAGE_LOG_PATH: process.env.AI_USAGE_LOG_PATH || path.join(ROOT_DIR, 'data', 'ai-usage.jsonl'),
  USAGE_STATS_TOKEN: process.env.USAGE_STATS_TOKEN || '',
  PORT: process.env.PORT || 3000,
  AI_PROVIDER,
  GROQ_API_KEY,
  ANTHROPIC_API_KEY,
  GROQ_URL,
  ANTHROPIC_URL,
  GROQ_MODEL,
  ANTHROPIC_MODEL,
  ANTHROPIC_VERSION
};
