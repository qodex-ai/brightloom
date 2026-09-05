import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { getDb } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { getProject, listProjects } from '../queries.js';
import { publicProject } from '../serialize.js';
import type { AppEnv, ProjectRow } from '../types.js';

const COLORS = ['blue', 'amber', 'violet', 'green', 'rose', 'slate'];

export const projectRoutes = new Hono<AppEnv>();

projectRoutes.use('/projects', requireSession);
projectRoutes.use('/projects/*', requireSession);

projectRoutes.get('/projects', (c) => {
  const { org } = c.get('session');
  return c.json({ projects: listProjects(org.id).map(publicProject) });
});

projectRoutes.post('/projects', async (c) => {
  const { org } = c.get('session');
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('Project name is required');
  if (name.length > 120) throw badRequest('Project name must be 120 characters or fewer');
  const color = typeof body?.color === 'string' && COLORS.includes(body.color) ? body.color : 'slate';

  const db = getDb();
  const info = db
    .prepare('INSERT INTO projects (org_id, name, color, archived, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(org.id, name, color, new Date().toISOString());
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(info.lastInsertRowid) as ProjectRow;
  return c.json({ project: publicProject(project) }, 201);
});

projectRoutes.patch('/projects/:id', async (c) => {
  const { org } = c.get('session');
  const id = Number(c.req.param('id'));
  const existing = getProject(org.id, id);
  if (!existing) throw notFound('That project does not exist');

  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
  if (name !== undefined && !name) throw badRequest('Project name is required');
  if (name !== undefined && name.length > 120) {
    throw badRequest('Project name must be 120 characters or fewer');
  }
  const color =
    typeof body?.color === 'string' && COLORS.includes(body.color) ? body.color : undefined;
  const archived = typeof body?.archived === 'boolean' ? (body.archived ? 1 : 0) : undefined;

  const db = getDb();
  db.prepare(
    `UPDATE projects
     SET name = COALESCE(?, name), color = COALESCE(?, color), archived = COALESCE(?, archived)
     WHERE id = ?`,
  ).run(name ?? null, color ?? null, archived ?? null, id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
  return c.json({ project: publicProject(project) });
});

projectRoutes.delete('/projects/:id', (c) => {
  const { org } = c.get('session');
  const id = Number(c.req.param('id'));
  const existing = getProject(org.id, id);
  if (!existing) throw notFound('That project does not exist');
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  return c.json({ ok: true });
});
