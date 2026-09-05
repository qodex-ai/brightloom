import { useState } from 'react';
import { api } from '../api';
import { projectColor } from '../lib';
import type { Org, Project, User } from '../types';
import { Dot } from './ui';

interface Props {
  user: User;
  org: Org;
  projects: Project[];
  path: string;
  navigate: (to: string) => void;
  onProjectsChanged: () => void;
  onSignOut: () => void;
}

function NavItem({
  label,
  active,
  onClick,
  trailing,
  leading,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  trailing?: string;
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-accent-soft font-medium text-accent-ink'
          : 'text-ink-soft hover:bg-canvas hover:text-ink'
      }`}
    >
      {leading}
      <span className="flex-1 truncate text-left">{label}</span>
      {trailing ? <span className="text-xs tabular-nums text-ink-faint">{trailing}</span> : null}
    </button>
  );
}

export function Sidebar({
  user,
  org,
  projects,
  path,
  navigate,
  onProjectsChanged,
  onSignOut,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await api.createProject({ name: name.trim() });
    setName('');
    setAdding(false);
    onProjectsChanged();
  }

  const active = projects.filter((p) => !p.archived);

  return (
    <nav className="flex h-full w-[248px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="h-7 w-7 rounded-md" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#2f5fd0" />
            <path d="M9 10h14M9 16h14M9 22h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M13 6v20M19 6v20" stroke="#fff" strokeWidth="1.2" opacity="0.45" />
          </svg>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{org.name}</p>
            <p className="truncate text-xs text-ink-faint">
              <span className="capitalize">{org.plan}</span> plan
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0.5 px-2.5">
        <NavItem label="Today" active={path === '/'} onClick={() => navigate('/')} />
        <NavItem
          label="Upcoming"
          active={path === '/upcoming'}
          onClick={() => navigate('/upcoming')}
        />
      </div>

      <div className="mt-6 flex items-center justify-between px-4">
        <span className="label">Projects</span>
        <button
          type="button"
          className="text-xs text-ink-faint hover:text-ink"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? 'Cancel' : 'New'}
        </button>
      </div>

      <div className="mt-2 space-y-0.5 overflow-y-auto px-2.5">
        {adding ? (
          <form className="px-0.5 pb-2" onSubmit={createProject}>
            <input
              className="field py-1.5 text-sm"
              placeholder="Project name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              aria-label="New project name"
            />
          </form>
        ) : null}

        {active.map((project) => (
          <NavItem
            key={project.id}
            label={project.name}
            active={path === `/projects/${project.id}`}
            onClick={() => navigate(`/projects/${project.id}`)}
            trailing={project.open_task_count > 0 ? String(project.open_task_count) : undefined}
            leading={<Dot color={projectColor(project.color)} size={7} />}
          />
        ))}

        {active.length === 0 ? (
          <p className="px-2.5 py-2 text-sm text-ink-faint">No projects yet.</p>
        ) : null}
      </div>

      <div className="mt-auto space-y-0.5 px-2.5 pb-2 pt-6">
        <NavItem
          label="Settings"
          active={path === '/settings'}
          onClick={() => navigate('/settings')}
        />
        <NavItem label="Billing" active={path === '/billing'} onClick={() => navigate('/billing')} />
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-ink-faint">{user.email}</p>
          <button
            type="button"
            className="shrink-0 text-xs text-ink-faint hover:text-ink"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
