import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  requireSession,
  setSessionCookie,
  verifyPassword,
} from '../auth.js';
import { getDb } from '../db.js';
import { ApiError, badRequest } from '../errors.js';
import { publicOrg, publicUser } from '../serialize.js';
import type { AppEnv, OrgRow, UserRow } from '../types.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) throw badRequest('Email and password are required');

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, 'invalid_credentials', 'That email and password do not match');
  }
  const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(user.org_id) as OrgRow;
  const sessionId = createSession(user.id);
  setSessionCookie(c, sessionId);
  return c.json({ user: publicUser(user), org: publicOrg(org) });
});

authRoutes.post('/auth/logout', async (c) => {
  const id = getCookie(c, SESSION_COOKIE);
  if (id) destroySession(id);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', requireSession, (c) => {
  const { user, org } = c.get('session');
  return c.json({ user: publicUser(user), org: publicOrg(org) });
});

authRoutes.patch('/me', requireSession, async (c) => {
  const { user } = c.get('session');
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
  const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : undefined;
  if (name !== undefined && name.length === 0) throw badRequest('Name cannot be empty');

  const db = getDb();
  db.prepare('UPDATE users SET name = COALESCE(?, name), timezone = COALESCE(?, timezone) WHERE id = ?').run(
    name ?? null,
    timezone ?? null,
    user.id,
  );
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as UserRow;
  return c.json({ user: publicUser(updated) });
});
