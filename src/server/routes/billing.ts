import { Hono } from 'hono';
import { requireSession } from '../auth.js';
import { getDb } from '../db.js';
import { badRequest } from '../errors.js';
import { listInvoices } from '../queries.js';
import type { AppEnv, OrgRow } from '../types.js';

const SEAT_PRICE_CENTS: Record<string, number> = {
  starter: 900,
  team: 1600,
  enterprise: 3200,
};

export const billingRoutes = new Hono<AppEnv>();

billingRoutes.get('/billing/subscription', requireSession, (c) => {
  const { org } = c.get('session');
  const db = getDb();
  const seats = (
    db.prepare('SELECT COUNT(*) AS n FROM users WHERE org_id = ?').get(org.id) as { n: number }
  ).n;
  const seatPrice = SEAT_PRICE_CENTS[org.plan] ?? SEAT_PRICE_CENTS.starter;

  const next = new Date();
  next.setMonth(next.getMonth() + 1, 1);
  const period = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;

  return c.json({
    plan: org.plan,
    seats,
    seat_price_cents: seatPrice,
    next_invoice: {
      period,
      amount_cents: seats * seatPrice,
      due_date: `${period}-01`,
    },
  });
});

billingRoutes.get('/billing/invoices', requireSession, (c) => {
  const { org } = c.get('session');
  return c.json({ invoices: listInvoices(org.id) });
});

billingRoutes.post('/billing/webhook', async (c) => {
  const event = await c.req.json().catch(() => null);
  const type = typeof event?.type === 'string' ? event.type : '';
  if (!type) throw badRequest('Event type is required');

  const db = getDb();
  const slug = typeof event?.org_slug === 'string' ? event.org_slug : '';
  const org = slug
    ? (db.prepare('SELECT * FROM orgs WHERE slug = ?').get(slug) as OrgRow | undefined)
    : undefined;

  if (type === 'subscription.updated' && org) {
    const plan = typeof event?.plan === 'string' ? event.plan : org.plan;
    db.prepare('UPDATE orgs SET plan = ? WHERE id = ?').run(plan, org.id);
  }

  if (type === 'invoice.paid' && org) {
    const invoiceId = Number(event?.invoice_id);
    if (Number.isInteger(invoiceId)) {
      db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ? AND org_id = ?").run(
        invoiceId,
        org.id,
      );
    }
  }

  return c.json({ received: true });
});
