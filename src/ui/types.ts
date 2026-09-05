export interface User {
  id: number;
  org_id: number;
  email: string;
  name: string;
  role: string;
  timezone: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Org {
  id: number;
  slug: string;
  name: string;
  plan: string;
}

export interface Project {
  id: number;
  org_id: number;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
  open_task_count: number;
}

export interface Task {
  id: number;
  org_id: number;
  project_id: number | null;
  project_name: string | null;
  project_color: string | null;
  title: string;
  description: string;
  status: 'open' | 'done';
  priority: number;
  due_date: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Comment {
  id: number;
  task_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  org_id: number;
  amount_cents: number;
  status: string;
  period: string;
  issued_at: string;
}

export interface Subscription {
  plan: string;
  seats: number;
  seat_price_cents: number;
  next_invoice: { period: string; amount_cents: number; due_date: string };
}
