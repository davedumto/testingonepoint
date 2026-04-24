'use client';

import { useEffect, useState, useRef } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

interface ActiveSession { _id: string; loginAt: string; }
interface Session { _id: string; loginAt: string; logoutAt?: string; duration?: number; logoutType: string; }
interface Stats { totalHours: number; weekHours: number; sessionCount: number; flaggedCount: number; }

const TZ = 'America/New_York';
const SHIFT_HOURS = 8;

function pad(n: number): string { return String(n).padStart(2, '0'); }
function fmtElapsed(seconds: number) {
  return { h: pad(Math.floor(seconds / 3600)), m: pad(Math.floor((seconds % 3600) / 60)), s: pad(seconds % 60) };
}
function formatToday() {
  const d = new Date();
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ }),
    weekdayShort: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }),
    date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: TZ }),
  };
}
function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
}
// Figure out which days of the current week (M-F) already have completed
// sessions, so we can render dots showing progress.
function computeWorkedDays(sessions: Session[]): Set<number> {
  const now = new Date();
  const dow = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dow);
  startOfWeek.setHours(0, 0, 0, 0);
  const worked = new Set<number>();
  for (const s of sessions) {
    const d = new Date(s.loginAt);
    if (d >= startOfWeek && (s.duration || 0) > 0) worked.add(d.getDay());
  }
  return worked;
}

export default function ClockInWidget() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [acting, setActing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [now, setNow] = useState(new Date());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const promptedRef = useRef(false);

  function refresh() {
    return fetch('/employee/api/time/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setActive(d.activeSession || null);
          setStats(d.stats || null);
          setSessions(d.sessions || []);
        }
        return d;
      });
  }

  useEffect(() => {
    refresh().then(d => {
      if (d && !d.activeSession && !promptedRef.current) {
        promptedRef.current = true;
        setToast({ message: 'Heads up, you haven\'t clocked in yet. One tap below to start the day.', type: 'info' });
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(active.loginAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  // Live wall-clock for the idle header. Ticks every 30s — no need for
  // per-second accuracy when nobody's clocked in.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function clockIn() {
    setActing(true);
    try {
      const res = await secureFetch('/employee/api/time/clock-in', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not clock in.', type: 'error' }); return; }
      setToast({ message: 'Clocked in. Have a great shift.', type: 'success' });
      await refresh();
    } finally { setActing(false); }
  }

  async function clockOut() {
    if (!confirm('Clock out for the day?')) return;
    setActing(true);
    try {
      const res = await secureFetch('/employee/api/time/clock-out', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not clock out.', type: 'error' }); return; }
      setToast({ message: 'Clocked out. See you tomorrow.', type: 'success' });
      await refresh();
    } finally { setActing(false); }
  }

  if (loading) return <div style={{ height: 164, marginBottom: 28 }} />;

  const today = formatToday();
  const weekHours = stats?.weekHours ?? 0;
  const workedDays = computeWorkedDays(sessions);
  const shiftSecs = SHIFT_HOURS * 3600;
  const shiftPct = active ? Math.min(100, (elapsed / shiftSecs) * 100) : 0;
  const startTimeLabel = active ? formatClock(new Date(active.loginAt)) : '';

  // ================= CLOCKED-IN STATE =================
  if (active) {
    const { h, m, s } = fmtElapsed(elapsed);
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <article style={activeCard}>
          <BgWatermarkClock tint="rgba(255,255,255,0.035)" />
          <div aria-hidden style={activeGlow} />

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Top row: status chip + meta */}
            <div style={topRow}>
              <div style={statusChip}>
                <span aria-hidden style={pulseDot} />
                On the clock
              </div>
              <p style={metaLine}>
                {today.weekday} · {today.date} · Started {startTimeLabel} ET
              </p>
            </div>

            {/* Centered timer block */}
            <div style={timerWrap}>
              <div style={timerGroup}>
                <Digit>{h}</Digit>
                <Colon />
                <Digit>{m}</Digit>
                <Colon />
                <Digit>{s}</Digit>
              </div>
              <div style={digitLabelsRow}>
                <DigitLabel>hours</DigitLabel>
                <DigitLabel>mins</DigitLabel>
                <DigitLabel>secs</DigitLabel>
              </div>
            </div>

            {/* Progress bar + footer */}
            <div style={{ marginTop: 24 }}>
              <div style={progressTrack}>
                <div style={{ ...progressFill, width: `${shiftPct}%` }} />
              </div>
              <div style={footerRow}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FooterStat value={`${Math.round(shiftPct)}%`} label={`of ${SHIFT_HOURS}h shift`} />
                  <FooterDivider />
                  <FooterStat value={`${weekHours}h`} label="this week" />
                  <FooterDivider />
                  <WeekDots worked={workedDays} />
                </div>
                <button
                  type="button"
                  onClick={clockOut}
                  disabled={acting}
                  style={{
                    ...clockOutButton,
                    opacity: acting ? 0.6 : 1,
                    cursor: acting ? 'wait' : 'pointer',
                  }}
                >
                  {acting ? 'Clocking out…' : 'Clock out'}
                </button>
              </div>
            </div>
          </div>

          <style>{pulseKeyframes}</style>
        </article>
      </>
    );
  }

  // ================= IDLE STATE =================
  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <article style={idleCard}>
        <BgWatermarkClock tint="rgba(232,199,78,0.08)" />
        <div aria-hidden style={idleGlow} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            {/* Eyebrow with live clock */}
            <div style={eyebrowRow}>
              <span style={eyebrowDot} />
              {today.weekday} · {today.date} · {formatClock(now)} ET
            </div>

            <h2 style={idleHeadline}>Your shift is waiting.</h2>
            <p style={idleSubhead}>
              {weekHours > 0
                ? `You've logged ${weekHours}h this week. Clock in to keep the momentum.`
                : 'One tap to start the day.'}
            </p>

            {/* Weekly dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
              <WeekDots worked={workedDays} />
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--subtle)' }}>This week</span>
            </div>
          </div>

          <button
            type="button"
            onClick={clockIn}
            disabled={acting}
            style={{
              ...clockInButton,
              opacity: acting ? 0.7 : 1,
              cursor: acting ? 'wait' : 'pointer',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {acting ? 'Clocking in…' : 'Clock in'}
              {!acting && <ArrowIcon />}
            </span>
          </button>
        </div>
      </article>
    </>
  );
}

// ========== Inline subcomponents ==========

function BgWatermarkClock({ tint }: { tint: string }) {
  // Decorative clock face watermarked into the bottom-right corner of the card.
  // Positioned + partially clipped so it reads as atmosphere, not content.
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      width="360"
      height="360"
      style={{
        position: 'absolute',
        bottom: -80,
        right: -60,
        color: tint,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1.2" />
      {/* Hour ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r1 = 82, r2 = 90;
        const x1 = 100 + Math.cos(angle) * r1;
        const y1 = 100 + Math.sin(angle) * r1;
        const x2 = 100 + Math.cos(angle) * r2;
        const y2 = 100 + Math.sin(angle) * r2;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={i % 3 === 0 ? 3 : 1.4} strokeLinecap="round" />;
      })}
      {/* Hands */}
      <line x1="100" y1="100" x2="100" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="100" x2="136" y2="100" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="4" fill="currentColor" />
    </svg>
  );
}

function Digit({ children }: { children: string }) {
  return (
    <span style={{
      display: 'inline-block',
      minWidth: 80,
      textAlign: 'center',
      fontSize: 84,
      fontWeight: 800,
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.04em',
      color: '#fff',
    }}>
      {children}
    </span>
  );
}
function Colon() {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 64,
      fontWeight: 800,
      lineHeight: 1,
      color: 'rgba(255,255,255,0.3)',
      padding: '0 6px',
      alignSelf: 'center',
    }}>:</span>
  );
}
function DigitLabel({ children }: { children: string }) {
  return (
    <span style={{
      minWidth: 80 + 16, // matches digit width + a bit of colon slack so labels sit under digits
      textAlign: 'center',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.55)',
    }}>{children}</span>
  );
}

function FooterStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{label}</span>
    </div>
  );
}
function FooterDivider() {
  return <span aria-hidden style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.15)' }} />;
}

// Mon–Fri dot strip showing worked days. Filled gold if worked, faint if not.
// Today's dot gets a ring to show "you are here".
function WeekDots({ worked }: { worked: Set<number> }) {
  const days = [
    { dow: 1, label: 'M' },
    { dow: 2, label: 'T' },
    { dow: 3, label: 'W' },
    { dow: 4, label: 'T' },
    { dow: 5, label: 'F' },
  ];
  const todayDow = new Date().getDay();
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {days.map(d => {
        const isWorked = worked.has(d.dow);
        const isToday = todayDow === d.dow;
        return (
          <div key={d.dow} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isWorked ? '#e8c74e' : 'rgba(140,140,140,0.25)',
              boxShadow: isToday ? '0 0 0 3px rgba(232,199,78,0.3)' : 'none',
              transition: 'background 0.2s ease',
            }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: isToday ? '#e8c74e' : 'rgba(140,140,140,0.6)' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ========== Styles ==========

const activeCard: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  marginBottom: 28,
  padding: '28px 32px',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #041e37 0%, #052847 45%, #0a3d6b 100%)',
  boxShadow: '0 20px 40px -12px rgba(5,40,71,0.4), 0 4px 12px rgba(5,40,71,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
};

const activeGlow: React.CSSProperties = {
  position: 'absolute',
  top: -120,
  left: '50%',
  width: 520,
  height: 260,
  transform: 'translateX(-50%)',
  background: 'radial-gradient(ellipse, rgba(232,199,78,0.15) 0%, transparent 60%)',
  pointerEvents: 'none',
  zIndex: 1,
};

const topRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 20,
};

const statusChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(8px)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#fff',
};

const metaLine: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.6)',
  letterSpacing: '0.02em',
};

const pulseDot: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#42c57b',
  boxShadow: '0 0 0 0 rgba(66,197,123,0.7)',
  animation: 'clock-pulse 1.8s ease-out infinite',
};

const timerWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '10px 0 0',
};

const timerGroup: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const digitLabelsRow: React.CSSProperties = {
  display: 'flex',
  marginTop: 8,
};

const progressTrack: React.CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: 'rgba(255,255,255,0.08)',
  overflow: 'hidden',
};
const progressFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #e8c74e 0%, #f5d870 100%)',
  borderRadius: 2,
  transition: 'width 0.4s ease',
  boxShadow: '0 0 8px rgba(232,199,78,0.5)',
};

const footerRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 16,
  flexWrap: 'wrap',
};

const clockOutButton: React.CSSProperties = {
  padding: '12px 22px',
  background: '#fff',
  color: 'var(--navy)',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: '0.02em',
  border: 'none',
  borderRadius: 10,
  flexShrink: 0,
  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
};

const idleCard: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  marginBottom: 28,
  padding: '28px 32px',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #fdfaf0 0%, #fbf4de 50%, #fff 100%)',
  border: '1px solid rgba(232,199,78,0.35)',
  boxShadow: '0 10px 28px -12px rgba(5,40,71,0.15), 0 2px 6px rgba(5,40,71,0.06)',
};

const idleGlow: React.CSSProperties = {
  position: 'absolute',
  top: -80,
  right: -80,
  width: 280,
  height: 280,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(232,199,78,0.35) 0%, transparent 60%)',
  pointerEvents: 'none',
  zIndex: 1,
};

const eyebrowRow: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#8a5a00',
  marginBottom: 12,
};

const eyebrowDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#e8c74e',
};

const idleHeadline: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  color: 'var(--navy)',
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
  marginBottom: 8,
};

const idleSubhead: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--muted)',
  lineHeight: 1.55,
  maxWidth: 460,
};

const clockInButton: React.CSSProperties = {
  padding: '16px 32px',
  background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '0.01em',
  border: 'none',
  borderRadius: 14,
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 10px 24px rgba(5,40,71,0.35), 0 2px 4px rgba(5,40,71,0.14), inset 0 1px 0 rgba(255,255,255,0.1)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const pulseKeyframes = `
  @keyframes clock-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(66,197,123,0.7); }
    70%  { box-shadow: 0 0 0 10px rgba(66,197,123,0); }
    100% { box-shadow: 0 0 0 0 rgba(66,197,123,0); }
  }
`;
