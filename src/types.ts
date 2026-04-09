// ── AI Provider types ─────────────────────────────────────────────────────────
export type Provider = 'groq' | 'claude' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AICallOptions {
  messages: ChatMessage[];
  system?: string | null;
  maxTokens?: number;
  jsonMode?: boolean;
  provider?: Provider;
}

// ── Request / Response types ──────────────────────────────────────────────────
export interface AnalyzeRequest {
  fileText: string;
  context: {
    mrr?: string;
    customers?: string;
    industry?: string;
    stage?: string;
  };
  provider?: Provider;
}

export interface ChatRequest {
  messages: ChatMessage[];
  analysisData: Record<string, any>;
  provider?: Provider;
}

export interface APIErrorResponse {
  error: string;
  message: string;
}
