import { formatDue, daysFromToday, projectColor } from '../lib';
import type { Task } from '../types';
import { CheckCircle, Dot, PriorityTag } from './ui';

interface Props {
  task: Task;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  showProject?: boolean;
  showDue?: boolean;
  selected?: boolean;
}

export function TaskRow({
  task,
  onToggle,
  onOpen,
  showProject = true,
  showDue = true,
  selected = false,
}: Props) {
  const done = task.status === 'done';
  const overdue = !done && task.due_date !== null && daysFromToday(task.due_date) < 0;

  return (
    <div
      className={`group flex items-start gap-3 border-b border-line px-4 py-2.5 last:border-b-0 ${
        selected ? 'bg-accent-soft' : 'hover:bg-canvas'
      }`}
    >
      <button
        type="button"
        className="mt-0.5 shrink-0"
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        onClick={() => onToggle(task)}
      >
        <CheckCircle done={done} />
      </button>

      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpen(task)}
        data-task-id={task.id}
      >
        <span
          className={`block truncate text-sm ${
            done ? 'text-ink-faint line-through' : 'text-ink'
          }`}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          {showProject ? (
            task.project_name ? (
              <span className="flex items-center gap-1.5">
                <Dot color={projectColor(task.project_color)} size={6} />
                {task.project_name}
              </span>
            ) : (
              <span className="text-ink-faint">No project</span>
            )
          ) : null}
          {task.assignee_name ? <span>{task.assignee_name}</span> : null}
          {task.repeats_weekly ? <span className="rounded bg-accent-soft px-1.5 py-px">Weekly</span> : null}
          <PriorityTag priority={task.priority} />
        </span>
      </button>

      {showDue ? (
        <span
          className={`mt-0.5 shrink-0 text-xs tabular-nums ${
            overdue ? 'font-medium text-danger' : 'text-ink-faint'
          }`}
        >
          {formatDue(task.due_date)}
        </span>
      ) : null}
    </div>
  );
}
