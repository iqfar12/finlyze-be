import { Hono } from 'hono';
import { callAI } from '../services/ai.js';
import { repairJSON } from '../services/json-repair.js';
import { buildAnalysisPrompt } from '../prompts/index.js';
import type { AnalyzeRequest } from '../types.js';

const analyze = new Hono();

analyze.post('/', async (c) => {
  const body = await c.req.json<AnalyzeRequest>();

  // ── Validate input ────────────────────────────────────────────
  if (!body.fileText || typeof body.fileText !== 'string') {
    return c.json({ error: 'Bad Request', message: 'fileText is required.' }, 400);
  }

  // Cap input size (prevent abuse with massive payloads)
  if (body.fileText.length > 50_000) {
    return c.json(
      { error: 'Bad Request', message: 'fileText exceeds maximum length of 50,000 characters.' },
      400
    );
  }

  const context = {
    mrr: body.context?.mrr || '',
    customers: body.context?.customers || '',
    industry: body.context?.industry || '',
    stage: body.context?.stage || '',
  };

  try {
    const { system, userMessage } = buildAnalysisPrompt(body.fileText, context);

    const raw = await callAI({
      messages: [{ role: 'user', content: userMessage }],
      system,
      maxTokens: 4000,
      jsonMode: true,
      provider: body.provider,
    });

    const parsed = repairJSON(raw);

    return c.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('[analyze] Error:', err.message);
    return c.json(
      { error: 'Analysis Failed', message: err.message || 'Unknown error' },
      502
    );
  }
});

export default analyze;
