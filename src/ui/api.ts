import type {
  Comment,
  Invoice,
  Member,
  Org,
  Project,
  Subscription,
  Task,
  User,
} from './types';

const BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiError(
      response.status,
      error.code ?? 'error',
      error.message ?? 'Something went wrong',
    );
  }
  return payload as T;
}

const body = (value: unknown) => JSON.stringify(value);

export interface TaskQuery {
  project_id?: number;
  assignee_id?: number;
  status?: string;
  due?: string;
  limit?: number;
  offset?: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; org: Org }>('/auth/login', {
      method: 'POST',
      body: body({ email, password }),
    }),

  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User; org: Org }>('/me'),

  updateProfile: (patch: { name?: string; timezone?: string }) =>
    request<{ user: User }>('/me', { method: 'PATCH', body: body(patch) }),

  org: () => request<{ org: Org; members: Member[] }>('/org'),

  renameOrg: (name: string) =>
    request<{ org: Org }>('/org', { method: 'PATCH', body: body({ name }) }),

  projects: () => request<{ projects: Project[] }>('/projects'),

  createProject: (input: { name: string; color?: string }) =>
    request<{ project: Project }>('/projects', { method: 'POST', body: body(input) }),

  updateProject: (id: number, patch: { name?: string; color?: string; archived?: boolean }) =>
    request<{ project: Project }>(`/projects/${id}`, { method: 'PATCH', body: body(patch) }),

  deleteProject: (id: number) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  tasks: (query: TaskQuery = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<{ tasks: Task[]; total: number; limit: number; offset: number }>(
      `/tasks${suffix}`,
    );
  },

  task: (id: number) => request<{ task: Task; comments: Comment[] }>(`/tasks/${id}`),

  createTask: (input: {
    title: string;
    project_id?: number | null;
    description?: string;
    priority?: number;
    due_date?: string | null;
    assignee_id?: number | null;
  }) => request<{ task: Task }>('/tasks', { method: 'POST', body: body(input) }),

  updateTask: (
    id: number,
    patch: {
      title?: string;
      description?: string;
      status?: string;
      priority?: number;
      due_date?: string | null;
      assignee_id?: number | null;
    },
  ) => request<{ task: Task }>(`/tasks/${id}`, { method: 'PATCH', body: body(patch) }),

  deleteTask: (id: number) => request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  addComment: (taskId: number, text: string) =>
    request<{ comment: Comment }>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: body({ body: text }),
    }),

  completedStats: () =>
    request<{ days: { date: string; count: number }[] }>('/tasks/completed/stats'),

  sync: (ops: { op: string; task_id: number; due_date?: string }[]) =>
    request<{ applied: number; results: { task_id: number; ok: boolean; error?: string }[] }>(
      '/sync',
      { method: 'POST', body: body({ ops }) },
    ),

  guessTimezone: (offsetMinutes: number) =>
    request<{ timezone: string; offset_minutes: number }>('/guess_timezone', {
      method: 'POST',
      body: body({ offset_minutes: offsetMinutes }),
    }),

  subscription: () => request<Subscription>('/billing/subscription'),

  invoices: () => request<{ invoices: Invoice[] }>('/billing/invoices'),
};
