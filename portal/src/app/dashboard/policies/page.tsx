'use client';

import { useEffect, useState } from 'react';
import { getTier } from '@/lib/products';
import { IconPolicies } from '@/components/Icons';

interface Policy { _id: string; productName: string; productCategory: string; carrier: string; policyNumber: string; status: string; premium?: number; }

const CC: Record<string, string> = { auto: '#dc2626', home: '#2e9a55', health: '#0d9488', life: '#7c3aed', disability: '#052847', business: '#052847' };

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/policies').then(r => r.json()).then(d => setPolicies(d.policies || [])).finally(() => setLoading(false)); }, []);
  const tier = getTier(policies.length);

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>Loading policies...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>My Policies</h1>
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
        <div>
          {policies.map(p => (
            <div key={p._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 8 }}>
              <div style={{ width: 4, height: 56, borderRadius: 2, background: CC[p.productCategory] || 'var(--subtle)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{p.productName}</h3>
                  <span className="badge badge-green">{p.status}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{p.carrier} · #{p.policyNumber}</p>
              </div>
              {p.premium && <div style={{ textAlign: 'right' }}><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>${p.premium}</span><span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span></div>}
              <div style={{ fontSize: 11, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{p.productCategory}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
