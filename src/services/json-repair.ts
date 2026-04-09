/**
 * Repair truncated JSON from AI responses.
 * Strips markdown fences, balances braces/brackets, and parses.
 */
export function repairJSON(raw: string): Record<string, any> {
  let s = raw.replace(/```json|```/g, '').trim();

  // Remove trailing incomplete key-value pair
  const lastBrace = s.lastIndexOf('}');
  const lastBracket = s.lastIndexOf(']');
  if (!s.endsWith('}') && !s.endsWith(']')) {
    const cut = Math.max(lastBrace, lastBracket);
    if (cut > 50) s = s.substring(0, cut + 1);
  }

  // Balance braces and brackets
  let opens = 0;
  let arrs = 0;
  for (const c of s) {
    if (c === '{') opens++;
    else if (c === '}') opens--;
    else if (c === '[') arrs++;
    else if (c === ']') arrs--;
  }
  while (arrs > 0) {
    s += ']';
    arrs--;
  }
  while (opens > 0) {
    s += '}';
    opens--;
  }

  return JSON.parse(s);
}
