import { env } from '../config.js';
import type { AICallOptions, Provider, ChatMessage } from '../types.js';

// ── Groq (OpenAI-compatible) ──────────────────────────────────────────────────
async function callGroq(
  messages: ChatMessage[],
  system: string | null,
  maxTokens: number,
  jsonMode: boolean
): Promise<string> {
  if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not configured');

  const fullMessages: ChatMessage[] = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    ...messages,
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature: jsonMode ? 0.1 : 0.7,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: fullMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Groq HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  return data.choices[0].message.content.trim();
}

// ── Claude (Anthropic) ────────────────────────────────────────────────────────
async function callClaude(
  messages: ChatMessage[],
  system: string | null,
  maxTokens: number
): Promise<string> {
  if (!env.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  // Convert to Anthropic format (no 'system' role in messages array)
  const anthropicMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Claude HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  return data.content.map((b: any) => b.text || '').join('').trim();
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(
  messages: ChatMessage[],
  system: string | null,
  maxTokens: number
): Promise<string> {
  if (!env.geminiApiKey) throw new Error('GEMINI_API_KEY is not configured');

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const body: Record<string, any> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  };
  if (system) {
    body.system_instruction = { parts: [{ text: system }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Gemini HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  return (
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim() ?? ''
  );
}

// ── Unified entry point ───────────────────────────────────────────────────────
export async function callAI(options: AICallOptions): Promise<string> {
  const {
    messages,
    system = null,
    maxTokens = 4000,
    jsonMode = false,
    provider = env.defaultProvider,
  } = options;

  switch (provider) {
    case 'groq':
      return callGroq(messages, system, maxTokens, jsonMode);
    case 'claude':
      return callClaude(messages, system, maxTokens);
    case 'gemini':
      return callGemini(messages, system, maxTokens);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/** Returns list of providers that have API keys configured */
export function getAvailableProviders(): Provider[] {
  const available: Provider[] = [];
  if (env.groqApiKey) available.push('groq');
  if (env.anthropicApiKey) available.push('claude');
  if (env.geminiApiKey) available.push('gemini');
  return available;
}
