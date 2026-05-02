import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { env } from './config.js';
import { createRateLimiter } from './middleware/rate-limiter.js';
import { authGuard } from './middleware/auth.js';
import analyzeRoute from './routes/analyze.js';
import chatRoute from './routes/chat.js';
import healthRoute from './routes/health.js';
import marketDataRoute from './routes/market-data.js';
import auditRoute from './routes/audit.js';

const app = new Hono();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: env.corsOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'x-api-key'],
    maxAge: 86400,
  })
);

// Global rate limiter (per IP, all endpoints)
app.use('*', createRateLimiter(env.rateLimitGlobal));

// ── Public routes ─────────────────────────────────────────────────────────────
app.route('/api/health', healthRoute);

// ── Protected routes (optional API key auth) ──────────────────────────────────
app.use('/api/*', authGuard);

// Per-endpoint rate limiters (stricter than global)
app.use('/api/analyze', createRateLimiter(env.rateLimitAnalyze));
app.use('/api/chat', createRateLimiter(env.rateLimitChat));
app.use('/api/market-data/*', createRateLimiter(env.rateLimitMarketData));
app.use('/api/audit', createRateLimiter(env.rateLimitAudit));

app.route('/api/analyze', analyzeRoute);
app.route('/api/chat', chatRoute);
app.route('/api/market-data', marketDataRoute);
app.route('/api/audit', auditRoute);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: `Route ${c.req.method} ${c.req.path} not found.` }, 404);
});

// ── Global error handler ──────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[global error]', err);
  return c.json(
    { error: 'Internal Server Error', message: env.nodeEnv === 'development' ? err.message : 'Something went wrong.' },
    500
  );
});

// ── Start server ──────────────────────────────────────────────────────────────
console.log(`
┌─────────────────────────────────────────────┐
│  🏦 BCA Analyzer API                        │
│  Port:      ${String(env.port).padEnd(31)}│
│  Env:       ${env.nodeEnv.padEnd(31)}│
│  Provider:  ${env.defaultProvider.padEnd(31)}│
│  CORS:      ${env.corsOrigins[0]?.padEnd(31) || ''.padEnd(31)}│
└─────────────────────────────────────────────┘
`);

serve({
  fetch: app.fetch,
  port: env.port,
});

export default app;
