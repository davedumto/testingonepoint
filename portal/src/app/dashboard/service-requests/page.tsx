'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Status = 'submitted' | 'in_progress' | 'waiting_on_client' | 'completed' | 'cancelled';

interface ServiceRequest {
  _id: string;
  type: string;
  description: string;
  urgency: string;
  status: Status;
  attachmentCount: number;
  commentCount: number;
  submittedAt: string;
  completedAt?: string;
}

const TYPE_LABEL: Record<string, string> = {
  policy_change: 'Policy Change',
  add_vehicle: 'Add Vehicle',
  remove_driver: 'Remove Driver',
  address_update: 'Address Update',
  certificate_request: 'Certificate (COI) Request',
  billing_issue: 'Billing Issue',
  cancellation_request: 'Cancellation Request',
};

const STATUS_META: Record<Status, { label: string; bg: string; color: string }> = {
  submitted: { label: 'Submitted', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  waiting_on_client: { label: 'Waiting on You', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f' },
  completed: { label: 'Completed', bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a' },
  cancelled: { label: 'Cancelled', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' },
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/service-requests')
      .then(r => r.json())
      .then(d => setRequests(d.requests || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Service Requests</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Policy changes, address updates, COI requests, and more. No more email ping-pong.</p>
        </div>
        <Link href="/dashboard/service-requests/new" className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>
          + New Request
        </Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No service requests yet</p>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>Need a policy change, certificate, or to update something? Open a request and we&apos;ll route it to operations.</p>
          <Link href="/dashboard/service-requests/new" className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0, textDecoration: 'none' }}>
            Open a request
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(r => {
            const meta = STATUS_META[r.status];
            return (
              <Link key={r._id} href={`/dashboard/service-requests/${r._id}`} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, textDecoration: 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{TYPE_LABEL[r.type] || r.type}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {meta.label}
                    </span>
                    {r.urgency === 'high' || r.urgency === 'urgent' ? (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {r.urgency}
                      </span>
                    ) : null}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                    Submitted {formatDate(r.submittedAt)}
                    {r.commentCount > 0 && ` · ${r.commentCount} ${r.commentCount === 1 ? 'reply' : 'replies'}`}
                    {r.attachmentCount > 0 && ` · ${r.attachmentCount} ${r.attachmentCount === 1 ? 'attachment' : 'attachments'}`}
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
    </div>
  );
}
