import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { TaskRow } from '../components/TaskRow';
import { Banner, EmptyState, Spinner } from '../components/ui';
import { formatLongDate, sortOverdueTasks, todayIso } from '../lib';
import type { Task } from '../types';

interface Props {
  selectedTaskId: number | null;
  onOpenTask: (task: Task) => void;
  onTaskChanged: () => void;
  reloadToken: number;
  updatedTask: Task | null;
}

export function Today({
  selectedTaskId,
  onOpenTask,
  onTaskChanged,
  reloadToken,
  updatedTask,
}: Props) {
  const [overdue, setOverdue] = useState<Task[]>([]);
  const [dueToday, setDueToday] = useState<Task[]>([]);
  const [counter, setCounter] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [late, today] = await Promise.all([
        api.tasks({ due: 'overdue', limit: 100 }),
        api.tasks({ due: 'today', limit: 100 }),
      ]);
      setOverdue(sortOverdueTasks(late.tasks));
      setDueToday(today.tasks);
      const all = [...late.tasks, ...today.tasks];
      setCounter({ done: all.filter((t) => t.status === 'done').length, total: all.length });
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadToken]);

  useEffect(() => {
    if (!updatedTask) return;
    const replace = (list: Task[]) =>
      sortOverdueTasks(list.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setOverdue(replace);
    setDueToday(replace);
  }, [updatedTask]);

  async function toggle(task: Task) {
    const next = task.status === 'done' ? 'open' : 'done';
    const result = await api.updateTask(task.id, { status: next });
    const replace = (list: Task[]) => list.map((t) => (t.id === task.id ? result.task : t));
    setOverdue(replace);
    setDueToday(replace);
    onTaskChanged();
  }

  async function moveOverdueToToday() {
    const open = overdue.filter((t) => t.status === 'open');
    if (open.length === 0) return;
    setRescheduling(true);
    try {
      await api.sync(
        open.map((task) => ({ op: 'reschedule', task_id: task.id, due_date: todayIso() })),
      );
      await load();
      onTaskChanged();
    } finally {
      setRescheduling(false);
    }
  }

  const openOverdue = overdue.filter((t) => t.status === 'open').length;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Today</h1>
          <p className="mt-1 text-sm text-ink-faint">{formatLongDate(todayIso())}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">
            {counter.done} of {counter.total} done
          </span>
          {openOverdue > 0 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={moveOverdueToToday}
              disabled={rescheduling}
            >
              Move overdue to today
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="mt-6">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8">
          <Spinner />
        </div>
      ) : (
        <div className="mt-7 space-y-8">
          {overdue.length > 0 ? (
            <section>
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium text-danger">
                Overdue
                <span className="text-xs font-normal text-ink-faint">{overdue.length}</span>
              </h2>
              <div className="card overflow-hidden">
                {overdue.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggle}
                    onOpen={onOpenTask}
                    selected={selectedTaskId === task.id}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium text-ink">
              Due today
              <span className="text-xs font-normal text-ink-faint">{dueToday.length}</span>
            </h2>
            {dueToday.length === 0 ? (
              <EmptyState
                title="Nothing due today"
                hint="Check Upcoming to see what is next."
              />
            ) : (
              <div className="card overflow-hidden">
                {dueToday.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggle}
                    onOpen={onOpenTask}
                    selected={selectedTaskId === task.id}
                    showDue={false}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
