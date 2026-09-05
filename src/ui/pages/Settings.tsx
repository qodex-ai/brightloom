import { useEffect, useState } from 'react';
import { api } from '../api';
import { Banner } from '../components/ui';
import type { Member, Org, User } from '../types';

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Helsinki',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface Props {
  user: User;
  org: Org;
  members: Member[];
  onUpdated: () => void;
}

export function Settings({ user, org, members, onUpdated }: Props) {
  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [orgName, setOrgName] = useState(org.name);
  const [suggested, setSuggested] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .guessTimezone(-new Date().getTimezoneOffset())
      .then((result) => setSuggested(result.timezone))
      .catch(() => setSuggested(''));
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.updateProfile({ name: name.trim(), timezone });
      setNotice('Profile saved.');
      setError('');
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveOrg(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.renameOrg(orgName.trim());
      setNotice('Organisation saved.');
      setError('');
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-faint">Your profile and the organisation.</p>
      </header>

      {notice ? (
        <div className="mt-5">
          <Banner tone="info">{notice}</Banner>
        </div>
      ) : null}
      {error ? (
        <div className="mt-5">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      <section className="card mt-6 px-6 py-5">
        <h2 className="text-sm font-semibold text-ink">Profile</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
          <div>
            <label className="label mb-1.5" htmlFor="profile-name">
              Name
            </label>
            <input
              id="profile-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="label mb-1.5" htmlFor="profile-email">
              Email
            </label>
            <input id="profile-email" className="field" value={user.email} readOnly disabled />
          </div>

          <div className="sm:col-span-2">
            <label className="label mb-1.5" htmlFor="profile-timezone">
              Timezone
            </label>
            <select
              id="profile-timezone"
              className="field"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            {suggested && suggested !== timezone ? (
              <p className="mt-2 text-xs text-ink-faint">
                This browser looks like {suggested}.{' '}
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setTimezone(suggested)}
                >
                  Use it
                </button>
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save profile
            </button>
          </div>
        </form>
      </section>

      <section className="card mt-5 px-6 py-5">
        <h2 className="text-sm font-semibold text-ink">Organisation</h2>
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={saveOrg}>
          <div className="min-w-[240px] flex-1">
            <label className="label mb-1.5" htmlFor="org-name">
              Name
            </label>
            <input
              id="org-name"
              className="field"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={user.role !== 'owner'}
            />
          </div>
          <button type="submit" className="btn-secondary" disabled={user.role !== 'owner'}>
            Save organisation
          </button>
        </form>
        {user.role !== 'owner' ? (
          <p className="mt-2 text-xs text-ink-faint">Only an owner can rename the organisation.</p>
        ) : null}
      </section>

      <section className="card mt-5 px-6 py-5">
        <h2 className="text-sm font-semibold text-ink">Members</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="pb-2 font-medium text-ink-faint">Name</th>
              <th className="pb-2 font-medium text-ink-faint">Email</th>
              <th className="pb-2 font-medium text-ink-faint">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-line last:border-b-0">
                <td className="py-2.5 text-ink">{member.name}</td>
                <td className="py-2.5 font-mono text-xs text-ink-soft">{member.email}</td>
                <td className="py-2.5 capitalize text-ink-soft">{member.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
