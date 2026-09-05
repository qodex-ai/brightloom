import { useState } from 'react';
import { api } from '../api';
import { Banner } from '../components/ui';

export function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(email, password);
      onSignedIn();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="h-8 w-8 rounded-md" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#2f5fd0" />
            <path d="M9 10h14M9 16h14M9 22h14" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M13 6v20M19 6v20" stroke="#fff" strokeWidth="1.2" opacity="0.45" />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-ink">Brightloom</span>
        </div>

        <div className="card px-6 py-6 shadow-panel">
          <h1 className="text-base font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-faint">
            Use the email address your team invited you with.
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {error ? <Banner tone="error">{error}</Banner> : null}

            <div>
              <label className="label mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          Trouble signing in? Ask an owner in your organisation to resend the invite.
        </p>
      </div>
    </div>
  );
}
