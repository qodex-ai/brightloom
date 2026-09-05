import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { TaskRow } from '../components/TaskRow';
import { Banner, EmptyState, Spinner } from '../components/ui';
import { formatDayHeading, groupBy } from '../lib';
import type { Task } from '../types';

interface Props {
  selectedTaskId: number | null;
  onOpenTask: (task: Task) => void;
  onTaskChanged: () => void;
  reloadToken: number;
  updatedTask: Task | null;
}

export function Upcoming({
  selectedTaskId,
  onOpenTask,
  onTaskChanged,
  reloadToken,
  updatedTask,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.tasks({ due: 'upcoming', limit: 200 });
      setTasks(result.tasks);
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
    setTasks((list) => list.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  }, [updatedTask]);

  async function toggle(task: Task) {
    const next = task.status === 'done' ? 'open' : 'done';
    const result = await api.updateTask(task.id, { status: next });
    setTasks((list) => list.map((t) => (t.id === task.id ? result.task : t)));
    onTaskChanged();
  }

  const days = groupBy(tasks, (task) => task.due_date ?? '');

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Upcoming</h1>
        <p className="mt-1 text-sm text-ink-faint">Everything due in the next fourteen days.</p>
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
      ) : days.length === 0 ? (
        <div className="mt-7">
          <EmptyState title="Nothing scheduled" hint="Add a task with a due date to see it here." />
        </div>
      ) : (
        <div className="mt-7 space-y-7">
          {days.map(([date, dayTasks]) => (
            <section key={date}>
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium text-ink">
                {formatDayHeading(date)}
                <span className="text-xs font-normal text-ink-faint">{dayTasks.length}</span>
              </h2>
              <div className="card overflow-hidden">
                {dayTasks.map((task) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
