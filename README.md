# 🏦 BCA Analyzer API

Backend service for **Finlyze BCA** — proxies AI calls (Groq / Claude / Gemini) and adds rate limiting, auth, and input validation. Built with [Hono](https://hono.dev) + TypeScript.

## Architecture

```
┌──────────────┐       ┌───────────────────────────────────────────┐
│  React App   │──────▶│  Hono API Server                          │
│  (Vite)      │ POST  │                                           │
│              │       │  ┌─────────┐  ┌───────────┐  ┌─────────┐ │
│  - Upload    │       │  │  Auth   │─▶│  Rate     │─▶│ Routes  │ │
│  - Analyze   │       │  │  Guard  │  │  Limiter  │  │         │ │
│  - Chat      │       │  └─────────┘  └───────────┘  └────┬────┘ │
│              │       │                                    │      │
│              │◀──────│  ┌──────────────────────────────────┘      │
│              │ JSON  │  │  AI Service (unified)                   │
│              │       │  │  ├── Groq   (llama-3.3-70b)            │
│              │       │  │  ├── Claude (sonnet-4)                 │
│              │       │  │  └── Gemini (2.0-flash)                │
│              │       │  └────────────────────────────────────────│
└──────────────┘       └───────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env → add your API keys

# 3. Run dev server (hot-reload)
npm run dev

# 4. Build & start production
npm run build
npm start
```

The server starts at `http://localhost:3001` by default.

## API Endpoints

### `GET /api/health`
Health check — returns status, available providers, and rate limit config.

### `POST /api/analyze`
Run financial analysis on bank statement text.

```json
{
  "fileText": "<extracted bank statement text>",
  "context": {
    "mrr": "5000000",
    "customers": "2",
    "industry": "Freelancer",
    "stage": "Nabung rumah"
  },
  "provider": "groq"
}
```

**Response:** `{ "success": true, "data": { ... } }`

### `POST /api/chat`
Chat with the financial advisor AI.

```json
{
  "messages": [
    { "role": "user", "content": "Apakah saya siap ambil KPR?" }
  ],
  "analysisData": { "...analysis result from /api/analyze..." },
  "provider": "groq"
}
```

**Response:** `{ "success": true, "reply": "<html string>" }`

## Rate Limits

| Endpoint       | Default Limit   | Window   |
|--------------- |-----------------|----------|
| Global (all)   | 100 requests    | 1 hour   |
| `/api/analyze` | 10 requests     | 1 hour   |
| `/api/chat`    | 30 requests     | 1 hour   |

Rate limit headers are included in every response:
- `X-RateLimit-Limit` — max allowed
- `X-RateLimit-Remaining` — remaining in current window
- `X-RateLimit-Reset` — unix timestamp when window resets

## Auth (Optional)

Set `API_SECRET_KEY` in `.env` to require an `x-api-key` header from the frontend. If left empty, all requests are allowed (useful for development).

## Frontend Integration

Update your React app to call this backend instead of AI APIs directly:

```js
// Before (exposed API key in browser)
const raw = await callGrok([...], system, 4000, true);

// After (proxied through backend)
const res = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-secret-key',  // optional
  },
  body: JSON.stringify({ fileText, context }),
});
const { data } = await res.json();
```

## Project Structure

```
src/
├── index.ts              # App entry, middleware chain, server start
├── config.ts             # Env loader with type safety
├── types.ts              # Shared TypeScript interfaces
├── middleware/
│   ├── rate-limiter.ts   # In-memory sliding window rate limiter
│   └── auth.ts           # Optional x-api-key guard
├── routes/
│   ├── analyze.ts        # POST /api/analyze
│   ├── chat.ts           # POST /api/chat
│   └── health.ts         # GET  /api/health
├── services/
│   ├── ai.ts             # Unified AI provider (Groq/Claude/Gemini)
│   └── json-repair.ts    # Fix truncated JSON from AI responses
└── prompts/
    └── index.ts          # System/user prompts (server-side only)
```

## Production Notes

- Swap the in-memory rate limiter for **Redis** in production (e.g. `@hono-rate-limiter/redis`)
- Add request logging to a persistent store
- Consider deploying to Cloudflare Workers (change `@hono/node-server` to `hono/cloudflare-workers`)
- Add HTTPS termination via reverse proxy (nginx, Caddy)
