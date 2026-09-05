import type { OrgRow, ProjectRow, TaskView, UserRow } from './types.js';

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    org_id: user.org_id,
    email: user.email,
    name: user.name,
    role: user.role,
    timezone: user.timezone,
  };
}

export function publicOrg(org: OrgRow) {
  return { id: org.id, slug: org.slug, name: org.name, plan: org.plan };
}

export function publicProject(project: ProjectRow & { task_count?: number }) {
  return {
    id: project.id,
    org_id: project.org_id,
    name: project.name,
    color: project.color,
    archived: project.archived === 1,
    created_at: project.created_at,
    open_task_count: project.task_count ?? 0,
  };
}

export function publicTask(task: TaskView) {
  return {
    id: task.id,
    org_id: task.org_id,
    project_id: task.project_id,
    project_name: task.project_name,
    project_color: task.project_color,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    assignee_id: task.assignee_id,
    assignee_name: task.assignee_name,
    repeats_weekly: task.repeats_weekly === 1,
    created_at: task.created_at,
    completed_at: task.completed_at,
  };
}
