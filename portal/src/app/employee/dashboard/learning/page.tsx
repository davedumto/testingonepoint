'use client';

import { useEffect, useState } from 'react';

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Learning Hub</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Training sessions posted by your admin. Click any session to join on Teams.
      </p>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <svg style={{ width: 48, height: 48, color: 'var(--subtle)', margin: '0 auto 16px', display: 'block' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <p style={{ color: 'var(--muted)', marginBottom: 8 }}>No training sessions scheduled yet.</p>
          <p style={{ color: 'var(--subtle)', fontSize: 13 }}>Your admin will post sessions here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {items.map(m => (
            <div key={m._id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <span className="badge badge-purple">Training</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginTop: 8 }}>{m.name}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.scheduleLabel}</p>
                {m.host && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>Host: {m.host}</p>}
              </div>
              {m.description && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{m.description}</p>}
              <a href={m.teamsUrl} target="_blank" rel="noopener" className="btn btn-navy" style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none', marginTop: 'auto' }}>
                Join Training
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
