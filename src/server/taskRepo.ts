import { getDb } from './db.js';
import type { TaskView } from './types.js';

const TASK_VIEW = `
  SELECT t.*,
         p.name AS project_name,
         p.color AS project_color,
         u.name AS assignee_name
  FROM tasks t
  LEFT JOIN projects p ON p.id = t.project_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

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

export function listTasks(filter: TaskFilter, today: (offsetDays?: number) => string) {
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
    params.today = today();
  } else if (filter.due === 'overdue') {
    where.push("t.due_date < @today AND t.status = 'open'");
    params.today = today();
  } else if (filter.due === 'upcoming') {
    where.push('t.due_date > @today AND t.due_date <= @horizon');
    params.today = today();
    params.horizon = today(14);
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
