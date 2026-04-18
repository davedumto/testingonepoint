'use client';

import { useEffect, useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import { IconCheck } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Session {
  _id: string; loginAt: string; logoutAt?: string; duration?: number;
  logoutType: string; flagged: boolean; flagReason?: string;
}
interface Stats { totalHours: number; weekHours: number; sessionCount: number; flaggedCount: number; }
interface ExtraReq { _id: string; requestedDate: string; startTime: string; endTime: string; hoursRequested: number; reason: string; status: string; }

export default function TimeTrackingPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [extraRequests, setExtraRequests] = useState<ExtraReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Extra hours form
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDate, setExtraDate] = useState('');
  const [extraStart, setExtraStart] = useState('');
  const [extraEnd, setExtraEnd] = useState('');
  const [extraHours, setExtraHours] = useState('');
  const [extraReason, setExtraReason] = useState('');

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/employee/api/time/sessions').then(r => r.json()),
      fetch('/employee/api/time/extra-hours').then(r => r.json()),
    ]).then(([sessData, extraData]) => {
      setSessions(sessData.sessions || []);
      setActiveSession(sessData.activeSession || null);
      setStats(sessData.stats || null);
      setExtraRequests(extraData.requests || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live elapsed timer
  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(activeSession.loginAt).getTime()) / 1000);
      setElapsed(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Poll for server-side auto-logout — detect if session was closed by cron
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      fetch('/employee/api/time/sessions').then(r => r.json()).then(d => {
        if (!d.activeSession) {
          setActiveSession(null);
          setToast({ message: 'Your session was auto-logged out by the server.', type: 'info' });
          fetchData();
        }
        // Update minutes remaining from server
        if (d.minutesUntilShiftEnd !== undefined) {
          setMinutesLeft(d.minutesUntilShiftEnd);
        }
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [activeSession, fetchData]);

  async function clockIn() {
    setActing(true);
    try {
      const res = await secureFetch('/employee/api/time/clock-in', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Clocked in successfully.', type: 'success' });
        if (data.minutesUntilShiftEnd !== undefined) setMinutesLeft(data.minutesUntilShiftEnd);
        fetchData();
      } else {
        setToast({ message: data.error || 'Failed.', type: 'error' });
      }
    } catch { setToast({ message: 'Error.', type: 'error' }); }
    finally { setActing(false); }
  }

  async function clockOut() {
    setActing(true);
    try {
      const res = await secureFetch('/employee/api/time/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoutType: 'manual' }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Clocked out. Duration: ${Math.round((data.session?.duration || 0) / 60 * 10) / 10} hours.`, type: 'success' });
        setMinutesLeft(null);
        fetchData();
      } else {
        setToast({ message: data.error || 'Failed.', type: 'error' });
      }
    } catch { setToast({ message: 'Error.', type: 'error' }); }
    finally { setActing(false); }
  }

  async function submitExtraHours(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await secureFetch('/employee/api/time/extra-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedDate: extraDate, startTime: extraStart, endTime: extraEnd, hoursRequested: parseFloat(extraHours), reason: extraReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: 'Extra hours request submitted.', type: 'success' });
        setShowExtraForm(false);
        setExtraDate(''); setExtraStart(''); setExtraEnd(''); setExtraHours(''); setExtraReason('');
        fetchData();
      } else {
        setToast({ message: data.error || 'Failed.', type: 'error' });
      }
    } catch { setToast({ message: 'Error.', type: 'error' }); }
  }

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Time Tracking</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Clock in/out and track your work hours.</p>

      {/* Shift ending warning banner */}
      {activeSession && minutesLeft !== null && minutesLeft <= 30 && minutesLeft > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          Shift ends in {minutesLeft} minutes. You will be auto-logged out by the server.
        </div>
      )}

      {/* Clock in/out card */}
      <div className="card" style={{ marginBottom: 24, padding: 32, textAlign: 'center' }}>
        {activeSession ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Currently Clocked In</p>
            <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
              {formatElapsed(elapsed)}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
              Since {new Date(activeSession.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <button onClick={clockOut} disabled={acting} className="btn btn-navy" style={{ padding: '12px 32px' }}>
              {acting ? 'Clocking out...' : 'Clock Out'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 16 }}>Not Clocked In</p>
            <button onClick={clockIn} disabled={acting} className="btn btn-teal" style={{ padding: '14px 40px', fontSize: 15 }}>
              {acting ? 'Clocking in...' : 'Clock In'}
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="card-sm" style={{ textAlign: 'center' }}>
            <p className="label" style={{ marginBottom: 4 }}>This Week</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{stats.weekHours}h</p>
          </div>
          <div className="card-sm" style={{ textAlign: 'center' }}>
            <p className="label" style={{ marginBottom: 4 }}>30-Day Total</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{stats.totalHours}h</p>
          </div>
          <div className="card-sm" style={{ textAlign: 'center' }}>
            <p className="label" style={{ marginBottom: 4 }}>Sessions</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{stats.sessionCount}</p>
          </div>
          <div className="card-sm" style={{ textAlign: 'center' }}>
            <p className="label" style={{ marginBottom: 4 }}>Flagged</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: stats.flaggedCount > 0 ? 'var(--red)' : 'var(--navy)' }}>{stats.flaggedCount}</p>
          </div>
        </div>
      )}

      {/* Extra Hours Request */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Weekend / Extra Hours</h2>
        <button onClick={() => setShowExtraForm(!showExtraForm)} className="btn btn-outline" style={{ padding: '6px 16px', fontSize: 12 }}>
          {showExtraForm ? 'Cancel' : 'Request Extra Hours'}
        </button>
      </div>

      {showExtraForm && (
        <form onSubmit={submitExtraHours} className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label className="label">Date</label><input type="date" value={extraDate} onChange={e => setExtraDate(e.target.value)} required className="input" /></div>
            <div><label className="label">Start Time</label><input type="time" value={extraStart} onChange={e => setExtraStart(e.target.value)} required className="input" /></div>
            <div><label className="label">End Time</label><input type="time" value={extraEnd} onChange={e => setExtraEnd(e.target.value)} required className="input" /></div>
            <div><label className="label">Hours</label><input type="number" step="0.5" value={extraHours} onChange={e => setExtraHours(e.target.value)} required className="input" placeholder="e.g. 4" /></div>
          </div>
          <div style={{ marginBottom: 16 }}><label className="label">Reason</label><input type="text" value={extraReason} onChange={e => setExtraReason(e.target.value)} required className="input" placeholder="Why do you need extra hours?" /></div>
          <button type="submit" className="btn btn-navy" style={{ padding: '10px 24px', fontSize: 13 }}>Submit Request</button>
        </form>
      )}

      {extraRequests.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {extraRequests.map(r => (
            <div key={r._id} className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{new Date(r.requestedDate).toLocaleDateString()} — {r.startTime} to {r.endTime} ({r.hoursRequested}h)</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.reason}</p>
              </div>
              <span className="badge" style={{ background: r.status === 'approved' ? 'rgba(46,154,85,0.1)' : r.status === 'denied' ? 'rgba(220,38,38,0.1)' : 'rgba(13,148,136,0.1)', color: r.status === 'approved' ? '#2e9a55' : r.status === 'denied' ? '#dc2626' : '#0d9488' }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Session history */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Session History</h2>
      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--muted)' }}>No sessions recorded yet.</p>
        </div>
      ) : (
        sessions.slice(0, 20).map(s => (
          <div key={s._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
            {s.flagged && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} title={s.flagReason} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                {new Date(s.loginAt).toLocaleDateString()} — {new Date(s.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {s.logoutAt && <> to {new Date(s.logoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
              </p>
              {s.flagReason && <p style={{ fontSize: 11, color: 'var(--red)' }}>{s.flagReason}</p>}
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', minWidth: 60, textAlign: 'right' }}>
              {s.duration ? `${Math.round(s.duration / 60 * 10) / 10}h` : s.logoutType === 'active' ? 'Active' : '—'}
            </p>
            <span className="badge" style={{ background: 'rgba(138,155,170,0.1)', color: '#8a9baa', minWidth: 70, textAlign: 'center' }}>
              {s.logoutType}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
