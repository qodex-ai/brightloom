export interface OrgRow {
  id: number;
  slug: string;
  name: string;
  plan: string;
  created_at: string;
}

export interface UserRow {
  id: number;
  org_id: number;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  timezone: string;
  created_at: string;
}

export interface ProjectRow {
  id: number;
  org_id: number;
  name: string;
  color: string;
  archived: number;
  created_at: string;
}

export interface TaskRow {
  id: number;
  org_id: number;
  project_id: number | null;
  title: string;
  description: string;
  status: string;
  priority: number;
  due_date: string | null;
  assignee_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface TaskView extends TaskRow {
  project_name: string | null;
  project_color: string | null;
  assignee_name: string | null;
}

export interface CommentView {
  id: number;
  task_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface InvoiceRow {
  id: number;
  org_id: number;
  amount_cents: number;
  status: string;
  period: string;
  issued_at: string;
}

export interface SessionUser {
  user: UserRow;
  org: OrgRow;
}

export type AppEnv = {
  Variables: {
    session: SessionUser;
  };
};
