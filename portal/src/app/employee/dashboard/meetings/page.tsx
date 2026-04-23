'use client';

import { useEffect, useState } from 'react';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const HERO_BG = `${MARKETING_BASE}/working.jpg`;

// All groups use the brand palette. Each header still reads as its own card
// because the group label ("General", "Digital") is rendered at full weight
// above the cards; no need to colour-code groups.
const GROUP_ACCENT: Record<string, string> = {
  general: '#052847',
  quoting: '#0a3d6b',
  sales: '#052847',
  digital: '#0a3d6b',
  training: '#052847',
  other: '#0a3d6b',
};

interface Meeting {
  _id: string;
  name: string;
  group: string;
  teamsUrl: string;
  scheduleLabel: string;
  description?: string;
  host?: string;
}

const GROUP_LABELS: Record<string, string> = {
  general: 'General',
  quoting: 'Quoting',
  sales: 'Sales',
  digital: 'Digital',
  training: 'Training',
  other: 'Other',
};

export default function MeetingsPage() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/employee/api/meetings')
      .then(r => r.json())
      .then(d => setItems(d.meetings || []))
      .finally(() => setLoading(false));
  }, []);

  // Group by `group` field
  const grouped: Record<string, Meeting[]> = {};
  items.forEach(m => {
    const g = m.group || 'other';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(m);
  });
  const orderedGroups = ['general', 'quoting', 'sales', 'digital', 'training', 'other'].filter(g => grouped[g]);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 32 }}>
      {/* Navy hero — matches the Team Hub header band */}
      <div
        className="card-hero-navy"
        style={{ marginBottom: 28, ['--hero-bg' as string]: `url('${HERO_BG}')` }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Stay in sync</p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
              Team Meetings
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55 }}>
              All your recurring syncs in one place. Click any card to join on Teams.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: 10, minWidth: 140 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Recurring</p>
              <p style={{ fontSize: 22, color: '#fff', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>
                {items.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>meetings</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>No meetings configured yet.</div>
      ) : (
        orderedGroups.map(groupKey => {
          const accent = GROUP_ACCENT[groupKey] || 'var(--blue)';
          return (
            <section key={groupKey} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>{GROUP_LABELS[groupKey]}</h2>
                <span style={{ fontSize: 13, color: 'var(--subtle)' }}>{grouped[groupKey].length} meeting{grouped[groupKey].length === 1 ? '' : 's'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
                {grouped[groupKey].map(m => {
                  const hostInitial = m.host ? m.host.trim().charAt(0).toUpperCase() : '';
                  return (
                    <div key={m._id} className="card-sm" style={{ padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      {/* Subtle radial corner accent — adds depth without a slab of color */}
                      <div style={{
                        position: 'absolute',
                        top: 0, right: 0,
                        width: 160, height: 160,
                        background: `radial-gradient(circle at top right, ${accent}14 0%, transparent 65%)`,
                        pointerEvents: 'none',
                      }} />

                      <div style={{ padding: '22px 22px 18px', position: 'relative', flex: 1 }}>
                        {/* Group chip + schedule chip on one row — both small */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: `${accent}15`,
                            color: accent,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}>
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {GROUP_LABELS[groupKey]}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {m.scheduleLabel}
                          </span>
                        </div>

                        {/* Title — bold, generous size, brand navy */}
                        <h3 style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.01em' }}>
                          {m.name}
                        </h3>

                        {/* Host with mini-avatar */}
                        {m.host && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: m.description ? 10 : 0 }}>
                            <div style={{
                              width: 26, height: 26,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
                              color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700,
                              flexShrink: 0,
                              boxShadow: '0 1px 2px rgba(5,40,71,0.18)',
                            }}>
                              {hostInitial || '•'}
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{m.host}</p>
                            <span style={{ fontSize: 11, color: 'var(--subtle)' }}>· Host</span>
                          </div>
                        )}

                        {m.description && (
                          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{m.description}</p>
                        )}
                      </div>

                      {/* Footer bar — platform tag on left, join CTA on right */}
                      <div style={{
                        borderTop: '1px solid var(--line)',
                        padding: '12px 22px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface)',
                        position: 'relative',
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--subtle)', fontWeight: 500 }}>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                          Microsoft Teams
                        </span>
                        <a
                          href={m.teamsUrl}
                          target="_blank"
                          rel="noopener"
                          style={{
                            padding: '7px 14px',
                            background: accent,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            borderRadius: 8,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                            boxShadow: `0 2px 6px ${accent}40`,
                          }}
                        >
                          Join now
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
