import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { TaskRow } from '../components/TaskRow';
import { Banner, Dot, EmptyState, Spinner } from '../components/ui';
import { projectColor } from '../lib';
import type { Member, Project, Task } from '../types';

interface Props {
  project: Project | undefined;
  members: Member[];
  selectedTaskId: number | null;
  onOpenTask: (task: Task) => void;
  onTaskChanged: () => void;
  onProjectRemoved: () => void;
  reloadToken: number;
  updatedTask: Task | null;
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
];

export function ProjectView({
  project,
  members,
  selectedTaskId,
  onOpenTask,
  onTaskChanged,
  onProjectRemoved,
  reloadToken,
  updatedTask,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState('open');
  const [assignee, setAssignee] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const projectId = project?.id;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const result = await api.tasks({
        project_id: projectId,
        status: status || undefined,
        assignee_id: assignee ? Number(assignee) : undefined,
        limit: 200,
      });
      setTasks(result.tasks);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, status, assignee]);

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
    if (status && status !== next) {
      setTasks((list) => list.filter((t) => t.id !== task.id));
    } else {
      setTasks((list) => list.map((t) => (t.id === task.id ? result.task : t)));
    }
    onTaskChanged();
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId || !title.trim()) return;
    try {
      await api.createTask({ title: title.trim(), project_id: projectId });
      setTitle('');
      await load();
      onTaskChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeProject() {
    if (!projectId) return;
    await api.deleteProject(projectId);
    onProjectRemoved();
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-4xl px-8 py-8">
        <EmptyState title="That project is not here" hint="Pick another one from the sidebar." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Dot color={projectColor(project.color)} size={10} />
          <h1 className="text-xl font-semibold tracking-tight text-ink">{project.name}</h1>
        </div>
        <button type="button" className="btn-quiet" onClick={removeProject}>
          Delete project
        </button>
      </header>

      <form className="mt-6" onSubmit={addTask}>
        <input
          className="field"
          placeholder="Add a task and press enter"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="New task title"
        />
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                status === filter.value
                  ? 'bg-accent-soft font-medium text-accent-ink'
                  : 'text-ink-soft hover:bg-canvas'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <select
          className="field w-auto py-1.5 text-sm"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="">Everyone</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <span className="ml-auto text-sm text-ink-faint">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {error ? (
        <div className="mt-5">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8">
          <Spinner />
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No tasks match these filters" />
        </div>
      ) : (
        <div className="card mt-5 overflow-hidden">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={toggle}
              onOpen={onOpenTask}
              selected={selectedTaskId === task.id}
              showProject={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
