import { Hono } from 'hono';
import { fetchMarketQuote, fetchOHLCV } from '../services/scraper.js';
import type { MarketDataResponse } from '../types.js';

const marketData = new Hono();

// GET /api/market-data/:ticker
// Returns real-time quote (and optionally OHLCV) for an IDX stock.
// Query params:
//   ohlcv=true          — include OHLCV bars in response
//   from=YYYY-MM-DD     — OHLCV start date (default: 30 days ago)
//   to=YYYY-MM-DD       — OHLCV end date (default: today)
marketData.get('/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();

  if (!/^[A-Z0-9]{2,6}(\.(JK|JP))?$/.test(ticker)) {
    return c.json({ error: 'Bad Request', message: 'Invalid ticker format.' }, 400);
  }

  const includeOHLCV = c.req.query('ohlcv') === 'true';
  const toDate = c.req.query('to') || new Date().toISOString().slice(0, 10);
  const fromDate =
    c.req.query('from') ||
    (() => {
      const d = new Date(toDate);
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return c.json(
      { error: 'Bad Request', message: 'Date params must be in YYYY-MM-DD format.' },
      400
    );
  }

  if (fromDate > toDate) {
    return c.json({ error: 'Bad Request', message: "'from' must be before 'to'." }, 400);
  }

  try {
    const [quote, ohlcv] = await Promise.all([
      fetchMarketQuote(ticker),
      includeOHLCV ? fetchOHLCV(ticker, fromDate, toDate) : Promise.resolve(undefined),
    ]);

    const response: MarketDataResponse = {
      ticker: quote.ticker,
      quote,
      ...(ohlcv !== undefined ? { ohlcv } : {}),
    };

    return c.json({ success: true, data: response });
  } catch (err: any) {
    console.error(`[market-data] Error fetching ${ticker}:`, err.message);
    return c.json(
      { error: 'Market Data Unavailable', message: err.message || 'Unknown error' },
      502
    );
  }
});

// GET /api/market-data/:ticker/ohlcv — dedicated OHLCV endpoint
// Query params:
//   from=YYYY-MM-DD  (default: 90 days ago)
//   to=YYYY-MM-DD    (default: today)
marketData.get('/:ticker/ohlcv', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();

  if (!/^[A-Z0-9]{2,6}(\.(JK|JP))?$/.test(ticker)) {
    return c.json({ error: 'Bad Request', message: 'Invalid ticker format.' }, 400);
  }

  const toDate = c.req.query('to') || new Date().toISOString().slice(0, 10);
  const fromDate =
    c.req.query('from') ||
    (() => {
      const d = new Date(toDate);
      d.setDate(d.getDate() - 90);
      return d.toISOString().slice(0, 10);
    })();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return c.json(
      { error: 'Bad Request', message: 'Date params must be in YYYY-MM-DD format.' },
      400
    );
  }

  const diffDays = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000;
  if (diffDays > 366) {
    return c.json({ error: 'Bad Request', message: 'Date range cannot exceed 366 days.' }, 400);
  }

  if (fromDate > toDate) {
    return c.json({ error: 'Bad Request', message: "'from' must be before 'to'." }, 400);
  }

  try {
    const bars = await fetchOHLCV(ticker, fromDate, toDate);
    return c.json({ success: true, ticker, from: fromDate, to: toDate, count: bars.length, data: bars });
  } catch (err: any) {
    console.error(`[market-data/ohlcv] Error fetching ${ticker}:`, err.message);
    return c.json(
      { error: 'Market Data Unavailable', message: err.message || 'Unknown error' },
      502
    );
  }
});

export default marketData;
