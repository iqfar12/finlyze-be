import 'dotenv/config';

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),

  // AI keys
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  defaultProvider: (process.env.DEFAULT_PROVIDER || 'groq') as 'groq' | 'claude' | 'gemini',

  // Rate limits
  rateLimitAnalyze: {
    max: parseInt(process.env.RATE_LIMIT_ANALYZE_MAX || '10', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_ANALYZE_WINDOW_MS || '3600000', 10),
  },
  rateLimitChat: {
    max: parseInt(process.env.RATE_LIMIT_CHAT_MAX || '30', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_CHAT_WINDOW_MS || '3600000', 10),
  },
  rateLimitGlobal: {
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '3600000', 10),
  },

  // Optional frontend auth key
  apiSecretKey: process.env.API_SECRET_KEY || '',
} as const;
