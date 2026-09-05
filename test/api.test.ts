import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

process.env.BRIGHTLOOM_DB = path.join(os.tmpdir(), `brightloom-test-${process.pid}.db`);

const { createApp } = await import('../src/server/app.js');
const { resetDatabase, seed } = await import('../src/scripts/seed.js');

const app = createApp();
let cookie = '';

async function call(
  method: string,
  url: string,
  body?: unknown,
  options: { auth?: boolean } = { auth: true },
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false && cookie) headers.Cookie = cookie;

  const response = await app.request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];

  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

before(() => {
  const db = resetDatabase();
  seed(db);
  db.close();
});

after(() => {
  cookie = '';
});

describe('auth', () => {
  it('rejects a wrong password', async () => {
    const result = await call(
      'POST',
      '/api/v1/auth/login',
      { email: 'priya@brightloom.test', password: 'not-the-password' },
      { auth: false },
    );
    assert.equal(result.status, 401);
    assert.equal(result.json.error.code, 'invalid_credentials');
  });

  it('signs in and returns the current user', async () => {
    const login = await call(
      'POST',
      '/api/v1/auth/login',
      { email: 'priya@brightloom.test', password: 'demo-pass-2026' },
      { auth: false },
    );
    assert.equal(login.status, 200);
    assert.equal(login.json.user.email, 'priya@brightloom.test');
    assert.equal(login.json.org.slug, 'brightloom');
    assert.ok(cookie.startsWith('bl_session='));

    const me = await call('GET', '/api/v1/me');
    assert.equal(me.status, 200);
    assert.equal(me.json.user.name, 'Priya Raman');
  });

  it('refuses a request without a session', async () => {
    const result = await call('GET', '/api/v1/projects', undefined, { auth: false });
    assert.equal(result.status, 401);
    assert.equal(result.json.error.code, 'unauthorized');
  });
});

describe('projects', () => {
  it('lists the seeded projects', async () => {
    const result = await call('GET', '/api/v1/projects');
    assert.equal(result.status, 200);
    const names = result.json.projects.map((p: { name: string }) => p.name);
    assert.deepEqual(names, ['Website relaunch', 'Mobile app', 'Q4 planning', 'Hiring']);
  });

  it('creates, renames and deletes a project', async () => {
    const created = await call('POST', '/api/v1/projects', { name: 'Support rota', color: 'rose' });
    assert.equal(created.status, 201);
    const id = created.json.project.id;
    assert.equal(created.json.project.color, 'rose');

    const renamed = await call('PATCH', `/api/v1/projects/${id}`, { name: 'Support rotation' });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.json.project.name, 'Support rotation');

    const removed = await call('DELETE', `/api/v1/projects/${id}`);
    assert.equal(removed.status, 200);

    const missing = await call('PATCH', `/api/v1/projects/${id}`, { name: 'Gone' });
    assert.equal(missing.status, 404);
  });
});

describe('tasks', () => {
  it('filters by due window and by project', async () => {
    const today = await call('GET', '/api/v1/tasks?due=today');
    assert.equal(today.status, 200);
    assert.ok(today.json.tasks.length > 0);

    const overdue = await call('GET', '/api/v1/tasks?due=overdue');
    assert.ok(overdue.json.tasks.every((t: { status: string }) => t.status === 'open'));

    const projects = await call('GET', '/api/v1/projects');
    const mobile = projects.json.projects.find((p: { name: string }) => p.name === 'Mobile app');
    const inProject = await call('GET', `/api/v1/tasks?project_id=${mobile.id}&limit=200`);
    assert.ok(inProject.json.tasks.length > 0);
    assert.ok(
      inProject.json.tasks.every((t: { project_id: number }) => t.project_id === mobile.id),
    );
  });

  it('creates, completes, comments on and deletes a task', async () => {
    const projects = await call('GET', '/api/v1/projects');
    const projectId = projects.json.projects[0].id;

    const created = await call('POST', '/api/v1/tasks', {
      title: 'Check the redirect map one more time',
      project_id: projectId,
      priority: 2,
      due_date: '2030-01-15',
      repeats_weekly: true,
    });
    assert.equal(created.status, 201);
    const id = created.json.task.id;
    assert.equal(created.json.task.status, 'open');
    assert.equal(created.json.task.project_name, projects.json.projects[0].name);
    assert.equal(created.json.task.repeats_weekly, true);

    const updatedRepeat = await call('PATCH', `/api/v1/tasks/${id}`, { repeats_weekly: false });
    assert.equal(updatedRepeat.status, 200);
    assert.equal(updatedRepeat.json.task.repeats_weekly, false);

    const completed = await call('PATCH', `/api/v1/tasks/${id}`, { status: 'done' });
    assert.equal(completed.status, 200);
    assert.equal(completed.json.task.status, 'done');
    assert.ok(completed.json.task.completed_at);

    const comment = await call('POST', `/api/v1/tasks/${id}/comments`, {
      body: 'Checked against the old sitemap, nothing missing.',
    });
    assert.equal(comment.status, 201);
    assert.equal(comment.json.comment.author_name, 'Priya Raman');

    const detail = await call('GET', `/api/v1/tasks/${id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.comments.length, 1);

    const removed = await call('DELETE', `/api/v1/tasks/${id}`);
    assert.equal(removed.status, 200);
    assert.equal((await call('GET', `/api/v1/tasks/${id}`)).status, 404);
  });

  it('rejects an unknown status filter', async () => {
    const result = await call('GET', '/api/v1/tasks?status=maybe');
    assert.equal(result.status, 400);
    assert.equal(result.json.error.code, 'bad_request');
  });

  it('reports completed counts for the last fourteen days', async () => {
    const result = await call('GET', '/api/v1/tasks/completed/stats');
    assert.equal(result.status, 200);
    assert.equal(result.json.days.length, 14);
    assert.ok(result.json.days.some((day: { count: number }) => day.count > 0));
  });
});

describe('sync', () => {
  it('applies a batch of operations', async () => {
    const open = await call('GET', '/api/v1/tasks?status=open&limit=2');
    const ids = open.json.tasks.map((t: { id: number }) => t.id);

    const result = await call('POST', '/api/v1/sync', {
      ops: ids.map((id: number) => ({ op: 'complete', task_id: id })),
    });
    assert.equal(result.status, 200);
    assert.equal(result.json.applied, ids.length);

    const after = await call(`GET`, `/api/v1/tasks/${ids[0]}`);
    assert.equal(after.json.task.status, 'done');
  });
});

describe('billing and utilities', () => {
  it('returns the plan and the invoices', async () => {
    const subscription = await call('GET', '/api/v1/billing/subscription');
    assert.equal(subscription.status, 200);
    assert.equal(subscription.json.plan, 'team');
    assert.equal(subscription.json.seats, 3);

    const invoices = await call('GET', '/api/v1/billing/invoices');
    assert.equal(invoices.json.invoices.length, 3);
  });

  it('suggests a timezone for an offset', async () => {
    const result = await call('POST', '/api/v1/guess_timezone', { offset_minutes: 330 });
    assert.equal(result.status, 200);
    assert.equal(result.json.timezone, 'Asia/Kolkata');
  });

  it('serves the openapi document', async () => {
    const response = await app.request('/openapi.json');
    assert.equal(response.status, 200);
    const document = (await response.json()) as { openapi: string; paths: Record<string, unknown> };
    assert.equal(document.openapi, '3.1.0');
    assert.ok(document.paths['/api/v1/tasks']);
  });
});

describe('organisation separation', () => {
  it('lists only the signed in organisation projects', async () => {
    const login = await call(
      'POST',
      '/api/v1/auth/login',
      { email: 'dana@northwind.test', password: 'demo-pass-2026' },
      { auth: false },
    );
    assert.equal(login.status, 200);

    const projects = await call('GET', '/api/v1/projects');
    const names = projects.json.projects.map((p: { name: string }) => p.name);
    assert.deepEqual(names, ['Warehouse dashboard', 'Supplier portal']);

    const tasks = await call('GET', '/api/v1/tasks?limit=200');
    assert.ok(tasks.json.tasks.every((t: { org_id: number }) => t.org_id === login.json.org.id));
  });
});
