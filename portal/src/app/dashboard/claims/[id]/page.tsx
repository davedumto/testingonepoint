'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

type Status = 'reported' | 'under_review' | 'in_progress' | 'closed';

interface TimelineEvent { status: Status; note?: string; setBy: string; at: string; }
interface Attachment { name: string; url: string; uploadedAt: string; }
interface ClaimDetail {
  _id: string;
  policyId: string;
  carrierClaimNumber?: string;
  incidentType: string;
  dateOfLoss: string;
  description: string;
  locationOfLoss?: string;
  attachments: Attachment[];
  status: Status;
  timeline: TimelineEvent[];
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  disclaimerAcceptedAt: string;
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

const STATUS_META: Record<Status, { label: string; bg: string; color: string; step: number }> = {
  reported: { label: 'Reported', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b', step: 1 },
  under_review: { label: 'Under Review', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00', step: 2 },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00', step: 3 },
  closed: { label: 'Closed', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e', step: 4 },
};

const STEPS: Status[] = ['reported', 'under_review', 'in_progress', 'closed'];

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/claims/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setClaim(d.claim);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;
  if (error || !claim) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 20, textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>{error || 'Claim not found.'}</p>
      <Link href="/dashboard/claims" style={{ color: 'var(--blue, #0a3d6b)', fontWeight: 600 }}>← Back to claims</Link>
    </div>
  );

  const currentStep = STATUS_META[claim.status].step;

  return (
    <div style={{ maxWidth: 780 }}>
      <Link href="/dashboard/claims" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to claims</Link>

      <div style={{ marginTop: 14, marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Claim</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em' }}>{INCIDENT_LABEL[claim.incidentType] || claim.incidentType}</h1>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
          Date of loss {formatDate(claim.dateOfLoss)} · Reported {formatDate(claim.createdAt)}
          {claim.carrierClaimNumber && ` · Carrier #${claim.carrierClaimNumber}`}
        </p>
      </div>

      {/* Status tracker — 4-step progress */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {STEPS.map((step, idx) => {
            const meta = STATUS_META[step];
            const done = idx < currentStep;
            const current = idx === currentStep - 1;
            return (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  background: done || current ? meta.color : 'var(--line)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  margin: '0 auto 6px',
                }}>{idx + 1}</div>
                <p style={{ fontSize: 11, fontWeight: 600, color: current ? meta.color : 'var(--muted)' }}>{meta.label}</p>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 14, lineHeight: 1.55, textAlign: 'center' }}>
          &quot;Closed&quot; covers both settled and denied outcomes. Coverage is subject to your policy terms and conditions.
        </p>
      </section>

      {/* Incident details */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Incident details</h2>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{claim.description}</p>
        {claim.locationOfLoss && (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
            <strong>Location:</strong> {claim.locationOfLoss}
          </p>
        )}
      </section>

      {/* Adjuster contact (if assigned) */}
      {(claim.adjusterName || claim.adjusterPhone || claim.adjusterEmail) && (
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Your adjuster</h2>
          {claim.adjusterName && <p style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{claim.adjusterName}</p>}
          {claim.adjusterPhone && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}><a href={`tel:${claim.adjusterPhone}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>{claim.adjusterPhone}</a></p>}
          {claim.adjusterEmail && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}><a href={`mailto:${claim.adjusterEmail}`} style={{ color: 'var(--navy)', textDecoration: 'none' }}>{claim.adjusterEmail}</a></p>}
        </section>
      )}

      {/* Attachments */}
      {claim.attachments?.length > 0 && (
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Evidence &amp; attachments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {claim.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'var(--surface)', borderRadius: 8, textDecoration: 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{a.name}</p>
                <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Open →</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Timeline</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {claim.timeline.map((t, i) => {
            const meta = STATUS_META[t.status];
            return (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label}</p>
                    <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{formatDateTime(t.at)}</span>
                  </div>
                  {t.note && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
