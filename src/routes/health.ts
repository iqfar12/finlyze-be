import { Hono } from 'hono';
import { getAvailableProviders } from '../services/ai.js';
import { env } from '../config.js';

const health = new Hono();

health.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    defaultProvider: env.defaultProvider,
    availableProviders: getAvailableProviders(),
    rateLimits: {
      analyze: { max: env.rateLimitAnalyze.max, windowMs: env.rateLimitAnalyze.windowMs },
      chat: { max: env.rateLimitChat.max, windowMs: env.rateLimitChat.windowMs },
      global: { max: env.rateLimitGlobal.max, windowMs: env.rateLimitGlobal.windowMs },
    },
  });
});

export default health;
