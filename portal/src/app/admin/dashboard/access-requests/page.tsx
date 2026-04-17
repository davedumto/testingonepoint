'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';

interface AccessReq {
  _id: string;
  userName: string;
  userEmail: string;
  provider: string;
  providerName: string;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  lastAuthenticated?: string | null;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessReq[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function fetchRequests(status?: string) {
    setLoading(true);
    const url = status ? `/employee/api/access-requests/admin?status=${status}` : '/employee/api/access-requests/admin';
    fetch(url)
      .then(r => r.json())
      .then(d => setRequests(d.requests || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRequests(filter); }, [filter]);

  async function handleAction(requestId: string, action: 'approve' | 'deny') {
    setActing(requestId);
    try {
      const res = await fetch('/employee/api/access-requests/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Request ${action === 'approve' ? 'approved' : 'denied'} successfully.`, type: 'success' });
        fetchRequests(filter);
      } else {
        setToast({ message: data.error || 'Action failed.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setActing(null);
    }
  }

  const statusColor = (s: string) => {
    if (s === 'approved') return { bg: 'rgba(46,154,85,0.1)', color: '#2e9a55' };
    if (s === 'denied') return { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' };
    return { bg: 'rgba(13,148,136,0.1)', color: '#0d9488' };
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Access Requests</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Review and manage employee app access requests.</p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['pending', 'approved', 'denied', ''].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: filter === s ? 'var(--navy)' : 'var(--surface)',
              color: filter === s ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit', textTransform: 'capitalize',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>Loading...</p>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No {filter || ''} requests found.</p>
        </div>
      ) : (
        <div>
          {requests.map(req => {
            const sc = statusColor(req.status);
            return (
              <div key={req._id} className="card-sm" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Employee info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{req.userName}</h3>
                    <span style={{ padding: '2px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: sc.bg, color: sc.color }}>
                      {req.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>{req.userEmail}</p>
                  {req.reason && <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 4 }}>Reason: {req.reason}</p>}
                </div>

                {/* App requested */}
                <div style={{ textAlign: 'center', minWidth: 120 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{req.providerName}</p>
                  <p style={{ fontSize: 11, color: 'var(--subtle)' }}>
                    {new Date(req.requestedAt).toLocaleDateString()} {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Auth timestamp */}
                <div style={{ textAlign: 'center', minWidth: 120 }}>
                  {req.lastAuthenticated ? (
                    <>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Authenticated</p>
                      <p style={{ fontSize: 11, color: 'var(--subtle)' }}>{new Date(req.lastAuthenticated).toLocaleString()}</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Not yet authenticated</p>
                  )}
                </div>

                {/* Review info or action buttons */}
                <div style={{ minWidth: 140, textAlign: 'right' }}>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleAction(req._id, 'approve')}
                        disabled={acting === req._id}
                        className="btn btn-navy"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req._id, 'deny')}
                        disabled={acting === req._id}
                        className="btn btn-outline"
                        style={{ padding: '6px 14px', fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)' }}
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    <div>
                      {req.reviewedBy && <p style={{ fontSize: 11, color: 'var(--subtle)' }}>by {req.reviewedBy}</p>}
                      {req.reviewedAt && <p style={{ fontSize: 11, color: 'var(--subtle)' }}>{new Date(req.reviewedAt).toLocaleString()}</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
