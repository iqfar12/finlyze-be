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

// ── RAG / Chunking types ─────────────────────────────────────────────────────
export interface TextChunk {
  id: string;
  source: 'bank_statement' | 'financial_report';
  index: number;
  text: string;
}

export interface AuditRetrievedContext {
  revenue: { reportChunks: TextChunk[]; bankChunks: TextChunk[] };
  expense: { reportChunks: TextChunk[]; bankChunks: TextChunk[] };
  balance: { reportChunks: TextChunk[]; bankChunks: TextChunk[] };
  suspicious: { bankChunks: TextChunk[] };
}

// ── Audit types ───────────────────────────────────────────────────────────────
export interface AuditRequest {
  bankStatementText: string;
  financialReportText: string;
  period?: string;
  provider?: Provider;
}

export interface ReconciliationData {
  reported_revenue: number;
  bank_inflow: number;
  revenue_gap: number;
  reported_expenses: number;
  bank_outflow: number;
  expense_gap: number;
  reported_cash_ending: number;
  bank_closing_balance: number;
  cash_gap: number;
}

export interface AuditFinding {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  amount: number;
  recommendation: string;
}

export interface SuspiciousTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  risk: 'high' | 'medium' | 'low';
  reason: string;
}

export interface AuditRecommendation {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface AuditData {
  audit_score: number;
  audit_label: string;
  period: string;
  summary: string;
  reconciliation: ReconciliationData;
  findings: AuditFinding[];
  suspicious_transactions: SuspiciousTransaction[];
  required_documents: string[];
  recommendations: AuditRecommendation[];
}

// ── Market data / scraping types ──────────────────────────────────────────────
export type ScraperSource = 'yahoo' | 'stooq';

export interface MarketQuote {
  ticker: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
  source: ScraperSource;
}

export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataResponse {
  ticker: string;
  quote: MarketQuote;
  ohlcv?: OHLCVBar[];
}
