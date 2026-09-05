import type { ReactNode } from 'react';

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ backgroundColor: color, width: size, height: size }}
    />
  );
}

export function CheckCircle({ done }: { done: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle
        cx="10"
        cy="10"
        r="8"
        fill={done ? '#3f7d58' : 'none'}
        stroke={done ? '#3f7d58' : '#c9c4bc'}
        strokeWidth="1.5"
      />
      {done ? (
        <path
          d="M6.5 10.2l2.3 2.3 4.7-4.8"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-faint">
      <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="#d4d0c9" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="#2f5fd0" strokeWidth="3" />
      </svg>
      Loading
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-danger/30 bg-danger/5 text-danger'
      : 'border-accent/25 bg-accent-soft text-accent-ink';
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border border-line bg-surface shadow-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button type="button" className="btn-quiet px-2 py-1" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function PriorityTag({ priority }: { priority: number }) {
  if (priority > 2) return null;
  const label = priority === 1 ? 'Urgent' : 'High';
  const styles =
    priority === 1 ? 'border-danger/30 text-danger' : 'border-line-strong text-ink-soft';
  return (
    <span className={`rounded border px-1.5 py-px text-[11px] font-medium ${styles}`}>{label}</span>
  );
}
