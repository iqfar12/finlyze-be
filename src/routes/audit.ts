import { Hono } from 'hono';
import { callAI } from '../services/ai.js';
import { repairJSON } from '../services/json-repair.js';
import { buildAuditPrompt } from '../prompts/index.js';
import { chunkText } from '../services/chunker.js';
import { retrieveTopK, AUDIT_QUERIES } from '../services/retriever.js';
import type { AuditRequest, AuditRetrievedContext } from '../types.js';

const audit = new Hono();

audit.post('/', async (c) => {
  const body = await c.req.json<AuditRequest>();

  if (!body.bankStatementText || typeof body.bankStatementText !== 'string') {
    return c.json({ error: 'Bad Request', message: 'bankStatementText is required.' }, 400);
  }

  if (!body.financialReportText || typeof body.financialReportText !== 'string') {
    return c.json({ error: 'Bad Request', message: 'financialReportText is required.' }, 400);
  }

  if (body.bankStatementText.length > 50_000) {
    return c.json({ error: 'Bad Request', message: 'bankStatementText exceeds 50,000 characters.' }, 400);
  }

  if (body.financialReportText.length > 50_000) {
    return c.json({ error: 'Bad Request', message: 'financialReportText exceeds 50,000 characters.' }, 400);
  }

  const period = body.period?.trim() || 'Tidak diketahui';

  try {
    // ── 1. Chunk both documents ───────────────────────────────────────────────
    const bankChunks = chunkText(body.bankStatementText, 'bank_statement');
    const reportChunks = chunkText(body.financialReportText, 'financial_report');

    // ── 2. Retrieve top-K chunks per audit dimension ──────────────────────────
    const ctx: AuditRetrievedContext = {
      revenue: {
        reportChunks: retrieveTopK(reportChunks, AUDIT_QUERIES.revenue, 3),
        bankChunks: retrieveTopK(bankChunks, AUDIT_QUERIES.revenue, 3),
      },
      expense: {
        reportChunks: retrieveTopK(reportChunks, AUDIT_QUERIES.expense, 3),
        bankChunks: retrieveTopK(bankChunks, AUDIT_QUERIES.expense, 3),
      },
      balance: {
        reportChunks: retrieveTopK(reportChunks, AUDIT_QUERIES.balance, 3),
        bankChunks: retrieveTopK(bankChunks, AUDIT_QUERIES.balance, 3),
      },
      suspicious: {
        // More chunks for anomaly detection to surface edge cases
        bankChunks: retrieveTopK(bankChunks, AUDIT_QUERIES.suspicious, 5),
      },
    };

    // ── 3. Build focused prompt from retrieved context ────────────────────────
    const { system, userMessage } = buildAuditPrompt(ctx, period);

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
    console.error('[audit] Error:', err.message);
    return c.json(
      { error: 'Audit Failed', message: err.message || 'Unknown error' },
      502
    );
  }
});

export default audit;
