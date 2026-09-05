import { useEffect, useState } from 'react';
import { api } from '../api';
import { Banner, Modal, Spinner } from '../components/ui';
import { formatMoney, formatMonth } from '../lib';
import type { Invoice, Subscription } from '../types';

const PLANS = [
  { id: 'starter', name: 'Starter', price: 900, blurb: 'Up to five people, one project at a time.' },
  { id: 'team', name: 'Team', price: 1600, blurb: 'Unlimited projects, shared billing, exports.' },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 3200,
    blurb: 'Audit log, single sign-on, priority support.',
  },
];

export function Billing() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [checkout, setCheckout] = useState(false);
  const [choice, setChoice] = useState('enterprise');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.subscription(), api.invoices()])
      .then(([sub, list]) => {
        setSubscription(sub);
        setInvoices(list.invoices);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  function confirmUpgrade() {
    const plan = PLANS.find((p) => p.id === choice);
    setCheckout(false);
    setNotice(`We have your request to move to ${plan?.name}. Billing applies it at the next cycle.`);
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-8 py-8">
        <Banner tone="error">{error}</Banner>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="mx-auto w-full max-w-4xl px-8 py-8">
        <Spinner />
      </div>
    );
  }

  const current = PLANS.find((p) => p.id === subscription.plan);

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Billing</h1>
        <p className="mt-1 text-sm text-ink-faint">Your plan, seats and invoices.</p>
      </header>

      {notice ? (
        <div className="mt-5">
          <Banner tone="info">{notice}</Banner>
        </div>
      ) : null}

      <section className="card mt-6 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Current plan</p>
            <p className="mt-1 text-lg font-semibold capitalize text-ink">{subscription.plan}</p>
            <p className="mt-1 text-sm text-ink-faint">
              {current?.blurb ?? 'A custom plan agreed with sales.'}
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setCheckout(true)}>
            Upgrade
          </button>
        </div>

        <dl className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <dt className="label">Seats</dt>
            <dd className="mt-1 text-sm text-ink">{subscription.seats}</dd>
          </div>
          <div>
            <dt className="label">Per seat</dt>
            <dd className="mt-1 text-sm tabular-nums text-ink">
              {formatMoney(subscription.seat_price_cents)} a month
            </dd>
          </div>
          <div>
            <dt className="label">Next invoice</dt>
            <dd className="mt-1 text-sm tabular-nums text-ink">
              {formatMoney(subscription.next_invoice.amount_cents)} in{' '}
              {formatMonth(subscription.next_invoice.period)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card mt-5 px-6 py-5">
        <h2 className="text-sm font-semibold text-ink">Invoices</h2>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="pb-2 font-medium text-ink-faint">Period</th>
              <th className="pb-2 font-medium text-ink-faint">Amount</th>
              <th className="pb-2 font-medium text-ink-faint">Status</th>
              <th className="pb-2 font-medium text-ink-faint">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-line last:border-b-0">
                <td className="py-2.5 text-ink">{formatMonth(invoice.period)}</td>
                <td className="py-2.5 tabular-nums text-ink">{formatMoney(invoice.amount_cents)}</td>
                <td className="py-2.5">
                  <span
                    className={`rounded border px-1.5 py-px text-xs capitalize ${
                      invoice.status === 'paid'
                        ? 'border-positive/30 text-positive'
                        : 'border-line-strong text-ink-soft'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="py-2.5">
                  <a
                    className="font-mono text-xs text-accent hover:underline"
                    href={`/api/v1/billing/invoices/${invoice.id}/pdf`}
                  >
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td className="py-3 text-ink-faint" colSpan={4}>
                  No invoices yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {checkout ? (
        <Modal
          title="Change plan"
          onClose={() => setCheckout(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setCheckout(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={confirmUpgrade}>
                Confirm change
              </button>
            </>
          }
        >
          <div className="space-y-2">
            {PLANS.map((plan) => (
              <label
                key={plan.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 ${
                  choice === plan.id ? 'border-accent bg-accent-soft' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  className="mt-1"
                  value={plan.id}
                  checked={choice === plan.id}
                  onChange={() => setChoice(plan.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{plan.name}</span>
                    <span className="text-sm tabular-nums text-ink-soft">
                      {formatMoney(plan.price)} per seat
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">{plan.blurb}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Card details are held by our payment provider. Nothing is charged until the next cycle.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
