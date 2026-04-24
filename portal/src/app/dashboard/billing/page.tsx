'use client';

import { useEffect, useState } from 'react';

type BilledBy = 'carrier' | 'agency';
type Status = 'paid' | 'pending' | 'missed' | 'scheduled' | 'refunded';

interface BillRecord {
  _id: string;
  policyId: string;
  type: 'invoice' | 'payment' | 'statement';
  amount: number;
  currency: string;
  dueDate: string;
  paidDate?: string;
  status: Status;
  billedBy: BilledBy;
  carrierName?: string;
  carrierPortalUrl?: string;
  description?: string;
}

interface Data { upcoming: BillRecord[]; missed: BillRecord[]; history: BillRecord[]; }

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  paid:      { label: 'Paid',      bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a' },
  pending:   { label: 'Pending',   bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  missed:    { label: 'Missed',    bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
  scheduled: { label: 'Scheduled', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  refunded:  { label: 'Refunded',  bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

function money(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BillingPage() {
  const [data, setData] = useState<Data>({ upcoming: [], missed: [], history: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => setData({ upcoming: d.upcoming || [], missed: d.missed || [], history: d.history || [] })).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>;

  const anyRecords = data.upcoming.length + data.missed.length + data.history.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Billing &amp; Payments</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Payment history, upcoming drafts, and who&apos;s charging you — carrier or OnePoint.</p>
      </div>

      {!anyRecords && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No billing records yet</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Payments will show up here once your policies are synced.</p>
        </div>
      )}

      {data.missed.length > 0 && (
        <Section title="Missed Payments" subtitle="Please resolve as soon as possible" records={data.missed} emphasize />
      )}

      {data.upcoming.length > 0 && (
        <Section title="Upcoming" subtitle="Scheduled and pending drafts" records={data.upcoming} />
      )}

      {data.history.length > 0 && (
        <Section title="Payment History" subtitle="Past invoices and payments" records={data.history} />
      )}
    </div>
  );
}

function Section({ title, subtitle, records, emphasize }: { title: string; subtitle: string; records: BillRecord[]; emphasize?: boolean }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: emphasize ? '#9a2f2f' : 'var(--navy)' }}>{title}</h2>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {records.map(r => <BillingRow key={r._id} r={r} />)}
      </div>
    </section>
  );
}

function BillingRow({ r }: { r: BillRecord }) {
  const meta = STATUS_META[r.status];
  const isDirect = r.billedBy === 'carrier';
  return (
    <div className="card-sm" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{money(r.amount, r.currency)}</p>
          <span style={{ padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--subtle)', textTransform: 'capitalize' }}>· {r.type}</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          {r.status === 'paid' || r.status === 'refunded' ? `Cleared ${formatDate(r.paidDate || r.dueDate)}` : `Due ${formatDate(r.dueDate)}`}
        </p>
        {/* §9 clarity label — repeated per row so clients can never miss who's charging them */}
        <p style={{ fontSize: 11, color: isDirect ? 'var(--blue, #0a3d6b)' : '#0a7d4a', fontWeight: 600, marginTop: 4 }}>
          {isDirect
            ? `Billed by ${r.carrierName || 'carrier'} — charge appears from ${r.carrierName || 'the carrier'}`
            : 'Billed by OnePoint Insurance Agency'}
        </p>
        {r.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{r.description}</p>}
      </div>
      {isDirect && r.carrierPortalUrl && r.status !== 'paid' && (
        <a href={r.carrierPortalUrl} target="_blank" rel="noopener" style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--navy)', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
          Pay on {r.carrierName || 'carrier'} →
        </a>
      )}
    </div>
  );
}
