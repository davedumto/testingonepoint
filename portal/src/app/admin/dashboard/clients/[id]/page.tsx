'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import TierBadge from '@/components/TierBadge';
import { secureFetch } from '@/lib/client/secure-fetch';
import type { ClientTier } from '@/lib/tier-meta';

interface Address { street?: string; city?: string; state?: string; zip?: string; }
interface Client {
  _id: string; firstName?: string; lastName?: string; name: string; email: string; phone?: string;
  dateOfBirth?: string; address?: Address; preferredContact?: string; businessName?: string;
  assignedAgent?: string; tier?: ClientTier; createdAt: string;
  ghlContactId?: string; ghlCreatedAt?: string; ghlLastActivity?: string; tags?: string[];
}

function tagStyle(tag: string): { bg: string; color: string } {
  const t = tag.toLowerCase();
  if (t.includes('client')) return { bg: 'rgba(10,125,74,0.14)', color: '#0a7d4a' };
  if (t.includes('lost')) return { bg: 'rgba(220,38,38,0.1)', color: '#9a2f2f' };
  if (t.includes('urgent')) return { bg: 'rgba(220,38,38,0.15)', color: '#9a2f2f' };
  if (t.includes('lead')) return { bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' };
  if (t.includes('quote')) return { bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' };
  return { bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' };
}
interface Policy { _id: string; productName: string; productCategory: string; carrier: string; policyNumber: string; status: string; premium?: number; startDate?: string; endDate?: string; billingType?: string; }
interface SR { _id: string; type: string; description: string; urgency: string; status: string; assignedTo: string; submittedAt: string; completedAt?: string; }
interface Claim { _id: string; incidentType: string; status: string; dateOfLoss: string; carrierClaimNumber?: string; createdAt: string; }
interface Bill { _id: string; type: string; amount: number; status: string; billedBy: string; carrierName?: string; dueDate: string; }
interface Doc { _id: string; name: string; kind: string; category: string; url: string; uploadedAt: string; }
interface Msg { _id: string; senderType: string; senderName: string; body: string; createdAt: string; }

interface Detail {
  client: Client;
  policies: Policy[];
  serviceRequests: SR[];
  claims: Claim[];
  billing: Bill[];
  documents: Doc[];
  messages: Msg[];
  unreadMessagesFromClient: number;
}

const SR_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  submitted: { label: 'Submitted', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  waiting_on_client: { label: 'Waiting on Client', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
  completed: { label: 'Completed', bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a' },
  cancelled: { label: 'Cancelled', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

const TYPE_LABEL: Record<string, string> = {
  policy_change: 'Policy Change', add_vehicle: 'Add Vehicle', remove_driver: 'Remove Driver',
  address_update: 'Address Update', certificate_request: 'COI Request',
  billing_issue: 'Billing Issue', cancellation_request: 'Cancellation',
};

function money(n: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n); }
function fmtDate(iso?: string) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch(`/api/admin/clients/${id}`).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); return; }
      setData(d);
    }).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function assignAgent(agent: string) {
    const res = await secureFetch(`/api/admin/clients/${id}/assign-agent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedAgent: agent || null }),
    });
    if (res.ok) { setToast({ message: 'Agent updated.', type: 'success' }); load(); }
    else setToast({ message: 'Could not update.', type: 'error' });
  }

  async function updateSR(srId: string, patch: { status?: string; comment?: string }) {
    const res = await secureFetch(`/api/admin/service-requests/${srId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) { setToast({ message: 'Request updated.', type: 'success' }); load(); }
    else { const d = await res.json(); setToast({ message: d.error || 'Failed.', type: 'error' }); }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;
  if (error || !data) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>{error || 'Client not found.'}</p>
      <Link href="/admin/dashboard/clients" style={{ color: 'var(--navy)', fontWeight: 600 }}>← Back to clients</Link>
    </div>
  );

  const { client: c } = data;

  return (
    <div style={{ maxWidth: 1100 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/admin/dashboard/clients" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← All clients</Link>

      {/* Header */}
      <div style={{ marginTop: 14, marginBottom: 24, display: 'flex', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em' }}>{c.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {c.email}{c.phone && ` · ${c.phone}`}
            {c.businessName && <> · 🏢 {c.businessName}</>}
          </p>
          <div style={{ marginTop: 10 }}><TierBadge tier={c.tier} size="md" /></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Assigned Agent</label>
          <select value={c.assignedAgent || ''} onChange={e => assignAgent(e.target.value)} className="input" style={{ minWidth: 160 }}>
            <option value="">Unassigned</option>
            <option value="alex">Alex</option>
            <option value="vera">Vera</option>
            <option value="team">Team</option>
          </select>
        </div>
      </div>

      {/* Tags — prominent because they carry lifecycle + carrier context */}
      {(c.tags && c.tags.length > 0) && (
        <section className="card" style={{ padding: 18, marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>
            Tags · {c.tags.length}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {c.tags.map((t, i) => {
              const s = tagStyle(t);
              return (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600 }}>
                  {t}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Profile grid */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Profile</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <Field label="DOB" value={fmtDate(c.dateOfBirth)} />
          <Field label="Preferred Contact" value={c.preferredContact ? c.preferredContact.charAt(0).toUpperCase() + c.preferredContact.slice(1) : '—'} />
          <Field label="Client Since" value={fmtDate(c.createdAt)} />
          {c.address && (
            <Field
              label="Address"
              value={[c.address.street, c.address.city, c.address.state, c.address.zip].filter(Boolean).join(', ') || '—'}
            />
          )}
          {c.ghlCreatedAt && <Field label="GHL Created" value={fmtDate(c.ghlCreatedAt)} />}
          {c.ghlLastActivity && <Field label="Last Activity" value={fmtDate(c.ghlLastActivity)} />}
          {c.ghlContactId && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 3 }}>GHL Contact ID</p>
              <p style={{ fontSize: 11, color: 'var(--ink)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{c.ghlContactId}</p>
            </div>
          )}
        </div>
      </section>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Active Policies" value={String(data.policies.filter(p => p.status === 'active').length)} />
        <StatCard label="Total Policies" value={String(data.policies.length)} />
        <StatCard label="Open Requests" value={String(data.serviceRequests.filter(s => !['completed','cancelled'].includes(s.status)).length)} />
        <StatCard label="Open Claims" value={String(data.claims.filter(c2 => c2.status !== 'closed').length)} />
        <StatCard label="Unread from Client" value={String(data.unreadMessagesFromClient)} emphasize={data.unreadMessagesFromClient > 0} />
      </div>

      {/* Policies with inline create form */}
      <PoliciesSection clientId={c._id} policies={data.policies} onChange={load} onToast={setToast} />

      {/* Billing with inline create form */}
      <BillingSection clientId={c._id} policies={data.policies} billing={data.billing} onChange={load} onToast={setToast} />

      {/* Service Requests with inline status updater */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Service Requests ({data.serviceRequests.length})</h2>
        {data.serviceRequests.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No service requests yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.serviceRequests.map(sr => {
              const meta = SR_STATUS[sr.status];
              return (
                <div key={sr._id} style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{TYPE_LABEL[sr.type] || sr.type}</p>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {meta.label}
                    </span>
                    {(sr.urgency === 'high' || sr.urgency === 'urgent') && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{sr.urgency}</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--subtle)', marginLeft: 'auto' }}>{fmtDate(sr.submittedAt)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>{sr.description}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['in_progress', 'waiting_on_client', 'completed', 'cancelled'] as const).filter(s => s !== sr.status).map(s => (
                      <button
                        key={s}
                        onClick={() => updateSR(sr._id, { status: s })}
                        style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}
                      >
                        → {SR_STATUS[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Claims */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Claims ({data.claims.length})</h2>
        {data.claims.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No claims on record.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.claims.map(c2 => (
              <div key={c2._id} style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{c2.incidentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} · <span style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--muted)' }}>{c2.status}</span></p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Loss {fmtDate(c2.dateOfLoss)}{c2.carrierClaimNumber && ` · Carrier #${c2.carrierClaimNumber}`}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documents + upload form */}
      <DocumentsSection clientId={c._id} policies={data.policies} documents={data.documents} onChange={load} onToast={setToast} />

      {/* Recent messages + agent reply composer */}
      <MessagesSection
        clientId={c._id}
        messages={data.messages}
        unreadFromClient={data.unreadMessagesFromClient}
        onSent={load}
        onToast={setToast}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}

function PoliciesSection({
  clientId,
  policies,
  onChange,
  onToast,
}: {
  clientId: string;
  policies: Policy[];
  onChange: () => void;
  onToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState<'auto' | 'home' | 'health' | 'life' | 'disability' | 'business'>('auto');
  const [carrier, setCarrier] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premium, setPremium] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingType, setBillingType] = useState<'carrier_direct' | 'agency_billed' | 'unknown'>('unknown');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await secureFetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: clientId,
          productName: productName.trim(),
          productCategory,
          carrier: carrier.trim(),
          policyNumber: policyNumber.trim(),
          premium: premium ? Number(premium) : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          billingType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { onToast({ message: data.error || 'Could not create.', type: 'error' }); return; }
      onToast({ message: 'Policy created.', type: 'success' });
      setShowForm(false);
      setProductName(''); setCarrier(''); setPolicyNumber(''); setPremium(''); setStartDate(''); setEndDate('');
      onChange();
    } finally { setSaving(false); }
  }

  return (
    <section className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Policies ({policies.length})</h2>
        <button type="button" onClick={() => setShowForm(!showForm)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--navy)' }}>
          {showForm ? 'Cancel' : '+ New policy'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} style={{ padding: 14, background: 'var(--surface)', borderRadius: 10, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Product name</label>
              <input type="text" required className="input" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Auto Insurance" />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Category</label>
              <select className="input" value={productCategory} onChange={e => setProductCategory(e.target.value as typeof productCategory)}>
                <option value="auto">Auto</option>
                <option value="home">Home</option>
                <option value="health">Health</option>
                <option value="life">Life</option>
                <option value="disability">Disability</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Carrier</label>
              <input type="text" required className="input" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. Progressive" />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Policy number</label>
              <input type="text" required className="input" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Monthly premium (optional)</label>
              <input type="number" step="0.01" min="0" className="input" value={premium} onChange={e => setPremium(e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Billing type</label>
              <select className="input" value={billingType} onChange={e => setBillingType(e.target.value as typeof billingType)}>
                <option value="unknown">Unknown</option>
                <option value="carrier_direct">Carrier direct</option>
                <option value="agency_billed">Agency billed</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Effective date</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Expiration date</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '8px 16px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
            {saving ? 'Creating…' : 'Create policy'}
          </button>
        </form>
      )}

      {policies.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No policies on file.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {policies.map(p => (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{p.productName}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>{p.carrier} · #{p.policyNumber} · {p.status}{p.billingType && ` · ${p.billingType === 'carrier_direct' ? 'Carrier-billed' : p.billingType === 'agency_billed' ? 'Agency-billed' : ''}`}</p>
              </div>
              {p.premium != null && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{money(p.premium)}/mo</span>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BillingSection({
  clientId,
  policies,
  billing,
  onChange,
  onToast,
}: {
  clientId: string;
  policies: Policy[];
  billing: Bill[];
  onChange: () => void;
  onToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [policyId, setPolicyId] = useState('');
  const [type, setType] = useState<'invoice' | 'payment' | 'statement'>('invoice');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending' | 'missed' | 'scheduled' | 'refunded'>('scheduled');
  const [billedBy, setBilledBy] = useState<'carrier' | 'agency'>('agency');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!policyId) { onToast({ message: 'Pick a policy.', type: 'error' }); return; }
    setSaving(true);
    try {
      const res = await secureFetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: clientId,
          policyId,
          type,
          amount: Number(amount),
          dueDate,
          status,
          billedBy,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { onToast({ message: data.error || 'Could not create.', type: 'error' }); return; }
      onToast({ message: 'Billing record created.', type: 'success' });
      setShowForm(false);
      setAmount(''); setDueDate(''); setDescription('');
      onChange();
    } finally { setSaving(false); }
  }

  return (
    <section className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Recent Billing ({billing.length})</h2>
        <button type="button" onClick={() => setShowForm(!showForm)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--navy)' }}>
          {showForm ? 'Cancel' : '+ New record'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} style={{ padding: 14, background: 'var(--surface)', borderRadius: 10, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Policy</label>
              <select required className="input" value={policyId} onChange={e => setPolicyId(e.target.value)}>
                <option value="">Choose…</option>
                {policies.map(p => <option key={p._id} value={p._id}>{p.productName} · {p.carrier} · #{p.policyNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as typeof type)}>
                <option value="invoice">Invoice</option>
                <option value="payment">Payment</option>
                <option value="statement">Statement</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Amount</label>
              <input type="number" step="0.01" min="0" required className="input" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Due date</label>
              <input type="date" required className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="missed">Missed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Billed by</label>
              <select className="input" value={billedBy} onChange={e => setBilledBy(e.target.value as 'carrier' | 'agency')}>
                <option value="agency">OnePoint (agency billed)</option>
                <option value="carrier">Carrier (direct bill)</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label className="label" style={{ fontSize: 10 }}>Description (optional)</label>
            <input type="text" className="input" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
          </div>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '8px 16px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
            {saving ? 'Creating…' : 'Create record'}
          </button>
        </form>
      )}

      {billing.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No billing records.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {billing.slice(0, 10).map(b => (
            <div key={b._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'var(--surface)', borderRadius: 8, gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{money(b.amount)} · {b.type}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>Due {fmtDate(b.dueDate)} · {b.billedBy === 'carrier' ? `Billed by ${b.carrierName || 'carrier'}` : 'Billed by OnePoint'}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: b.status === 'paid' ? '#0a7d4a' : b.status === 'missed' ? '#9a2f2f' : 'var(--muted)' }}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MessagesSection({
  clientId,
  messages,
  unreadFromClient,
  onSent,
  onToast,
}: {
  clientId: string;
  messages: Msg[];
  unreadFromClient: number;
  onSent: () => void;
  onToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await secureFetch(`/api/admin/messages/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { onToast({ message: data.error || 'Could not send.', type: 'error' }); return; }
      setBody('');
      onToast({ message: 'Reply sent.', type: 'success' });
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card" style={{ padding: 22, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Messages ({messages.length})</h2>
        {unreadFromClient > 0 && (
          <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
            {unreadFromClient} unread from client
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>No messages yet. Start the conversation below.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 420, overflowY: 'auto' }}>
          {messages.map(m => (
            <div key={m._id} style={{ padding: 10, background: m.senderType === 'client' ? 'rgba(10,61,107,0.06)' : 'var(--surface)', borderRadius: 8, borderLeft: `3px solid ${m.senderType === 'client' ? 'var(--navy)' : '#0a7d4a'}` }}>
              <p style={{ fontSize: 11, color: 'var(--subtle)', marginBottom: 2 }}>
                <strong style={{ color: 'var(--ink)' }}>{m.senderName}</strong> · {m.senderType} · {fmtDate(m.createdAt)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Agent reply composer */}
      <form onSubmit={send} style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Reply to client</p>
        <textarea
          className="input"
          rows={3}
          maxLength={5000}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type your reply… the client gets a notification + email alert."
          style={{ resize: 'vertical', minHeight: 80, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={sending || !body.trim()} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
            {sending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </form>
    </section>
  );
}

function StatCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="card-sm" style={{ padding: 14, background: emphasize ? 'rgba(220,38,38,0.06)' : undefined, borderColor: emphasize ? 'rgba(220,38,38,0.3)' : undefined }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: emphasize ? '#9a2f2f' : 'var(--navy)', marginTop: 2 }}>{value}</p>
    </div>
  );
}

// All DocumentKind values grouped by category so the admin can pick the
// right kind without memorizing the enum. Labels match what the client sees
// in /dashboard/documents.
const ADMIN_DOC_KINDS: { group: string; options: { value: string; label: string }[] }[] = [
  { group: 'Active Policies', options: [
    { value: 'dec', label: 'Declaration (DEC)' },
    { value: 'id_card', label: 'ID Card' },
    { value: 'endorsement', label: 'Endorsement' },
    { value: 'full_policy', label: 'Full Policy' },
    { value: 'renewal', label: 'Renewal' },
    { value: 'coi', label: 'Certificate of Insurance' },
  ]},
  { group: 'Quotes', options: [
    { value: 'quote_summary', label: 'Quote Summary' },
    { value: 'coverage_comparison', label: 'Coverage Comparison' },
    { value: 'quote_supporting', label: 'Supporting Doc' },
  ]},
  { group: 'Billing', options: [
    { value: 'invoice', label: 'Invoice' },
    { value: 'payment_confirmation', label: 'Payment Confirmation' },
    { value: 'billing_statement', label: 'Statement' },
  ]},
  { group: 'Claims', options: [
    { value: 'fnol', label: 'First Notice of Loss' },
    { value: 'claim_photo', label: 'Claim Photo' },
    { value: 'adjuster_report', label: 'Adjuster Report' },
    { value: 'claim_correspondence', label: 'Correspondence' },
    { value: 'settlement', label: 'Settlement' },
  ]},
  { group: 'Compliance', options: [
    { value: 'coverage_selection', label: 'Coverage Selection' },
    { value: 'rejection_form', label: 'Rejection Form (E&O critical)' },
    { value: 'cancellation_request', label: 'Cancellation Request' },
    { value: 'no_loss_statement', label: 'No Loss Statement' },
    { value: 'esign', label: 'E-Signature' },
  ]},
];

// Kinds that need extra metadata. Used to conditionally show the extra fields.
const QUOTE_KINDS = new Set(['quote_summary', 'coverage_comparison', 'quote_supporting']);
const BILLING_KINDS = new Set(['invoice', 'payment_confirmation', 'billing_statement']);

function DocumentsSection({
  clientId,
  policies,
  documents,
  onChange,
  onToast,
}: {
  clientId: string;
  policies: Policy[];
  documents: Doc[];
  onChange: () => void;
  onToast: (t: { message: string; type: 'success' | 'error' }) => void;
}) {
  const [kind, setKind] = useState('dec');
  const [policyId, setPolicyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [quoteVersion, setQuoteVersion] = useState('quoted');
  const [billedBy, setBilledBy] = useState<'carrier' | 'agency'>('agency');
  const [uploading, setUploading] = useState(false);

  const isQuote = QUOTE_KINDS.has(kind);
  const isBilling = BILLING_KINDS.has(kind);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', clientId);
      fd.append('kind', kind);
      if (policyId) fd.append('policyId', policyId);
      if (name.trim()) fd.append('name', name.trim());
      if (isQuote) fd.append('quoteVersion', quoteVersion);
      if (isBilling) fd.append('billedBy', billedBy);

      const res = await secureFetch('/api/admin/client-documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { onToast({ message: data.error || 'Upload failed.', type: 'error' }); return; }

      onToast({ message: 'Document uploaded.', type: 'success' });
      setFile(null);
      setName('');
      onChange();
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="card" style={{ padding: 22, marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Documents ({documents.length})</h2>

      <form onSubmit={upload} style={{ background: 'var(--surface)', padding: 14, borderRadius: 10, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Upload to this client&apos;s vault</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label className="label" style={{ fontSize: 10 }}>Document kind</label>
            <select className="input" value={kind} onChange={e => setKind(e.target.value)}>
              {ADMIN_DOC_KINDS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label" style={{ fontSize: 10 }}>Related policy (optional)</label>
            <select className="input" value={policyId} onChange={e => setPolicyId(e.target.value)}>
              <option value="">No policy</option>
              {policies.map(p => (
                <option key={p._id} value={p._id}>{p.productName} · {p.carrier} · #{p.policyNumber}</option>
              ))}
            </select>
          </div>
        </div>

        {(isQuote || isBilling) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {isQuote && (
              <div>
                <label className="label" style={{ fontSize: 10 }}>Quote version</label>
                <select className="input" value={quoteVersion} onChange={e => setQuoteVersion(e.target.value)}>
                  <option value="quoted">Quoted</option>
                  <option value="revised">Revised</option>
                  <option value="final_option">Final Option</option>
                </select>
              </div>
            )}
            {isBilling && (
              <div>
                <label className="label" style={{ fontSize: 10 }}>Billed by</label>
                <select className="input" value={billedBy} onChange={e => setBilledBy(e.target.value as 'carrier' | 'agency')}>
                  <option value="agency">OnePoint (agency billed)</option>
                  <option value="carrier">Carrier (direct bill)</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label className="label" style={{ fontSize: 10 }}>Display name (optional)</label>
            <input type="text" className="input" placeholder="Auto-generated if blank" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" style={{ fontSize: 10 }}>File</label>
            <input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="input" />
          </div>
        </div>

        <button type="submit" disabled={!file || uploading} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
          {uploading ? 'Uploading…' : 'Upload to vault'}
        </button>
      </form>

      {documents.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No documents in this client&apos;s vault yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {documents.slice(0, 20).map(d => (
            <a key={d._id} href={d.url} target="_blank" rel="noopener" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'var(--surface)', borderRadius: 8, textDecoration: 'none', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                <p style={{ fontSize: 11, color: 'var(--subtle)' }}>{d.kind} · {d.category} · {fmtDate(d.uploadedAt)}</p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Open →</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
