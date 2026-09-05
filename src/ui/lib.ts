import type { Task } from './types.js';

export const PROJECT_COLORS: Record<string, string> = {
  blue: '#2f5fd0',
  amber: '#b8791f',
  violet: '#6b4fbb',
  green: '#3f7d58',
  rose: '#b4506a',
  slate: '#6f6b66',
};

export const PRIORITIES = [
  { value: 1, label: 'Urgent' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Low' },
];

export function priorityLabel(priority: number): string {
  return PRIORITIES.find((p) => p.value === priority)?.label ?? 'Normal';
}

export function projectColor(color: string | null): string {
  return PROJECT_COLORS[color ?? 'slate'] ?? PROJECT_COLORS.slate;
}

export function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysFromToday(iso: string): number {
  const target = parseIso(iso).getTime();
  const today = parseIso(todayIso()).getTime();
  return Math.round((target - today) / 86400000);
}

export function formatDayHeading(iso: string): string {
  const diff = daysFromToday(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return parseIso(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatShortDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDue(iso: string | null): string {
  if (!iso) return 'No date';
  const diff = daysFromToday(iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return formatShortDate(iso);
}

export function formatLongDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimestamp(value: string): string {
  const d = new Date(value);
  const diffDays = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return `Today at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return [...map.entries()];
}

export function sortOverdueTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.due_date ?? '').localeCompare(b.due_date ?? '');
  });
}
