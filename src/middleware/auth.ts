import type { Context, Next } from 'hono';
import { env } from '../config.js';

/**
 * Optional middleware: validates `x-api-key` header against API_SECRET_KEY.
 * If API_SECRET_KEY is empty in .env, this middleware is skipped (open access).
 */
export async function authGuard(c: Context, next: Next) {
  // Skip if no secret configured
  if (!env.apiSecretKey) return next();

  const key = c.req.header('x-api-key');
  if (!key || key !== env.apiSecretKey) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing API key.' }, 401);
  }

  await next();
}
