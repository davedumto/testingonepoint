'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface CoverageLine { name: string; description?: string; limit?: string; }
interface Endorsement { name: string; description?: string; effectiveDate?: string; }
interface PaymentMethod { type?: 'card' | 'ach' | 'other'; last4?: string; }
interface PolicyDetail {
  _id: string;
  productName: string;
  productCategory: string;
  carrier: string;
  policyNumber: string;
  status: string;
  startDate?: string;
  endDate?: string;
  premium?: number;
  billingType?: 'carrier_direct' | 'agency_billed' | 'unknown';
  nextDraftDate?: string;
  paymentMethod?: PaymentMethod;
  limits?: Record<string, string>;
  deductibles?: Record<string, string>;
  keyCoverages?: CoverageLine[];
  endorsements?: Endorsement[];
}
interface LinkedDoc { _id: string; kind: string; name: string; url: string; isPinned: boolean; uploadedAt: string; }

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#0a7d4a', bg: 'rgba(10,125,74,0.12)' },
  pending: { label: 'Pending', color: '#8a5a00', bg: 'rgba(232,199,78,0.18)' },
  expired: { label: 'Expired', color: '#8a5a00', bg: 'rgba(232,199,78,0.18)' },
  cancelled: { label: 'Cancelled', color: '#9a2f2f', bg: 'rgba(220,38,38,0.12)' },
  reinstatement_needed: { label: 'Reinstatement Needed', color: '#9a2f2f', bg: 'rgba(220,38,38,0.12)' },
};

const DOC_KIND_LABEL: Record<string, string> = {
  id_card: 'ID Card', dec: 'Policy Declaration', endorsement: 'Endorsement',
  full_policy: 'Full Policy', renewal: 'Renewal', coi: 'Certificate',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [docs, setDocs] = useState<LinkedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/policies/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setPolicy(d.policy);
        setDocs(d.documents || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;
  if (error || !policy) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 20, textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>{error || 'Policy not found.'}</p>
      <Link href="/dashboard/policies" style={{ color: 'var(--blue, #0a3d6b)', fontWeight: 600 }}>← Back to policies</Link>
    </div>
  );

  const statusMeta = STATUS_META[policy.status] || STATUS_META.active;
  const billingDirect = policy.billingType === 'carrier_direct';
  const billingAgency = policy.billingType === 'agency_billed';

  return (
    <div style={{ maxWidth: 880 }}>
      <Link href="/dashboard/policies" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to policies</Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 14, marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>{policy.productCategory}</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{policy.productName}</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{policy.carrier} · Policy #{policy.policyNumber}</p>
        </div>
        <span style={{ padding: '6px 14px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {statusMeta.label}
        </span>
      </div>

      {/* Billing clarity banner — spec §9 calls this VERY IMPORTANT */}
      {billingDirect && (
        <div style={{ background: 'rgba(10,61,107,0.08)', border: '1px solid rgba(10,61,107,0.2)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0a3d6b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>This policy is billed directly by {policy.carrier}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>You&apos;ll see a charge from <strong>{policy.carrier}</strong> on your statement, not from OnePoint Insurance Agency.</p>
          </div>
        </div>
      )}
      {billingAgency && (
        <div style={{ background: 'rgba(10,125,74,0.08)', border: '1px solid rgba(10,125,74,0.2)', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0a7d4a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>This policy is billed by OnePoint Insurance Agency</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>Your statement will show a charge from OnePoint.</p>
          </div>
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <button type="button" className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>Request Change</button>
        <button type="button" className="btn btn-outline" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>Report a Claim</button>
      </div>

      {/* Financials */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Financials</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Monthly Premium</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{policy.premium != null ? `$${policy.premium.toFixed(2)}` : '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Next Draft</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{formatDate(policy.nextDraftDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Payment Method</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              {policy.paymentMethod?.last4
                ? `${policy.paymentMethod.type === 'ach' ? 'Bank' : 'Card'} ending ${policy.paymentMethod.last4}`
                : 'Not on file'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Billing Type</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              {billingDirect ? 'Direct from carrier' : billingAgency ? 'Via OnePoint' : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* Coverage summary */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Coverage</h2>

        {(policy.limits && Object.keys(policy.limits).length > 0) ? (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Limits</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {Object.entries(policy.limits).map(([k, v]) => (
                <div key={k} style={{ padding: 10, background: 'var(--surface)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(policy.deductibles && Object.keys(policy.deductibles).length > 0) ? (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Deductibles</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {Object.entries(policy.deductibles).map(([k, v]) => (
                <div key={k} style={{ padding: 10, background: 'var(--surface)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(policy.keyCoverages && policy.keyCoverages.length > 0) ? (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Key Coverages</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policy.keyCoverages.map((c, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 10, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</p>
                    {c.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.description}</p>}
                  </div>
                  {c.limit && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{c.limit}</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(policy.endorsements && policy.endorsements.length > 0) ? (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Endorsements</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policy.endorsements.map((e, i) => (
                <li key={i} style={{ padding: 10, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{e.name}</p>
                    {e.effectiveDate && <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{formatDate(e.effectiveDate)}</span>}
                  </div>
                  {e.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!policy.limits && !policy.deductibles && !policy.keyCoverages?.length && !policy.endorsements?.length && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Coverage details haven&apos;t been uploaded yet. Contact your advisor if you need specifics.</p>
        )}
      </section>

      {/* Documents */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Documents</h2>
          <Link href={`/dashboard/documents?policyId=${policy._id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue, #0a3d6b)' }}>Open vault →</Link>
        </div>
        {docs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No documents on file for this policy yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <a
                key={d._id}
                href={d.url}
                target="_blank"
                rel="noopener"
                onClick={() => { try { fetch(`/api/documents/${d._id}/view-log`, { method: 'POST', keepalive: true }); } catch { /* best-effort */ } }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--surface)', borderRadius: 8, textDecoration: 'none', gap: 10 }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--subtle)' }}>{DOC_KIND_LABEL[d.kind] || d.kind} · {formatDate(d.uploadedAt)}</p>
                </div>
                {d.isPinned && <span style={{ fontSize: 11, color: 'var(--blue, #0a3d6b)', fontWeight: 700 }}>📌 Pinned</span>}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                </svg>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Term dates */}
      <section className="card" style={{ padding: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Effective</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{formatDate(policy.startDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Expires</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{formatDate(policy.endDate)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
