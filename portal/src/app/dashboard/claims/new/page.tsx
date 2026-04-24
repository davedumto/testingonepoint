'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Policy { _id: string; productName: string; productCategory: string; policyNumber: string; carrier: string; }

const INCIDENT_TYPES = [
  { value: 'auto_accident', label: 'Auto Accident' },
  { value: 'auto_theft', label: 'Auto Theft' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'water_damage', label: 'Water Damage' },
  { value: 'fire', label: 'Fire' },
  { value: 'theft_burglary', label: 'Theft / Burglary' },
  { value: 'liability', label: 'Liability / Bodily Injury' },
  { value: 'medical', label: 'Medical' },
  { value: 'business_interruption', label: 'Business Interruption' },
  { value: 'other', label: 'Other' },
] as const;

export default function NewClaimPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState('');
  const [incidentType, setIncidentType] = useState<typeof INCIDENT_TYPES[number]['value']>('auto_accident');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [description, setDescription] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/policies').then(r => r.json()).then(d => {
      const list = d.policies || [];
      setPolicies(list);
      if (list.length === 1) setPolicyId(list[0]._id);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!policyId) { setToast({ message: 'Choose the affected policy.', type: 'error' }); return; }
    if (!dateOfLoss) { setToast({ message: 'When did the loss happen?', type: 'error' }); return; }
    if (description.trim().length < 10) { setToast({ message: 'Describe what happened in at least a sentence.', type: 'error' }); return; }
    if (!disclaimerAccepted) { setToast({ message: 'Please acknowledge the coverage disclaimer.', type: 'error' }); return; }

    setSubmitting(true);
    try {
      const res = await secureFetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId,
          incidentType,
          dateOfLoss,
          description: description.trim(),
          locationOfLoss: locationOfLoss.trim() || undefined,
          disclaimerAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not file claim.', type: 'error' }); return; }
      router.push(`/dashboard/claims/${data.claimId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/dashboard/claims" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to claims</Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginTop: 14, marginBottom: 6 }}>Report a Claim</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>First Notice of Loss (FNOL). Fill this in and we&apos;ll kick it off with the carrier right away.</p>

      {/* Legal disclaimer per spec §11 — shown prominently BEFORE the form */}
      <div style={{ padding: 16, borderRadius: 10, background: 'rgba(232,199,78,0.12)', border: '1px solid rgba(232,199,78,0.35)', marginBottom: 24, display: 'flex', gap: 12 }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#8a5a00" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6b4500', marginBottom: 4 }}>Before you submit</p>
          <p style={{ fontSize: 12, color: '#6b4500', lineHeight: 1.55 }}>
            Submitting this form does not guarantee claim approval. Coverage is subject to your policy terms and conditions. We&apos;ll log it and involve the carrier immediately.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Which policy?</h2>
          {policies.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>You don&apos;t have any policies on file. Contact us if this is an error.</p>
          ) : (
            <select className="input" value={policyId} onChange={e => setPolicyId(e.target.value)} required>
              <option value="">Choose a policy…</option>
              {policies.map(p => (
                <option key={p._id} value={p._id}>{p.productName} · {p.carrier} · #{p.policyNumber}</option>
              ))}
            </select>
          )}
        </section>

        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>What happened?</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">Incident type</label>
              <select className="input" value={incidentType} onChange={e => setIncidentType(e.target.value as typeof incidentType)}>
                {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date of loss</label>
              <input type="date" className="input" value={dateOfLoss} onChange={e => setDateOfLoss(e.target.value)} max={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Location (optional)</label>
            <input type="text" className="input" maxLength={300} value={locationOfLoss} onChange={e => setLocationOfLoss(e.target.value)} placeholder="Street, intersection, city, or property address" />
          </div>

          <div>
            <label className="label">Describe the incident</label>
            <textarea
              className="input"
              rows={5}
              maxLength={5000}
              placeholder="What happened? Who was involved? Were there injuries? Police report filed? The more detail the better."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
            <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>{description.length} / 5000</p>
          </div>
        </section>

        {/* Required disclaimer acceptance */}
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <label style={{ display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={e => setDisclaimerAccepted(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
              I understand that submission does not guarantee claim approval, and that coverage is subject to my policy&apos;s terms and conditions.
            </span>
          </label>
        </section>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" disabled={submitting || !disclaimerAccepted} className="btn btn-navy" style={{ padding: '12px 28px', textTransform: 'none', letterSpacing: 0 }}>
            {submitting ? 'Filing…' : 'File claim'}
          </button>
          <Link href="/dashboard/claims" style={{ padding: '12px 18px', fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
