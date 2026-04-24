'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

type Status = 'reported' | 'under_review' | 'in_progress' | 'closed';

interface Claim {
  _id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  policyId: string;
  carrierClaimNumber?: string;
  incidentType: string;
  dateOfLoss: string;
  description: string;
  status: Status;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  createdAt: string;
}

const INCIDENT_LABEL: Record<string, string> = {
  auto_accident: 'Auto Accident', auto_theft: 'Auto Theft',
  property_damage: 'Property Damage', water_damage: 'Water Damage',
  fire: 'Fire', theft_burglary: 'Theft / Burglary',
  liability: 'Liability', medical: 'Medical',
  business_interruption: 'Business Interruption', other: 'Other',
};

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  reported: { label: 'Reported', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  under_review: { label: 'Under Review', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  closed: { label: 'Closed', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    setLoading(true);
    fetch(`/api/admin/claims?${params.toString()}`).then(r => r.json())
      .then(d => setClaims(d.claims || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateClaim(id: string, patch: Record<string, unknown>) {
    const res = await secureFetch(`/api/admin/claims/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) { setToast({ message: 'Updated.', type: 'success' }); setEditingId(null); load(); }
    else { const d = await res.json(); setToast({ message: d.error || 'Failed.', type: 'error' }); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Claims</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>All open claims. Assign adjusters and keep statuses current.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">Open only (default)</option>
          <option value="reported">Reported</option>
          <option value="under_review">Under Review</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{claims.length} {claims.length === 1 ? 'claim' : 'claims'}</div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : claims.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--muted)' }}>No claims match.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {claims.map(c => (
            <div key={c._id} className="card-sm" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{INCIDENT_LABEL[c.incidentType] || c.incidentType}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: STATUS_META[c.status].bg, color: STATUS_META[c.status].color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {STATUS_META[c.status].label}
                    </span>
                    {c.carrierClaimNumber && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Carrier #{c.carrierClaimNumber}</span>}
                  </div>
                  <Link href={`/admin/dashboard/clients/${c.userId}`} style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
                    {c.clientName} · {c.clientEmail}
                  </Link>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{c.description}</p>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                    Loss {fmtDate(c.dateOfLoss)} · Reported {fmtDate(c.createdAt)}
                  </p>
                  {(c.adjusterName || c.adjusterPhone) && (
                    <p style={{ fontSize: 11, color: 'var(--ink)', marginTop: 6, fontWeight: 600 }}>
                      👤 {c.adjusterName || '—'}{c.adjusterPhone && ` · ${c.adjusterPhone}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === c._id ? null : c._id)}
                  style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}
                >
                  {editingId === c._id ? 'Close' : 'Edit'}
                </button>
              </div>

              {/* Inline status transitions */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: editingId === c._id ? 12 : 0 }}>
                {(['under_review', 'in_progress', 'closed'] as Status[]).filter(s => s !== c.status).map(s => (
                  <button
                    key={s}
                    onClick={() => updateClaim(c._id, { status: s })}
                    style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}
                  >
                    → {STATUS_META[s].label}
                  </button>
                ))}
              </div>

              {editingId === c._id && <ClaimEditor claim={c} onSave={(patch) => updateClaim(c._id, patch)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimEditor({ claim, onSave }: { claim: Claim; onSave: (patch: Record<string, unknown>) => void }) {
  const [carrierClaimNumber, setCarrierClaimNumber] = useState(claim.carrierClaimNumber || '');
  const [adjusterName, setAdjusterName] = useState(claim.adjusterName || '');
  const [adjusterPhone, setAdjusterPhone] = useState(claim.adjusterPhone || '');
  const [adjusterEmail, setAdjusterEmail] = useState(claim.adjusterEmail || '');
  const [note, setNote] = useState('');

  return (
    <div style={{ padding: 14, background: 'var(--surface)', borderRadius: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Adjuster contact &amp; carrier info</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Carrier claim #</label>
          <input type="text" className="input" value={carrierClaimNumber} onChange={e => setCarrierClaimNumber(e.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Adjuster name</label>
          <input type="text" className="input" value={adjusterName} onChange={e => setAdjusterName(e.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Adjuster phone</label>
          <input type="tel" className="input" value={adjusterPhone} onChange={e => setAdjusterPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Adjuster email</label>
          <input type="email" className="input" value={adjusterEmail} onChange={e => setAdjusterEmail(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label className="label" style={{ fontSize: 10 }}>Timeline note (visible to client)</label>
        <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} style={{ resize: 'vertical', minHeight: 60 }} placeholder="Optional update — appears on the client's claim timeline" />
      </div>
      <button
        type="button"
        onClick={() => onSave({
          carrierClaimNumber: carrierClaimNumber.trim() || undefined,
          adjusterName: adjusterName.trim(),
          adjusterPhone: adjusterPhone.trim(),
          adjusterEmail: adjusterEmail.trim(),
          note: note.trim() || undefined,
        })}
        className="btn btn-navy"
        style={{ padding: '8px 16px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}
      >
        Save
      </button>
    </div>
  );
}
