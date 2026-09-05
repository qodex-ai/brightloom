import { useEffect, useState } from 'react';
import { api } from '../api';
import { PRIORITIES, formatTimestamp, projectColor } from '../lib';
import type { Comment, Member, Task } from '../types';
import { Banner, Dot, Spinner } from './ui';

interface Props {
  taskId: number;
  members: Member[];
  onClose: () => void;
  onChanged: (task: Task) => void;
  onDeleted: (id: number) => void;
}

export function TaskPanel({ taskId, members, onClose, onChanged, onDeleted }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setTask(null);
    setError('');
    api
      .task(taskId)
      .then((data) => {
        if (!active) return;
        setTask(data.task);
        setComments(data.comments);
        setTitle(data.task.title);
        setDescription(data.task.description);
      })
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [taskId]);

  async function patch(changes: Parameters<typeof api.updateTask>[1]) {
    if (!task) return;
    setBusy(true);
    try {
      const result = await api.updateTask(task.id, changes);
      setTask(result.task);
      setTitle(result.task.title);
      setDescription(result.task.description);
      onChanged(result.task);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    if (!task || !draft.trim()) return;
    try {
      const result = await api.addComment(task.id, draft.trim());
      setComments((current) => [...current, result.comment]);
      setDraft('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove() {
    if (!task) return;
    await api.deleteTask(task.id);
    onDeleted(task.id);
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface lg:w-[400px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-xs text-ink-faint">Task {taskId}</span>
        <button type="button" className="btn-quiet px-2 py-1" onClick={onClose}>
          Close
        </button>
      </div>

      {!task ? (
        <div className="p-5">{error ? <Banner tone="error">{error}</Banner> : <Spinner />}</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="mb-4">
              <Banner tone="error">{error}</Banner>
            </div>
          ) : null}

          <textarea
            className="w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
            aria-label="Task title"
          />

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className={task.status === 'done' ? 'btn-secondary' : 'btn-primary'}
              disabled={busy}
              onClick={() => patch({ status: task.status === 'done' ? 'open' : 'done' })}
            >
              {task.status === 'done' ? 'Reopen task' : 'Mark as done'}
            </button>
            <button type="button" className="btn-quiet" onClick={remove}>
              Delete
            </button>
          </div>

          <dl className="mt-5 space-y-3 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="label">Project</dt>
              <dd className="flex items-center gap-2 text-sm text-ink">
                {task.project_name ? (
                  <>
                    <Dot color={projectColor(task.project_color)} size={7} />
                    {task.project_name}
                  </>
                ) : (
                  <span className="text-ink-faint">No project</span>
                )}
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="label">Due</dt>
              <dd>
                <input
                  type="date"
                  className="field w-[170px] py-1.5"
                  value={task.due_date ?? ''}
                  onChange={(e) => patch({ due_date: e.target.value || null })}
                  aria-label="Due date"
                />
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="label">Priority</dt>
              <dd>
                <select
                  className="field w-[170px] py-1.5"
                  value={task.priority}
                  onChange={(e) => patch({ priority: Number(e.target.value) })}
                  aria-label="Priority"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4">
              <dt className="label">Assignee</dt>
              <dd>
                <select
                  className="field w-[170px] py-1.5"
                  value={task.assignee_id ?? ''}
                  onChange={(e) =>
                    patch({ assignee_id: e.target.value ? Number(e.target.value) : null })
                  }
                  aria-label="Assignee"
                >
                  <option value="">Nobody</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-line pt-4">
            <label className="label" htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className="field mt-2 min-h-[90px]"
              value={description}
              placeholder="Add more detail"
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== task.description && patch({ description })}
            />
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h3 className="label">Comments</h3>
            <ul className="mt-3 space-y-4">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-ink">{comment.author_name}</span>
                    <span className="text-xs text-ink-faint">
                      {formatTimestamp(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{comment.body}</p>
                </li>
              ))}
              {comments.length === 0 ? (
                <li className="text-sm text-ink-faint">No comments yet.</li>
              ) : null}
            </ul>

            <form className="mt-4" onSubmit={addComment}>
              <textarea
                className="field min-h-[70px]"
                placeholder="Write a comment"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="New comment"
              />
              <div className="mt-2 flex justify-end">
                <button type="submit" className="btn-secondary" disabled={!draft.trim()}>
                  Add comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
