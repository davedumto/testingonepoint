'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Session {
  _id: string; userName: string; userEmail: string; loginAt: string; logoutAt?: string;
  duration?: number; logoutType: string; flagged: boolean; flagReason?: string; ipAddress?: string;
}
interface FailedAuth { _id: string; userEmail: string; provider: string; authenticatedAt: string; metadata?: Record<string, unknown>; }
interface Stats { totalSessions: number; activeSessions: number; flaggedSessions: number; failedAuthAttempts: number; avgDurationMinutes: number; }
interface ExtraReq { _id: string; userName: string; userEmail: string; requestedDate: string; startTime: string; endTime: string; hoursRequested: number; reason: string; status: string; }

export default function AdminTimeTrackingPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [failedAuths, setFailedAuths] = useState<FailedAuth[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [extraRequests, setExtraRequests] = useState<ExtraReq[]>([]);
  const [filter, setFilter] = useState('all');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function fetchData() {
    setLoading(true);
    Promise.all([
      fetch(`/employee/api/time/admin?filter=${filter}&days=${days}`).then(r => r.json()),
      fetch('/employee/api/time/extra-hours/admin?status=pending').then(r => r.json()),
    ]).then(([timeData, extraData]) => {
      setSessions(timeData.sessions || []);
      setFailedAuths(timeData.failedAuths || []);
      setStats(timeData.stats || null);
      setExtraRequests(extraData.requests || []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [filter, days]);

  async function handleExtraHours(requestId: string, action: 'approve' | 'deny') {
    setActing(requestId);
    try {
      const res = await secureFetch('/employee/api/time/extra-hours/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setToast({ message: `Extra hours ${action === 'approve' ? 'approved' : 'denied'}.`, type: 'success' });
        fetchData();
      }
    } catch { setToast({ message: 'Failed.', type: 'error' }); }
    finally { setActing(null); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Employee Time Tracking</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Monitor login/logout activity, security flags, and extra hours requests.</p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Sessions', value: stats.totalSessions, color: 'var(--navy)' },
            { label: 'Active Now', value: stats.activeSessions, color: '#0d9488' },
            { label: 'Flagged', value: stats.flaggedSessions, color: stats.flaggedSessions > 0 ? '#dc2626' : 'var(--navy)' },
            { label: 'Failed Auths', value: stats.failedAuthAttempts, color: stats.failedAuthAttempts > 0 ? '#dc2626' : 'var(--navy)' },
            { label: 'Avg Duration', value: `${Math.round(stats.avgDurationMinutes / 60 * 10) / 10}h`, color: 'var(--navy)' },
          ].map(s => (
            <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
              <p className="label" style={{ marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Extra Hours */}
      {extraRequests.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Pending Extra Hours Requests</h2>
          {extraRequests.map(r => (
            <div key={r._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{r.userName} — {new Date(r.requestedDate).toLocaleDateString()}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.startTime} to {r.endTime} ({r.hoursRequested}h) — {r.reason}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleExtraHours(r._id, 'approve')} disabled={acting === r._id} className="btn btn-navy" style={{ padding: '6px 14px', fontSize: 12 }}>Approve</button>
                <button onClick={() => handleExtraHours(r._id, 'deny')} disabled={acting === r._id} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12, color: 'var(--red)' }}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'flagged', 'active'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: filter === f ? 'var(--navy)' : 'var(--surface)', color: filter === f ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
        <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="input" style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Sessions table */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Login / Logout Records</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}><p style={{ color: 'var(--muted)' }}>No sessions found.</p></div>
      ) : (
        sessions.map(s => (
          <div key={s._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, borderLeft: s.flagged ? '3px solid #dc2626' : '3px solid transparent' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{s.userName}</p>
                {s.flagged && <span className="badge" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>Flagged</span>}
                {s.logoutType === 'active' && <span className="badge" style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}>Active</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{s.userEmail}</p>
              {s.flagReason && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{s.flagReason}</p>}
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Login</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{new Date(s.loginAt).toLocaleString()}</p>
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Logout</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{s.logoutAt ? new Date(s.logoutAt).toLocaleString() : '—'}</p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 60 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                {s.duration ? `${Math.round(s.duration / 60 * 10) / 10}h` : '—'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--subtle)' }}>{s.logoutType}</p>
            </div>
            {s.ipAddress && <p style={{ fontSize: 10, color: 'var(--subtle)', minWidth: 90, textAlign: 'right' }}>{s.ipAddress.split(',')[0]}</p>}
          </div>
        ))
      )}

      {/* Failed Auth Attempts */}
      {failedAuths.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>Failed Authentication Attempts</h2>
          {failedAuths.map(f => (
            <div key={f._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4, borderLeft: '3px solid #dc2626' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{f.userEmail}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Provider: {f.provider}</p>
              </div>
              <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{new Date(f.authenticatedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
