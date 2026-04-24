'use client';

import { useCallback, useEffect, useState } from 'react';
import { subscribe, CHANNELS } from '@/lib/pusher/client';

interface ActiveEOTM {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeePhotoUrl?: string;
  message?: string;
  publishedAt: string;
  expiresAt: string;
}

// Dashboard hero that celebrates the current Employee of the Month. Fetches
// the active record on mount; hides itself when there isn't one, or when the
// user has dismissed this specific winner (keyed by record id so the next
// winner resets the dismissal).
export default function EmployeeOfMonthBanner() {
  const [data, setData] = useState<ActiveEOTM | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Fetches the current active EOTM and drops it into state. Extracted so
  // both the mount-load and the Pusher invalidation handler can reuse it.
  const loadActive = useCallback(async () => {
    try {
      const res = await fetch('/employee/api/recognition/active');
      if (!res.ok) return;
      const { active }: { active: ActiveEOTM | null } = await res.json();
      if (!active) {
        // Admin removed the EOTM — clear the banner for everyone on screen.
        setData(null);
        return;
      }
      if (new Date(active.expiresAt).getTime() <= Date.now()) {
        setData(null);
        return;
      }
      const dismissKey = `eotm:dismissed:${active._id}`;
      const isDismissed = typeof window !== 'undefined' && window.localStorage.getItem(dismissKey) === '1';
      setDismissed(isDismissed);
      setData(active);
    } catch {
      // Non-fatal — banner stays in its previous state.
    }
  }, []);

  useEffect(() => { loadActive(); }, [loadActive]);

  // Live invalidation: the admin POST/DELETE on /api/admin/recognition
  // publishes `hub:changed` with surface='recognition'. Any open dashboard
  // listens and refetches, so new winners light up live (and removed ones
  // clear live) without anyone needing to refresh.
  useEffect(() => {
    const teardown = subscribe(CHANNELS.hub, {
      'hub:changed': (payload) => {
        const p = payload as { surface?: string } | undefined;
        if (p?.surface === 'recognition') loadActive();
      },
    });
    return teardown;
  }, [loadActive]);

  if (!data || dismissed) return null;

  const firstName = data.employeeName.split(' ')[0];
  const initials = data.employeeName
    .split(' ')
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join('') || '?';
  const hoursLeft = Math.max(1, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000)));

  const handleDismiss = () => {
    try { window.localStorage.setItem(`eotm:dismissed:${data._id}`, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 28,
        color: '#fff',
        background: 'linear-gradient(120deg, #052847 0%, #0a3d6b 55%, #0d3d6b 100%)',
        boxShadow: '0 18px 44px rgba(5,40,71,0.25)',
      }}
    >
      {/* Decorative confetti dots — pure SVG so no extra assets. */}
      <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22, pointerEvents: 'none' }}>
        {Array.from({ length: 34 }).map((_, i) => {
          const cx = (i * 37) % 600 + ((i * 13) % 17);
          const cy = (i * 23) % 200 + ((i * 11) % 9);
          const r = 1.5 + (i % 3);
          const fills = ['#e8c74e', '#ffffff', '#8dc7ff', '#e8c74e'];
          return <circle key={i} cx={cx} cy={cy} r={r} fill={fills[i % fills.length]} />;
        })}
      </svg>

      {/* Gold ribbon accent behind the photo */}
      <div aria-hidden style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,199,78,0.22) 0%, transparent 70%)' }} />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#fff', fontSize: 18, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ×
      </button>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        {/* Avatar with gold ring */}
        <div
          style={{
            width: 108, height: 108, borderRadius: '50%', flexShrink: 0,
            background: data.employeePhotoUrl ? `url('${data.employeePhotoUrl}') center/cover` : 'linear-gradient(135deg, #0a3d6b, #052847)',
            border: '4px solid #e8c74e',
            boxShadow: '0 0 0 4px rgba(232,199,78,0.22), 0 10px 24px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '0.02em',
          }}
        >
          {!data.employeePhotoUrl && initials}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e8c74e', marginBottom: 10 }}>
            <span aria-hidden>🏆</span> Employee of the Month
          </p>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#fff', marginBottom: 8 }}>
            {data.employeeName}
          </h2>
          {data.message ? (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, fontStyle: 'italic', maxWidth: 620 }}>
              &ldquo;{data.message}&rdquo;
            </p>
          ) : (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, maxWidth: 620 }}>
              Congratulations {firstName}! Give them a huge round of applause for the great work this month.
            </p>
          )}
          <p style={{ marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
            Celebrating for the next {hoursLeft} hour{hoursLeft === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </div>
  );
}
