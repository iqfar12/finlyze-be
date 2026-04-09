import { Hono } from 'hono';
import { callAI } from '../services/ai.js';
import { buildChatSystemPrompt } from '../prompts/index.js';
import type { ChatRequest } from '../types.js';

const chat = new Hono();

chat.post('/', async (c) => {
  const body = await c.req.json<ChatRequest>();

  // ── Validate input ────────────────────────────────────────────
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: 'Bad Request', message: 'messages array is required.' }, 400);
  }

  if (!body.analysisData || typeof body.analysisData !== 'object') {
    return c.json({ error: 'Bad Request', message: 'analysisData is required.' }, 400);
  }

  // Cap conversation length (last 10 messages like frontend)
  const recentMessages = body.messages.slice(-10);

  // Validate message format
  for (const msg of recentMessages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      return c.json(
        { error: 'Bad Request', message: 'Each message must have role and content.' },
        400
      );
    }
    // Prevent absurdly long messages
    if (msg.content.length > 5_000) {
      return c.json(
        { error: 'Bad Request', message: 'Message content exceeds 5,000 character limit.' },
        400
      );
    }
  }

  try {
    const system = buildChatSystemPrompt(body.analysisData);

    const reply = await callAI({
      messages: recentMessages,
      system,
      maxTokens: 800,
      provider: body.provider,
    });

    return c.json({ success: true, reply });
  } catch (err: any) {
    console.error('[chat] Error:', err.message);
    return c.json(
      { error: 'Chat Failed', message: err.message || 'Unknown error' },
      502
    );
  }
});

export default chat;
