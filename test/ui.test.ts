import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortOverdueTasks } from '../src/ui/lib.js';
import type { Task } from '../src/ui/types.js';

function task(id: number, priority: number, dueDate: string): Task {
  return {
    id,
    org_id: 1,
    project_id: null,
    project_name: null,
    project_color: null,
    title: `Task ${id}`,
    description: '',
    status: 'open',
    priority,
    due_date: dueDate,
    assignee_id: null,
    assignee_name: null,
    created_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
  };
}

describe('sortOverdueTasks', () => {
  it('sorts urgent priorities first, then due date', () => {
    const sorted = sortOverdueTasks([
      task(1, 2, '2026-01-01'),
      task(2, 1, '2026-01-03'),
      task(3, 1, '2026-01-02'),
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      [3, 2, 1],
    );
  });
});
