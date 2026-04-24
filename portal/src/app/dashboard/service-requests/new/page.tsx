'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Policy { _id: string; productName: string; policyNumber: string; carrier: string; }

const TYPES = [
  { value: 'policy_change', label: 'Policy Change', hint: 'Update coverage, limits, or endorsements' },
  { value: 'add_vehicle', label: 'Add a Vehicle', hint: 'Add a car, truck, or trailer to your auto policy' },
  { value: 'remove_driver', label: 'Remove a Driver', hint: 'Remove a driver from your auto policy' },
  { value: 'address_update', label: 'Address Update', hint: 'New mailing or garaging address' },
  { value: 'certificate_request', label: 'Certificate (COI) Request', hint: 'Proof of insurance for a third party' },
  { value: 'billing_issue', label: 'Billing Issue', hint: 'Question about a charge, draft, or statement' },
  { value: 'cancellation_request', label: 'Cancellation Request', hint: 'Cancel a policy' },
] as const;

const URGENCIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export default function NewServiceRequestPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [type, setType] = useState<typeof TYPES[number]['value']>('policy_change');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<typeof URGENCIES[number]['value']>('normal');
  const [policyId, setPolicyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/policies').then(r => r.json()).then(d => setPolicies(d.policies || [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) { setToast({ message: 'Please describe your request in at least a sentence.', type: 'error' }); return; }
    setSubmitting(true);
    try {
      const res = await secureFetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          urgency,
          policyId: policyId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not submit.', type: 'error' }); return; }
      router.push(`/dashboard/service-requests/${data.requestId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/dashboard/service-requests" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to requests</Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginTop: 14, marginBottom: 6 }}>New Service Request</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Tell us what you need. We&apos;ll route it to operations and keep you updated here.</p>

      <form onSubmit={handleSubmit}>
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>What do you need?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TYPES.map(t => {
              const active = type === t.value;
              return (
                <label
                  key={t.value}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 14,
                    borderRadius: 10,
                    border: active ? '2px solid var(--navy)' : '1.5px solid var(--line)',
                    background: active ? 'rgba(10,61,107,0.04)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    checked={active}
                    onChange={() => setType(t.value)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{t.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.hint}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {policies.length > 0 && (
          <section className="card" style={{ padding: 22, marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Related policy (optional)</h2>
            <select className="input" value={policyId} onChange={e => setPolicyId(e.target.value)}>
              <option value="">Not specific to one policy</option>
              {policies.map(p => (
                <option key={p._id} value={p._id}>{p.productName} · {p.carrier} · #{p.policyNumber}</option>
              ))}
            </select>
          </section>
        )}

        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Details</h2>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Describe your request</label>
            <textarea
              className="input"
              rows={5}
              maxLength={5000}
              placeholder="Give us the specifics so we can act fast. Include dates, names, VINs, addresses, or anything else relevant."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
            <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>{description.length} / 5000</p>
          </div>

          <div>
            <label className="label">Urgency</label>
            <select className="input" value={urgency} onChange={e => setUrgency(e.target.value as typeof urgency)}>
              {URGENCIES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>Only use Urgent for genuinely time-critical requests (e.g. closing on a house today).</p>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="submit" disabled={submitting} className="btn btn-navy" style={{ padding: '12px 28px', textTransform: 'none', letterSpacing: 0 }}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
          <Link href="/dashboard/service-requests" style={{ padding: '12px 18px', fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
