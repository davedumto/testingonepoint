'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

type Status = 'submitted' | 'in_progress' | 'waiting_on_client' | 'completed' | 'cancelled';

interface SR {
  _id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  type: string;
  description: string;
  urgency: string;
  status: Status;
  assignedTo: string;
  submittedAt: string;
  firstResponseAt?: string;
  hoursOpen: number;
}

const TYPE_LABEL: Record<string, string> = {
  policy_change: 'Policy Change', add_vehicle: 'Add Vehicle', remove_driver: 'Remove Driver',
  address_update: 'Address Update', certificate_request: 'COI Request',
  billing_issue: 'Billing Issue', cancellation_request: 'Cancellation',
};

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  submitted: { label: 'Submitted', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  waiting_on_client: { label: 'Waiting on Client', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
  completed: { label: 'Completed', bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a' },
  cancelled: { label: 'Cancelled', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

function fmtDate(iso?: string) { if (!iso) return ''; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export default function AdminServiceRequestsPage() {
  const [requests, setRequests] = useState<SR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (urgencyFilter) params.set('urgency', urgencyFilter);
    setLoading(true);
    fetch(`/api/admin/service-requests?${params.toString()}`)
      .then(r => r.json())
      .then(d => setRequests(d.requests || []))
      .finally(() => setLoading(false));
  }, [statusFilter, urgencyFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: Status) {
    const res = await secureFetch(`/api/admin/service-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { setToast({ message: 'Updated.', type: 'success' }); load(); }
    else setToast({ message: 'Could not update.', type: 'error' });
  }

  // Aggregate counts for the filter pills
  const counts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Service Requests</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>All open requests across all clients. Triage from here.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">Open only (default)</option>
          <option value="submitted">Submitted</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_on_client">Waiting on Client</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="input" value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All urgencies</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
          {counts.waiting_on_client > 0 && <span style={{ color: '#9a2f2f', fontWeight: 700 }}> · {counts.waiting_on_client} waiting on client</span>}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--muted)' }}>No service requests match.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const meta = STATUS_META[r.status];
            const stale = r.hoursOpen >= 24 && !['completed', 'cancelled'].includes(r.status);
            const urgent = r.urgency === 'urgent' || r.urgency === 'high';
            return (
              <div key={r._id} className="card-sm" style={{ padding: 16, borderLeft: urgent ? '3px solid #9a2f2f' : stale ? '3px solid #8a5a00' : '3px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{TYPE_LABEL[r.type] || r.type}</h3>
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {meta.label}
                      </span>
                      {urgent && (
                        <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                          {r.urgency}
                        </span>
                      )}
                      {stale && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#8a5a00', textTransform: 'uppercase' }}>⏱ {r.hoursOpen}h open</span>
                      )}
                    </div>
                    <Link href={`/admin/dashboard/clients/${r.userId}`} style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
                      {r.clientName} · {r.clientEmail}
                    </Link>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.description}</p>
                    <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4, textTransform: 'capitalize' }}>
                      Assigned to {r.assignedTo} · Submitted {fmtDate(r.submittedAt)}
                    </p>
                  </div>
                </div>

                {/* Inline status transitions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['in_progress', 'waiting_on_client', 'completed', 'cancelled'] as Status[]).filter(s => s !== r.status).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(r._id, s)}
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', background: '#fff', borderRadius: 6, cursor: 'pointer', color: 'var(--ink)' }}
                    >
                      → {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
