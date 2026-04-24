'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTier } from '@/lib/products';
import { IconPolicies } from '@/components/Icons';

interface Policy {
  _id: string;
  productName: string;
  productCategory: string;
  carrier: string;
  policyNumber: string;
  status: string;
  premium?: number;
  billingType?: 'carrier_direct' | 'agency_billed' | 'unknown';
  nextDraftDate?: string;
}

// Category accent left-bar color. Kept here rather than imported so edits to
// the color palette stay local and don't leak into the marketing product grid.
const CC: Record<string, string> = {
  auto: '#0a3d6b', home: '#052847', health: '#0a3d6b',
  life: '#052847', disability: '#0a3d6b', business: '#052847',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a' },
  pending: { label: 'Pending', bg: 'rgba(232,199,78,0.18)', color: '#8a5a00' },
  expired: { label: 'Expired', bg: 'rgba(232,199,78,0.18)', color: '#8a5a00' },
  cancelled: { label: 'Cancelled', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
  reinstatement_needed: { label: 'Reinstate', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/policies').then(r => r.json()).then(d => setPolicies(d.policies || [])).finally(() => setLoading(false)); }, []);
  const tier = getTier(policies.length);

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>Loading policies…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>My Policies</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{policies.length} active {policies.length === 1 ? 'policy' : 'policies'}</p>
        </div>
        <div className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: tier.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>{tier.label[0]}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{tier.label} Tier</div>
            {tier.next && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Add 1 more for {tier.next}</div>}
          </div>
        </div>
      </div>

      {policies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <IconPolicies style={{ width: 48, height: 48, color: 'var(--subtle)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No policies yet</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Your policies will appear here once synced from OnePoint.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {policies.map(p => {
            const statusMeta = STATUS_BADGE[p.status] || STATUS_BADGE.active;
            const billingDirect = p.billingType === 'carrier_direct';
            return (
              <Link
                key={p._id}
                href={`/dashboard/policies/${p._id}`}
                className="card-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 20, textDecoration: 'none', padding: 18 }}
              >
                <div style={{ width: 4, height: 64, borderRadius: 2, background: CC[p.productCategory] || 'var(--subtle)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{p.productName}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {p.carrier} · #{p.policyNumber}
                    {billingDirect && <span style={{ marginLeft: 8, color: 'var(--blue, #0a3d6b)', fontWeight: 600 }}>· Billed by {p.carrier}</span>}
                    {p.nextDraftDate && <span style={{ marginLeft: 8, color: 'var(--subtle)' }}>· Next draft {formatDate(p.nextDraftDate)}</span>}
                  </p>
                </div>
                {p.premium != null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>${p.premium}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
                  </div>
                )}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
