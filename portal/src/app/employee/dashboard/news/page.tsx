'use client';

import { useEffect, useState } from 'react';

interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  imageUrl?: string;
  postedBy: string;
  postedAt: string;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'update', label: 'Updates' },
  { value: 'general', label: 'General' },
  { value: 'birthday', label: 'Birthdays' },
  { value: 'holiday', label: 'Holidays' },
];

export default function NewsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '15' });
    if (category) qs.set('category', category);
    fetch(`/employee/api/news?${qs.toString()}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.announcements || []);
        setTotalPages(d.pagination?.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [page, category]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>News &amp; Announcements</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Latest posts from your team admins.</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value); setPage(1); }}
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
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No announcements.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(a => (
            <article key={a._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {a.pinned && <span className="badge" style={{ background: 'rgba(232,199,78,0.25)', color: '#8a5a00' }}>Pinned</span>}
                <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{a.category}</span>
                <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{new Date(a.postedAt).toLocaleString()}</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>{a.title}</h2>
              {a.imageUrl && <img src={a.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 12 }} />}
              <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{a.body}</p>
              <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 12 }}>Posted by {a.postedBy}</p>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
