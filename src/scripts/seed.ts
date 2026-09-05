import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hashPassword } from '../server/auth.js';
import { openDatabase, type Db } from '../server/db.js';
import { databaseFile } from '../server/paths.js';
import { ORGS, PASSWORD } from './seed-data.js';

function dateOnly(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function timestamp(offsetDays: number, hour = 10, minute = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function monthPeriod(monthsAgo: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function seed(db: Db): void {
  const passwordHash = hashPassword(PASSWORD);

  const insertOrg = db.prepare(
    'INSERT INTO orgs (slug, name, plan, created_at) VALUES (?, ?, ?, ?)',
  );
  const insertUser = db.prepare(
    `INSERT INTO users (org_id, email, name, role, password_hash, timezone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertProject = db.prepare(
    'INSERT INTO projects (org_id, name, color, archived, created_at) VALUES (?, ?, ?, 0, ?)',
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks
       (org_id, project_id, title, description, status, priority, due_date, assignee_id, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertComment = db.prepare(
    'INSERT INTO comments (task_id, author_id, body, created_at) VALUES (?, ?, ?, ?)',
  );
  const insertInvoice = db.prepare(
    'INSERT INTO invoices (org_id, amount_cents, status, period, issued_at) VALUES (?, ?, ?, ?, ?)',
  );

  const run = db.transaction(() => {
    for (const org of ORGS) {
      const orgId = Number(insertOrg.run(org.slug, org.name, org.plan, timestamp(-120)).lastInsertRowid);

      const userIds = new Map<string, number>();
      for (const user of org.users) {
        const id = Number(
          insertUser.run(
            orgId,
            user.email,
            user.name,
            user.role,
            passwordHash,
            user.timezone,
            timestamp(-120),
          ).lastInsertRowid,
        );
        userIds.set(user.key, id);
      }

      const taskIds = new Map<string, number[]>();

      for (const project of org.projects) {
        const projectId = Number(
          insertProject.run(orgId, project.name, project.color, timestamp(-90)).lastInsertRowid,
        );
        const ids: number[] = [];
        for (const task of project.tasks) {
          const createdOffset = task.due === null ? -10 : Math.min(task.due - 5, -1);
          const id = Number(
            insertTask.run(
              orgId,
              projectId,
              task.title,
              task.description ?? '',
              task.done ? 'done' : 'open',
              task.priority,
              task.due === null ? null : dateOnly(task.due),
              userIds.get(task.assignee) ?? null,
              timestamp(createdOffset, 9, 30),
              task.done ? timestamp(task.completed ?? task.due ?? 0, 16, 45) : null,
            ).lastInsertRowid,
          );
          ids.push(id);
        }
        taskIds.set(project.name, ids);
      }

      for (const comment of org.comments) {
        const ids = taskIds.get(comment.project);
        const taskId = ids?.[comment.task];
        const authorId = userIds.get(comment.author);
        if (!taskId || !authorId) continue;
        insertComment.run(taskId, authorId, comment.body, timestamp(-comment.daysAgo, 14, 20));
      }

      for (const invoice of org.invoices) {
        const period = monthPeriod(invoice.monthsAgo);
        insertInvoice.run(
          orgId,
          invoice.amount_cents,
          invoice.status,
          period,
          `${period}-01T09:00:00.000Z`,
        );
      }
    }
  });

  run();
}

export function resetDatabase(): Db {
  const file = databaseFile();
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${file}${suffix}`;
    if (fs.existsSync(candidate)) fs.rmSync(candidate);
  }
  return openDatabase(file);
}

const runDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (runDirectly) {
  const db = resetDatabase();
  seed(db);

  const counts = {
    orgs: (db.prepare('SELECT COUNT(*) AS n FROM orgs').get() as { n: number }).n,
    users: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n,
    projects: (db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }).n,
    tasks: (db.prepare('SELECT COUNT(*) AS n FROM tasks').get() as { n: number }).n,
    comments: (db.prepare('SELECT COUNT(*) AS n FROM comments').get() as { n: number }).n,
    invoices: (db.prepare('SELECT COUNT(*) AS n FROM invoices').get() as { n: number }).n,
  };
  db.close();

  console.log(`Seeded ${databaseFile()}`);
  console.log(
    `${counts.orgs} organisations, ${counts.users} users, ${counts.projects} projects, ` +
      `${counts.tasks} tasks, ${counts.comments} comments, ${counts.invoices} invoices`,
  );
  console.log(`Sign in with priya@brightloom.test or dana@northwind.test, password ${PASSWORD}`);
}
