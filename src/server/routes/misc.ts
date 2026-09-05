import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { badRequest } from '../errors.js';
import type { AppEnv } from '../types.js';

// Rough offset to zone map. Enough to preselect a sensible zone in settings.
const ZONES: Record<string, string> = {
  '-480': 'America/Los_Angeles',
  '-420': 'America/Denver',
  '-360': 'America/Chicago',
  '-300': 'America/New_York',
  '-180': 'America/Sao_Paulo',
  '0': 'Europe/London',
  '60': 'Europe/Berlin',
  '120': 'Europe/Helsinki',
  '180': 'Europe/Moscow',
  '330': 'Asia/Kolkata',
  '480': 'Asia/Singapore',
  '540': 'Asia/Tokyo',
  '600': 'Australia/Sydney',
};

export const miscRoutes = new Hono<AppEnv>();

function timezoneForOffset(offset: number): string {
  return ZONES[String(offset)] ?? 'UTC';
}

miscRoutes.post('/guess_timezone', requireSession, async (c) => {
  const body = await c.req.json().catch(() => null);
  const offset = Number(body?.offset_minutes);
  if (!Number.isFinite(offset) || offset < -900 || offset > 900) {
    throw badRequest('offset_minutes must be a number of minutes from UTC');
  }
  const rounded = Math.round(offset / 15) * 15;
  const timezone = timezoneForOffset(rounded);
  return c.json({ timezone, offset_minutes: rounded });
});

miscRoutes.get('/health', (c) => c.json({ status: 'ok' }));
