import { getDb } from './db.js';
import { getTaskById, listTasks as listTasksFromRepo, type TaskFilter } from './taskRepo.js';
import type { CommentView, InvoiceRow, ProjectRow, UserRow } from './types.js';

export { getTaskById, type TaskFilter };

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

export function listTasks(filter: TaskFilter) {
  return listTasksFromRepo(filter, localDate);
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
