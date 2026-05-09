import type { TextChunk } from '../types.js';

// Audit dimensions: queries are bilingual (ID + EN) to match mixed-language documents
export const AUDIT_QUERIES = {
  revenue:
    'revenue pendapatan penjualan income kredit masuk total omzet sales receipt',
  expense:
    'expense biaya pengeluaran debit keluar cost operasional beban pembelian',
  balance:
    'saldo balance closing akhir total kas cash modal ekuitas ending',
  suspicious:
    'transfer unknown vendor cash deposit large unusual anomali tanpa referensi invoice',
} as const;

export type AuditDimension = keyof typeof AUDIT_QUERIES;

// ── BM25-lite (no external deps) ─────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function bm25Score(
  queryTerms: string[],
  doc: string,
  avgDocLen: number,
  k1 = 1.5,
  b = 0.75
): number {
  const docTerms = tokenize(doc);
  if (docTerms.length === 0) return 0;

  const tf = new Map<string, number>();
  for (const term of docTerms) {
    tf.set(term, (tf.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const term of queryTerms) {
    const termFreq = tf.get(term) ?? 0;
    if (termFreq === 0) continue;
    const normalizedTf =
      (termFreq * (k1 + 1)) /
      (termFreq + k1 * (1 - b + b * (docTerms.length / avgDocLen)));
    score += normalizedTf;
  }

  return score;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the top-K chunks from `chunks` most relevant to `query`.
 * Uses BM25-lite scoring with corpus-level average document length.
 */
export function retrieveTopK(
  chunks: TextChunk[],
  query: string,
  topK: number
): TextChunk[] {
  if (chunks.length === 0) return [];

  const queryTerms = tokenize(query);

  // Compute avg doc length across this set for BM25 normalization
  const avgDocLen =
    chunks.reduce((sum, c) => sum + tokenize(c.text).length, 0) / chunks.length;

  return chunks
    .map((chunk) => ({ chunk, score: bm25Score(queryTerms, chunk.text, avgDocLen) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}
