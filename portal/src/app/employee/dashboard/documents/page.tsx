'use client';

import { useEffect, useState } from 'react';
import { formatDate } from '@/lib/client/format-time';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const HERO_BG = `${MARKETING_BASE}/working.jpg`;

// Category accents stay in the brand palette. Compliance stays red because
// "compliance" carries a genuine urgency signal and the warning red is semantic,
// not decorative — keeping it so admins can spot compliance docs at a glance.
const CATEGORY_ACCENT: Record<string, string> = {
  marketing: '#052847',
  training: '#0a3d6b',
  compliance: '#dc2626',
  forms: '#0a3d6b',
  quotes: '#052847',
  resources: '#0a3d6b',
  other: '#5a6c7e',
};

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
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 32 }}>
      {/* Navy hero matches the Team Hub greeting */}
      <div
        className="card-hero-navy"
        style={{ marginBottom: 28, ['--hero-bg' as string]: `url('${HERO_BG}')` }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Resources</p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
              Documents
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55 }}>
              Links to OneDrive, SharePoint, and other shared files, organized by category.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: 10, minWidth: 130 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Available</p>
              <p style={{ fontSize: 20, color: '#fff', fontWeight: 800, marginTop: 2 }}>
                {items.length}<span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>docs</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <svg style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={category === c.value ? 'btn btn-navy' : 'btn btn-outline'}
            style={{ padding: '8px 16px', fontSize: 12 }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: 'rgba(10,61,107,0.08)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p style={{ color: 'var(--navy)', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No documents match your filters</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Try a different category or clear your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
          {items.map(d => {
            const accent = CATEGORY_ACCENT[d.category] || 'var(--blue)';
            return (
              <a key={d._id} href={d.url} target="_blank" rel="noopener" className="card-sm" style={{ padding: 20, textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0,
                  width: 44, height: 44,
                  borderRadius: 10,
                  background: `${accent}18`,
                  color: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.3 }}>{d.name}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <span className="badge" style={{ background: `${accent}18`, color: accent, textTransform: 'capitalize', fontSize: 10 }}>{d.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{formatDate(d.postedAt)}</span>
                  </div>
                  {d.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>{d.description}</p>}
                </div>
                <svg style={{ width: 16, height: 16, color: 'var(--subtle)', flexShrink: 0, marginTop: 4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                </svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
