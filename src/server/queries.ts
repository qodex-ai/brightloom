import { getDb } from './db.js';
import type { CommentView, InvoiceRow, ProjectRow, TaskView, UserRow } from './types.js';

const TASK_VIEW = `
  SELECT t.*,
         p.name AS project_name,
         p.color AS project_color,
         u.name AS assignee_name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function listProjects(orgId: number): (ProjectRow & { task_count: number })[] {
  return getDb()
    .prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'open')
                AS task_count
       FROM projects p
       WHERE p.org_id = ?
       ORDER BY p.archived ASC, p.id ASC`,
    )
    .all(orgId) as (ProjectRow & { task_count: number })[];
}

export function getProject(orgId: number, id: number): ProjectRow | undefined {
  return getDb().prepare('SELECT * FROM projects WHERE id = ? AND org_id = ?').get(id, orgId) as
    | ProjectRow
    | undefined;
}

export function getTaskById(id: number): TaskView | undefined {
  return getDb()
    .prepare(`${TASK_VIEW} WHERE t.id = ?`)
    .get(id) as TaskView | undefined;
}

export interface TaskFilter {
  orgId: number;
  projectId?: number;
  status?: string;
  due?: string;
  assigneeId?: number;
  limit: number;
  offset: number;
}

export function listTasks(filter: TaskFilter): { tasks: TaskView[]; total: number } {
  const where: string[] = ['t.org_id = @orgId'];
  const params: Record<string, unknown> = { orgId: filter.orgId };

  if (filter.projectId !== undefined) {
    where.push('t.project_id = @projectId');
    params.projectId = filter.projectId;
  }
  if (filter.status) {
    where.push('t.status = @status');
    params.status = filter.status;
  }
  if (filter.assigneeId !== undefined) {
    where.push('t.assignee_id = @assigneeId');
    params.assigneeId = filter.assigneeId;
  }
  if (filter.due === 'today') {
    where.push('t.due_date = @today');
    params.today = localDate();
  } else if (filter.due === 'overdue') {
    where.push("t.due_date < @today AND t.status = 'open'");
    params.today = localDate();
  } else if (filter.due === 'upcoming') {
    where.push('t.due_date > @today AND t.due_date <= @horizon');
    params.today = localDate();
    params.horizon = localDate(14);
  }

  const clause = `WHERE ${where.join(' AND ')}`;
  const db = getDb();
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM tasks t ${clause}`).get(params) as { n: number }
  ).n;
  const tasks = db
    .prepare(
      `${TASK_VIEW} ${clause}
       ORDER BY t.due_date IS NULL, t.due_date ASC, t.priority ASC, t.id ASC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: filter.limit, offset: filter.offset }) as TaskView[];
  return { tasks, total };
}

export function listComments(taskId: number): CommentView[] {
  return getDb()
    .prepare(
      `SELECT c.id, c.task_id, c.author_id, c.body, c.created_at, u.name AS author_name
       FROM comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC, c.id ASC`,
    )
    .all(taskId) as CommentView[];
}

export function listMembers(orgId: number): Pick<UserRow, 'id' | 'name' | 'email' | 'role'>[] {
  return getDb()
    .prepare('SELECT id, name, email, role FROM users WHERE org_id = ? ORDER BY id ASC')
    .all(orgId) as Pick<UserRow, 'id' | 'name' | 'email' | 'role'>[];
}

export function listInvoices(orgId: number): InvoiceRow[] {
  return getDb()
    .prepare('SELECT * FROM invoices WHERE org_id = ? ORDER BY period DESC')
    .all(orgId) as InvoiceRow[];
}

export function completedStats(orgId: number, days = 14): { date: string; count: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT substr(completed_at, 1, 10) AS date, COUNT(*) AS count
       FROM tasks
       WHERE org_id = ? AND completed_at IS NOT NULL AND substr(completed_at, 1, 10) >= ?
       GROUP BY date`,
    )
    .all(orgId, localDate(-(days - 1))) as { date: string; count: number }[];
  const byDate = new Map(rows.map((r) => [r.date, r.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = localDate(-i);
    out.push({ date, count: byDate.get(date) ?? 0 });
  }
  return out;
}
