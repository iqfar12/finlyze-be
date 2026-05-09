import type { TextChunk } from '../types.js';

/**
 * Splits text into overlapping character-window chunks.
 * Splits on line boundaries to avoid cutting mid-transaction.
 */
export function chunkText(
  text: string,
  source: TextChunk['source'],
  chunkSize = 800,
  overlap = 150
): TextChunk[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const chunks: TextChunk[] = [];
  let current = '';
  let index = 0;

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;

    if (candidate.length > chunkSize && current.length > 0) {
      chunks.push({ id: `${source}_${index}`, source, index, text: current.trim() });
      // Carry the tail of the previous chunk into the next for overlap
      const overlapStart = Math.max(0, current.length - overlap);
      current = `${current.slice(overlapStart)}\n${line}`;
      index++;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push({ id: `${source}_${index}`, source, index, text: current.trim() });
  }

  return chunks;
}
