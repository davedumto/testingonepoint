'use client';

import { useEffect, useState } from 'react';

interface DocLink {
  _id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  postedAt: string;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'training', label: 'Training' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'forms', label: 'Forms' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'resources', label: 'Resources' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsPage() {
  const [items, setItems] = useState<DocLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    if (category) qs.set('category', category);
    fetch(`/employee/api/documents?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setItems(d.documents || []))
      .finally(() => setLoading(false));
  }, [search, category]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Documents</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Links to OneDrive, SharePoint, and other shared files.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search documents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: 220 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={category === c.value ? 'btn btn-navy' : 'btn btn-outline'}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No documents match.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(d => (
            <a key={d._id} href={d.url} target="_blank" rel="noopener" className="card-sm" style={{ padding: 14, textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{d.name}</p>
                <p style={{ fontSize: 11, color: 'var(--subtle)' }}>
                  <span style={{ textTransform: 'capitalize' }}>{d.category}</span> · {new Date(d.postedAt).toLocaleDateString()}
                </p>
                {d.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{d.description}</p>}
              </div>
              <svg style={{ width: 16, height: 16, color: 'var(--subtle)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" /><path d="M7 7h10v10" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
