import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { TaskPanel } from './components/TaskPanel';
import { Spinner } from './components/ui';
import { Billing } from './pages/Billing';
import { Login } from './pages/Login';
import { ProjectView } from './pages/ProjectView';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { Upcoming } from './pages/Upcoming';
import type { Member, Org, Project, Task, User } from './types';

function usePath(): [string, (to: string) => void] {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
  }, []);

  return [path, navigate];
}

export function App() {
  const [session, setSession] = useState<{ user: User; org: Org } | null>(null);
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [updatedTask, setUpdatedTask] = useState<Task | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [path, navigate] = usePath();

  const loadSession = useCallback(async () => {
    try {
      const me = await api.me();
      setSession(me);
    } catch {
      setSession(null);
    } finally {
      setReady(true);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    const [projectList, org] = await Promise.all([api.projects(), api.org()]);
    setProjects(projectList.projects);
    setMembers(org.members);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session) loadWorkspace();
  }, [session, loadWorkspace]);

  async function signOut() {
    await api.logout();
    setSession(null);
    setSelected(null);
    navigate('/');
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return (
      <Login
        onSignedIn={() => {
          setReady(false);
          loadSession();
        }}
      />
    );
  }

  const openTask = (task: Task) => setSelected(task.id);

  const refreshCounts = () => {
    loadWorkspace();
  };

  const bumpReload = () => {
    setReloadToken((n) => n + 1);
    loadWorkspace();
  };

  const projectMatch = path.match(/^\/projects\/(\d+)$/);

  let page = (
    <Today
      selectedTaskId={selected}
      onOpenTask={openTask}
      onTaskChanged={refreshCounts}
      reloadToken={reloadToken}
      updatedTask={updatedTask}
    />
  );

  if (path === '/upcoming') {
    page = (
      <Upcoming
        selectedTaskId={selected}
        onOpenTask={openTask}
        onTaskChanged={refreshCounts}
        reloadToken={reloadToken}
        updatedTask={updatedTask}
      />
    );
  } else if (projectMatch) {
    const id = Number(projectMatch[1]);
    page = (
      <ProjectView
        project={projects.find((p) => p.id === id)}
        members={members}
        selectedTaskId={selected}
        onOpenTask={openTask}
        onTaskChanged={refreshCounts}
        onProjectRemoved={() => {
          setSelected(null);
          navigate('/');
          bumpReload();
        }}
        reloadToken={reloadToken}
        updatedTask={updatedTask}
      />
    );
  } else if (path === '/settings') {
    page = (
      <Settings
        user={session.user}
        org={session.org}
        members={members}
        onUpdated={() => {
          loadSession();
          loadWorkspace();
        }}
      />
    );
  } else if (path === '/billing') {
    page = <Billing />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={session.user}
        org={session.org}
        projects={projects}
        path={path}
        navigate={(to) => {
          setSelected(null);
          navigate(to);
        }}
        onProjectsChanged={loadWorkspace}
        onSignOut={signOut}
      />

      <main className="flex-1 overflow-y-auto">{page}</main>

      {selected !== null ? (
        <TaskPanel
          taskId={selected}
          members={members}
          onClose={() => setSelected(null)}
          onChanged={(task) => {
            setUpdatedTask(task);
            refreshCounts();
          }}
          onDeleted={() => {
            setSelected(null);
            bumpReload();
          }}
        />
      ) : null}
    </div>
  );
}
