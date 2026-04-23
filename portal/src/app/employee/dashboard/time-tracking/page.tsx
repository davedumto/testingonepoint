'use client';

import { useEffect, useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import { IconCheck } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';
import { formatDate, formatTime } from '@/lib/client/format-time';
import PageHeader from '@/components/PageHeader';

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

      <PageHeader
        eyebrow="Your hours"
        title="Time Tracking"
        description="Clock in and out, and review past shifts."
      />

      {/* Shift ending warning banner */}
      {activeSession && minutesLeft !== null && minutesLeft <= 30 && minutesLeft > 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
          Shift ends in {minutesLeft} minutes. You will be auto-logged out by the server.
        </div>
      )}

      {/* Clock in/out hero — navy gradient when active, brand accent when idle.
          Big tabular-nums timer when clocked in; prominent CTA button either way. */}
      {activeSession ? (
        <div style={{
          marginBottom: 28,
          padding: '40px 44px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
          color: '#fff',
          boxShadow: '0 12px 40px rgba(5, 40, 71, 0.22)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 12px rgba(74, 222, 128, 0.6)' }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>You&apos;re clocked in</p>
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {formatElapsed(elapsed)}
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
              Since {formatTime(activeSession.loginAt)}
            </p>
          </div>
          <button onClick={clockOut} disabled={acting} style={{
            padding: '14px 32px',
            fontSize: 14,
            fontWeight: 700,
            background: '#fff',
            color: 'var(--navy)',
            border: 'none',
            borderRadius: 10,
            cursor: acting ? 'wait' : 'pointer',
            position: 'relative',
            zIndex: 1,
          }}>
            {acting ? 'Clocking out…' : 'Clock out'}
          </button>
        </div>
      ) : (
        <div style={{
          marginBottom: 28,
          padding: '40px 44px',
          borderRadius: 16,
          background: 'linear-gradient(180deg, #ffffff 0%, #f6f8fc 100%)',
          border: '1px solid rgba(10,61,107,0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Ready to start</p>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Not clocked in yet</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, maxWidth: 440, lineHeight: 1.55 }}>
              Start your shift to begin tracking. The server auto-logs you out at shift end.
            </p>
          </div>
          <button onClick={clockIn} disabled={acting} className="btn btn-navy" style={{ padding: '14px 36px', fontSize: 14, fontWeight: 700 }}>
            {acting ? 'Clocking in…' : 'Clock in now'}
          </button>
        </div>
      )}

      {/* Stats grid — each tile has a colored icon badge, bigger numbers */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 36 }}>
          {[
            { label: 'This week', value: `${stats.weekHours}h`, color: '#0a3d6b', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ) },
            { label: '30-day total', value: `${stats.totalHours}h`, color: '#052847', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ) },
            { label: 'Sessions', value: stats.sessionCount, color: '#0a3d6b', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
            ) },
            { label: 'Flagged', value: stats.flaggedCount, color: stats.flaggedCount > 0 ? '#dc2626' : '#5a6c7e', icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            ) },
          ].map((s, i) => (
            <div key={i} className="card-sm" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                flexShrink: 0,
                width: 44, height: 44,
                borderRadius: 10,
                background: `${s.color}18`,
                color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>{s.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.01em', marginTop: 4 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extra Hours Request */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>Weekend &amp; Extra Hours</h2>
        <button onClick={() => setShowExtraForm(!showExtraForm)} className="btn btn-outline" style={{ padding: '8px 18px', fontSize: 12 }}>
          {showExtraForm ? 'Cancel' : 'Request extra hours'}
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
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{formatDate(r.requestedDate)}, {r.startTime} to {r.endTime} ({r.hoursRequested}h)</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{r.reason}</p>
              </div>
              <span className="badge" style={{ background: r.status === 'approved' ? 'rgba(46,154,85,0.1)' : r.status === 'denied' ? 'rgba(220,38,38,0.1)' : 'rgba(10,61,107,0.1)', color: r.status === 'approved' ? '#2e9a55' : r.status === 'denied' ? '#dc2626' : '#0a3d6b' }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Session history */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em', marginBottom: 16, marginTop: 32 }}>Session History</h2>
      {sessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No sessions recorded yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.slice(0, 20).map(s => (
            <div key={s._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}>
              <div style={{
                flexShrink: 0,
                width: 40, height: 40,
                borderRadius: 10,
                background: s.flagged ? 'rgba(220,38,38,0.12)' : 'rgba(10,61,107,0.1)',
                color: s.flagged ? 'var(--red)' : 'var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>
                  {formatDate(s.loginAt)}, {formatTime(s.loginAt)}
                  {s.logoutAt && <> to {formatTime(s.logoutAt)}</>}
                </p>
                {s.flagReason && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{s.flagReason}</p>}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', minWidth: 60, textAlign: 'right' }}>
                {s.duration ? `${Math.round(s.duration / 60 * 10) / 10}h` : s.logoutType === 'active' ? 'Active' : '—'}
              </p>
              <span className="badge" style={{ background: 'rgba(138,155,170,0.12)', color: '#5a6c7e', minWidth: 70, textAlign: 'center', fontSize: 10 }}>
                {s.logoutType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
