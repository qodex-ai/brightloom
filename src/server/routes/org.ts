import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { getDb } from '../db.js';
import { badRequest, forbidden } from '../errors.js';
import { listMembers } from '../queries.js';
import { publicOrg } from '../serialize.js';
import type { AppEnv, OrgRow } from '../types.js';

export const orgRoutes = new Hono<AppEnv>();

orgRoutes.use('/org', requireSession);
orgRoutes.use('/org/*', requireSession);

orgRoutes.get('/org', (c) => {
  const { org } = c.get('session');
  return c.json({ org: publicOrg(org), members: listMembers(org.id) });
});

orgRoutes.patch('/org', async (c) => {
  const { org, user } = c.get('session');
  if (user.role !== 'owner') throw forbidden('Only an owner can change the organisation');
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('Organisation name is required');
  const db = getDb();
  db.prepare('UPDATE orgs SET name = ? WHERE id = ?').run(name, org.id);
  const updated = db.prepare('SELECT * FROM orgs WHERE id = ?').get(org.id) as OrgRow;
  return c.json({ org: publicOrg(updated) });
});
