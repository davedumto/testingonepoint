'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Status = 'reported' | 'under_review' | 'in_progress' | 'closed';

interface Claim {
  _id: string;
  policyId: string;
  carrierClaimNumber?: string;
  incidentType: string;
  dateOfLoss: string;
  status: Status;
  description: string;
  attachmentCount: number;
  createdAt: string;
  closedAt?: string;
}

const INCIDENT_LABEL: Record<string, string> = {
  auto_accident: 'Auto Accident', auto_theft: 'Auto Theft',
  property_damage: 'Property Damage', water_damage: 'Water Damage',
  fire: 'Fire', theft_burglary: 'Theft / Burglary',
  liability: 'Liability', medical: 'Medical',
  business_interruption: 'Business Interruption', other: 'Other',
};

// Per spec §D6 — statuses must never say "Approved". "Closed" covers both
// settled and denied outcomes without prejudging coverage.
const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  reported: { label: 'Reported', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  under_review: { label: 'Under Review', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  closed: { label: 'Closed', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/claims')
      .then(r => r.json())
      .then(d => setClaims(d.claims || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Claims</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>File a claim, see the status, and add supporting documents.</p>
        </div>
        <Link href="/dashboard/claims/new" className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>
          + Report a Claim
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : claims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No claims on record</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>If something happened, report it here and we&apos;ll get the carrier involved.</p>
          <Link href="/dashboard/claims/new" className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>
            Report a claim
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claims.map(c => {
            const meta = STATUS_META[c.status];
            return (
              <Link key={c._id} href={`/dashboard/claims/${c._id}`} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, textDecoration: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{INCIDENT_LABEL[c.incidentType] || c.incidentType}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {meta.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                    Loss on {formatDate(c.dateOfLoss)} · Reported {formatDate(c.createdAt)}
                    {c.carrierClaimNumber && ` · Carrier #${c.carrierClaimNumber}`}
                  </p>
                </div>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {/* Compliance disclaimer per spec §11 */}
      <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 30, lineHeight: 1.55 }}>
        Claim submission does not guarantee claim approval. Coverage is subject to your policy terms and conditions.
      </p>
    </div>
  );
}
