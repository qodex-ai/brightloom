import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { getDb } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { completedStats, getProject, getTaskById, listComments, listTasks } from '../queries.js';
import { publicTask } from '../serialize.js';
import type { AppEnv, UserRow } from '../types.js';

const STATUSES = ['open', 'done'];
const DUE_FILTERS = ['today', 'upcoming', 'overdue'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const taskRoutes = new Hono<AppEnv>();

taskRoutes.use('/tasks', requireSession);
taskRoutes.use('/tasks/*', requireSession);

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

taskRoutes.get('/tasks', (c) => {
  const { org } = c.get('session');
  const q = c.req.query();

  const status = q.status;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw badRequest('status must be open or done');
  }
  const due = q.due;
  if (due !== undefined && !DUE_FILTERS.includes(due)) {
    throw badRequest('due must be today, upcoming or overdue');
  }

  const limit = toNumber(q.limit, 50);
  const offset = toNumber(q.offset, 0);

  const result = listTasks({
    orgId: org.id,
    projectId: q.project_id !== undefined ? toNumber(q.project_id, 0) : undefined,
    assigneeId: q.assignee_id !== undefined ? toNumber(q.assignee_id, 0) : undefined,
    status,
    due,
    limit,
    offset,
  });

  return c.json({ tasks: result.tasks.map(publicTask), total: result.total, limit, offset });
});

taskRoutes.get('/tasks/completed/stats', (c) => {
  const { org } = c.get('session');
  return c.json({ days: completedStats(org.id) });
});

taskRoutes.post('/tasks/bulk-complete', async (c) => {
  const body = await c.req.json().catch(() => null);
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
    throw badRequest('ids must be a non-empty array of task ids');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const tasks = ids.map((id) => {
    const task = getTaskById(id);
    if (!task) throw notFound('That task does not exist');
    db.prepare('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?').run(
      'done',
      task.status === 'done' ? task.completed_at : now,
      id,
    );
    return publicTask(getTaskById(id)!);
  });

  return c.json({ tasks });
});

taskRoutes.post('/tasks', async (c) => {
  const { org } = c.get('session');
  const body = await c.req.json().catch(() => null);

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) throw badRequest('Title is required');

  const projectId = body?.project_id === undefined ? null : Number(body.project_id);
  if (projectId !== null) {
    if (!Number.isInteger(projectId) || !getProject(org.id, projectId)) {
      throw badRequest('That project does not exist');
    }
  }

  const priority = body?.priority === undefined ? 3 : Number(body.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 4) {
    throw badRequest('priority must be between 1 and 4');
  }

  const dueDate = body?.due_date == null ? null : String(body.due_date);
  if (dueDate !== null && !DATE_PATTERN.test(dueDate)) {
    throw badRequest('due_date must look like 2026-01-31');
  }

  const assigneeId = body?.assignee_id == null ? null : Number(body.assignee_id);
  if (assigneeId !== null) {
    const member = getDb()
      .prepare('SELECT id FROM users WHERE id = ? AND org_id = ?')
      .get(assigneeId, org.id) as Pick<UserRow, 'id'> | undefined;
    if (!member) throw badRequest('That assignee is not in this organisation');
  }

  const description = typeof body?.description === 'string' ? body.description : '';

  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO tasks
         (org_id, project_id, title, description, status, priority, due_date, assignee_id, created_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
    )
    .run(org.id, projectId, title, description, priority, dueDate, assigneeId, new Date().toISOString());

  const task = getTaskById(Number(info.lastInsertRowid))!;
  return c.json({ task: publicTask(task) }, 201);
});

taskRoutes.get('/tasks/:id', (c) => {
  const id = Number(c.req.param('id'));
  const task = getTaskById(id);
  if (!task) throw notFound('That task does not exist');
  return c.json({ task: publicTask(task), comments: listComments(id) });
});

taskRoutes.patch('/tasks/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const existing = getTaskById(id);
  if (!existing) throw notFound('That task does not exist');

  const body = await c.req.json().catch(() => null);

  const title = typeof body?.title === 'string' ? body.title.trim() : undefined;
  if (title !== undefined && !title) throw badRequest('Title is required');

  const description = typeof body?.description === 'string' ? body.description : undefined;

  const status = typeof body?.status === 'string' ? body.status : undefined;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw badRequest('status must be open or done');
  }

  const priority = body?.priority === undefined ? undefined : Number(body.priority);
  if (priority !== undefined && (!Number.isInteger(priority) || priority < 1 || priority > 4)) {
    throw badRequest('priority must be between 1 and 4');
  }

  let dueDate: string | null | undefined;
  if (body && 'due_date' in body) {
    dueDate = body.due_date == null ? null : String(body.due_date);
    if (dueDate !== null && !DATE_PATTERN.test(dueDate)) {
      throw badRequest('due_date must look like 2026-01-31');
    }
  }

  let assigneeId: number | null | undefined;
  if (body && 'assignee_id' in body) {
    assigneeId = body.assignee_id == null ? null : Number(body.assignee_id);
    if (assigneeId !== null && !Number.isInteger(assigneeId)) {
      throw badRequest('assignee_id must be a user id');
    }
  }

  const db = getDb();
  const now = new Date().toISOString();
  let completedAt = existing.completed_at;
  if (status === 'done' && existing.status !== 'done') completedAt = now;
  if (status === 'open') completedAt = null;

  db.prepare(
    `UPDATE tasks
     SET title = COALESCE(@title, title),
         description = COALESCE(@description, description),
         status = COALESCE(@status, status),
         priority = COALESCE(@priority, priority),
         due_date = CASE WHEN @dueDateSet = 1 THEN @dueDate ELSE due_date END,
         assignee_id = CASE WHEN @assigneeSet = 1 THEN @assigneeId ELSE assignee_id END,
         completed_at = @completedAt
     WHERE id = @id`,
  ).run({
    id,
    title: title ?? null,
    description: description ?? null,
    status: status ?? null,
    priority: priority ?? null,
    dueDateSet: dueDate === undefined ? 0 : 1,
    dueDate: dueDate ?? null,
    assigneeSet: assigneeId === undefined ? 0 : 1,
    assigneeId: assigneeId ?? null,
    completedAt,
  });

  return c.json({ task: publicTask(getTaskById(id)!) });
});

taskRoutes.delete('/tasks/:id', (c) => {
  const id = Number(c.req.param('id'));
  const task = getTaskById(id);
  if (!task) throw notFound('That task does not exist');
  const db = getDb();
  db.prepare('DELETE FROM comments WHERE task_id = ?').run(id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return c.json({ ok: true });
});

taskRoutes.post('/tasks/:id/comments', async (c) => {
  const { user } = c.get('session');
  const id = Number(c.req.param('id'));
  const task = getTaskById(id);
  if (!task) throw notFound('That task does not exist');

  const body = await c.req.json().catch(() => null);
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!text) throw badRequest('Comment body is required');
  if (text.length > 2000) throw badRequest('Comment must be 2000 characters or fewer');

  const db = getDb();
  const info = db
    .prepare('INSERT INTO comments (task_id, author_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(id, user.id, text, new Date().toISOString());
  const comment = db
    .prepare(
      `SELECT c.id, c.task_id, c.author_id, c.body, c.created_at, u.name AS author_name
       FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?`,
    )
    .get(info.lastInsertRowid);
  return c.json({ comment }, 201);
});
