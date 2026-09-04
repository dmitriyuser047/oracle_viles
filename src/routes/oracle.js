const express = require('express');
const config = require('../config');
const { requestAI } = require('../ai/providers');
const { estimateUsageCost, recordAiUsage } = require('../ai/usage');
const { SYSTEM_PROMPT, getMaxTokensForMode, getDepthInstruction } = require('../oracle/prompts');
const { buildOraclePayload } = require('../oracle/payload');
const { cleanOracleReply } = require('../oracle/reply-pipeline');
const { stmts } = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();

router.post('/api/oracle', async (req, res) => {
  try {
    const b = req.body;

    if (!config.ANTHROPIC_API_KEY && !config.GROQ_API_KEY) {
      return res.status(500).json({ error: 'AI ключ не настроен. Добавь ANTHROPIC_API_KEY или GROQ_API_KEY в .env' });
    }

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifyToken(authHeader.slice(7));
      if (payload) {
        userId = payload.uid;
        const user = stmts.findUserById.get(userId);
        if (user) {
          const todayCount = stmts.countTodayRequests.get(userId).cnt;
          if (todayCount >= user.daily_limit) {
            return res.status(429).json({
              error: 'Дневной лимит исчерпан (' + user.daily_limit + ' запросов). Завтра лимит обновится.',
              limit: user.daily_limit,
              used: todayCount
            });
          }
        }
      }
    }

    const payload = buildOraclePayload(b);
    const baseTokens = getMaxTokensForMode(b.requestMode);
    const depthMultiplier = b.depth === 'brief' ? 0.55 : (b.depth === 'deep' ? 1.5 : 1);
    const maxTokens = Math.round(baseTokens * depthMultiplier);
    const aiResult = await requestAI(SYSTEM_PROMPT, payload.userMessage, maxTokens);
    const reply = cleanOracleReply(aiResult.text, b);
    const estimatedCostUsd = estimateUsageCost(aiResult.usage);

    recordAiUsage({
      createdAt: new Date().toISOString(),
      provider: aiResult.provider,
      model: aiResult.model,
      requestMode: b.requestMode || 'oracle',
      inputLength: payload.compactMessage.length,
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

    if (userId) {
      stmts.logRequest.run(userId, b.requestMode || 'oracle');
    }

    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
