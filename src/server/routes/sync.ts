import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { getDb } from '../db.js';
import { badRequest } from '../errors.js';
import type { AppEnv, TaskRow } from '../types.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface SyncOp {
  op?: string;
  task_id?: number;
  due_date?: string;
}

interface SyncResult {
  task_id: number;
  op: string;
  ok: boolean;
  error?: string;
}

export const syncRoutes = new Hono<AppEnv>();

syncRoutes.post('/sync', requireSession, async (c) => {
  const { org } = c.get('session');

  const raw = await c.req.text();
  let payload: { ops?: SyncOp[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw badRequest('Body must be JSON');
  }

  const ops = Array.isArray(payload?.ops) ? payload.ops : null;
  if (!ops) throw badRequest('ops must be an array');
  if (ops.length > 200) throw badRequest('A batch can hold at most 200 operations');

  const db = getDb();
  const results: SyncResult[] = [];
  const now = new Date().toISOString();

  for (const item of ops) {
    const op = String(item?.op ?? '');
    const taskId = Number(item?.task_id);
    const result: SyncResult = { task_id: taskId, op, ok: false };

    const task = Number.isInteger(taskId)
      ? (db.prepare('SELECT * FROM tasks WHERE id = ? AND org_id = ?').get(taskId, org.id) as
          | TaskRow
          | undefined)
      : undefined;

    if (!task) {
      result.error = 'That task does not exist';
      results.push(result);
      continue;
    }

    if (op === 'complete') {
      db.prepare("UPDATE tasks SET status = 'done', completed_at = ? WHERE id = ?").run(now, taskId);
      result.ok = true;
    } else if (op === 'reopen') {
      db.prepare("UPDATE tasks SET status = 'open', completed_at = NULL WHERE id = ?").run(taskId);
      result.ok = true;
    } else if (op === 'reschedule') {
      const due = String(item?.due_date ?? '');
      if (!DATE_PATTERN.test(due)) {
        result.error = 'due_date must look like 2026-01-31';
      } else {
        db.prepare('UPDATE tasks SET due_date = ? WHERE id = ?').run(due, taskId);
        result.ok = true;
      }
    } else if (op === 'delete') {
      db.prepare('DELETE FROM comments WHERE task_id = ?').run(taskId);
      db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
      result.ok = true;
    } else {
      result.error = 'op must be complete, reopen, reschedule or delete';
    }

    results.push(result);
  }

  const applied = results.filter((r) => r.ok).length;
  return c.json({ applied, results });
});
