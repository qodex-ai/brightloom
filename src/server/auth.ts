import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { getDb } from './db.js';
import { unauthorized } from './errors.js';
import type { AppEnv, OrgRow, UserRow } from './types.js';

export const SESSION_COOKIE = 'bl_session';
const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createSession(userId: number): string {
  const db = getDb();
  const id = randomBytes(24).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    now.toISOString(),
    expires.toISOString(),
  );
  return id;
}

export function destroySession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function setSessionCookie(c: Parameters<MiddlewareHandler>[0], id: string): void {
  setCookie(c, SESSION_COOKIE, id, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(c: Parameters<MiddlewareHandler>[0]): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function lookupSession(id: string): { user: UserRow; org: OrgRow } | null {
  const db = getDb();
  const row = db
    .prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?')
    .get(id) as { user_id: number; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(id);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as
    | UserRow
    | undefined;
  if (!user) return null;
  const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(user.org_id) as OrgRow | undefined;
  if (!org) return null;
  return { user, org };
}

export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const id = getCookie(c, SESSION_COOKIE);
  if (!id) throw unauthorized();
  const session = lookupSession(id);
  if (!session) throw unauthorized('Your session has expired');
  c.set('session', session);
  await next();
};
