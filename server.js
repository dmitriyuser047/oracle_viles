const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { primaryModelName } = require('./src/ai/providers');
const { usageStatsHandler } = require('./src/ai/usage');
const oracleRouter = require('./src/routes/oracle');
const authRouter = require('./src/routes/auth-routes');
const userDataRouter = require('./src/routes/user-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(config.STATIC_DIR));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'oracle-viles' });
});

app.get('/api/usage-stats', usageStatsHandler);
app.use(authRouter);
app.use(userDataRouter);
app.use(oracleRouter);

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
