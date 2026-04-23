'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const LEARNING_HERO = `${MARKETING_BASE}/working.jpg`;

interface Meeting {
  _id: string;
  name: string;
  teamsUrl: string;
  scheduleLabel: string;
  description?: string;
  host?: string;
}

export default function LearningPage() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/employee/api/meetings?group=training')
      .then(r => r.json())
      .then(d => setItems(d.meetings || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 32 }}>
      <PageHeader
        eyebrow="Keep growing"
        title="Learning Hub"
        description="Training sessions posted by your admin. Click any session to join on Teams."
      />

      {/* Hero banner with image backdrop */}
      <div className="training-cta" style={{ marginBottom: 32, ['--training-bg' as string]: `url('${LEARNING_HERO}')` }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>Build your craft</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 8 }}>
            30 minutes a week compounds fast
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55, maxWidth: 520 }}>
            Consistent learning is how the best agents keep their edge. Pick a session and block the time.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <svg style={{ width: 48, height: 48, color: 'var(--subtle)', margin: '0 auto 16px', display: 'block' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p style={{ color: 'var(--muted)', marginBottom: 8, fontSize: 15 }}>No training sessions scheduled yet.</p>
          <p style={{ color: 'var(--subtle)', fontSize: 13 }}>Your admin will post sessions here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {items.map(m => (
            <div key={m._id} className="card-sm" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '3px solid #0a3d6b' }}>
              <div>
                <span className="badge badge-blue">Training</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)', marginTop: 10, lineHeight: 1.3 }}>{m.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{m.scheduleLabel}</p>
                {m.host && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>Host, {m.host}</p>}
              </div>
              {m.description && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{m.description}</p>}
              <a href={m.teamsUrl} target="_blank" rel="noopener" className="btn btn-navy" style={{ padding: '10px 16px', fontSize: 13, textDecoration: 'none', marginTop: 'auto' }}>
                Join Training
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
