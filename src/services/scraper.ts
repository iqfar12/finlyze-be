import type { MarketQuote, OHLCVBar, ScraperSource } from '../types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i) + Math.random() * 100));
      }
    }
  }
  throw lastErr;
}

// Normalize input ticker → Yahoo (.JK) and Stooq (.JP) variants
function normalizeTickers(ticker: string): { yahoo: string; stooq: string } {
  const base = ticker.toUpperCase().replace(/\.(JK|JP)$/i, '');
  return { yahoo: `${base}.JK`, stooq: `${base}.JP` };
}

function stooqDateParam(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'application/json',
};

async function yahooFetchQuote(ticker: string): Promise<MarketQuote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });

  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${ticker}`);

  const data = (await res.json()) as any;
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance returned no data for ${ticker}`);

  const meta = result.meta;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
  const price: number = meta.regularMarketPrice;

  return {
    ticker: meta.symbol,
    price,
    currency: meta.currency ?? 'IDR',
    change: price - prev,
    changePercent: prev !== 0 ? ((price - prev) / prev) * 100 : 0,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap,
    timestamp: meta.regularMarketTime,
    source: 'yahoo' as ScraperSource,
  };
}

async function yahooFetchOHLCV(ticker: string, from: Date, to: Date): Promise<OHLCVBar[]> {
  const period1 = Math.floor(from.getTime() / 1000);
  const period2 = Math.floor(to.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&period1=${period1}&period2=${period2}`;

  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${ticker}`);

  const data = (await res.json()) as any;
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo Finance returned no data for ${ticker}`);

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens: number[] = q.open ?? [];
  const highs: number[] = q.high ?? [];
  const lows: number[] = q.low ?? [];
  const closes: number[] = q.close ?? [];
  const volumes: number[] = q.volume ?? [];

  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    open: opens[i] ?? 0,
    high: highs[i] ?? 0,
    low: lows[i] ?? 0,
    close: closes[i] ?? 0,
    volume: volumes[i] ?? 0,
  }));
}

// ── Stooq (CSV fallback) ──────────────────────────────────────────────────────

const STOOQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

function parseStooqCSV(csv: string): OHLCVBar[] {
  const lines = csv.trim().split('\n');
  // Header: Date,Open,High,Low,Close,Volume
  return lines
    .slice(1)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(',');
      return {
        date: date.trim(),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume ?? '0'),
      };
    })
    .filter((bar) => !isNaN(bar.close));
}

async function stooqFetchOHLCV(ticker: string, from: Date, to: Date): Promise<OHLCVBar[]> {
  const d1 = stooqDateParam(from);
  const d2 = stooqDateParam(to);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(ticker)}&d1=${d1}&d2=${d2}&i=d`;

  const res = await fetch(url, { headers: STOOQ_HEADERS });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status} for ${ticker}`);

  const csv = await res.text();
  if (csv.includes('No data') || csv.trim().split('\n').length < 2) {
    throw new Error(`Stooq returned no data for ${ticker}`);
  }

  return parseStooqCSV(csv);
}

async function stooqFetchQuote(ticker: string): Promise<MarketQuote> {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 5); // last 5 days to catch weekends/holidays

  const bars = await stooqFetchOHLCV(ticker, from, to);
  if (bars.length === 0) throw new Error(`Stooq returned no bars for ${ticker}`);

  const last = bars[bars.length - 1];
  const prev = bars.length > 1 ? bars[bars.length - 2] : last;

  return {
    ticker: ticker.toUpperCase(),
    price: last.close,
    currency: 'IDR',
    change: last.close - prev.close,
    changePercent: prev.close !== 0 ? ((last.close - prev.close) / prev.close) * 100 : 0,
    volume: last.volume,
    timestamp: Math.floor(new Date(last.date).getTime() / 1000),
    source: 'stooq' as ScraperSource,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Fetch real-time quote for an IDX stock. Tries Yahoo Finance first, falls back to Stooq. */
export async function fetchMarketQuote(ticker: string): Promise<MarketQuote> {
  const { yahoo, stooq } = normalizeTickers(ticker);

  try {
    return await withRetry(() => yahooFetchQuote(yahoo));
  } catch (yahooErr) {
    console.warn(`[scraper] Yahoo failed for ${yahoo}: ${(yahooErr as Error).message}`);
    try {
      return await withRetry(() => stooqFetchQuote(stooq));
    } catch (stooqErr) {
      throw new Error(
        `All market data sources failed for ${ticker}. Yahoo: ${(yahooErr as Error).message}. Stooq: ${(stooqErr as Error).message}`
      );
    }
  }
}

/**
 * Fetch OHLCV bars for a date range. Tries Yahoo Finance first, falls back to Stooq.
 * @param from ISO date string YYYY-MM-DD
 * @param to   ISO date string YYYY-MM-DD
 */
export async function fetchOHLCV(ticker: string, from: string, to: string): Promise<OHLCVBar[]> {
  const { yahoo, stooq } = normalizeTickers(ticker);
  const fromDate = new Date(from);
  const toDate = new Date(to);

  try {
    return await withRetry(() => yahooFetchOHLCV(yahoo, fromDate, toDate));
  } catch (yahooErr) {
    console.warn(`[scraper] Yahoo OHLCV failed for ${yahoo}: ${(yahooErr as Error).message}`);
    try {
      return await withRetry(() => stooqFetchOHLCV(stooq, fromDate, toDate));
    } catch (stooqErr) {
      throw new Error(
        `All OHLCV sources failed for ${ticker}. Yahoo: ${(yahooErr as Error).message}. Stooq: ${(stooqErr as Error).message}`
      );
    }
  }
}
