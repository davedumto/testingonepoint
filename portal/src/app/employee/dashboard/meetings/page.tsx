'use client';

import { useEffect, useState } from 'react';

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Team Meetings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>All your team meetings in one place. Click to join on Teams.</p>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No meetings configured yet.</div>
      ) : (
        orderedGroups.map(groupKey => (
          <section key={groupKey} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>{GROUP_LABELS[groupKey]}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {grouped[groupKey].map(m => (
                <div key={m._id} className="card-sm" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.scheduleLabel}</p>
                    {m.host && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>Host: {m.host}</p>}
                  </div>
                  {m.description && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{m.description}</p>}
                  <a href={m.teamsUrl} target="_blank" rel="noopener" className="btn btn-teal" style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none', marginTop: 'auto' }}>
                    Join on Teams
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
