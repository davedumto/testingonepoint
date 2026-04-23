'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { formatDateTime } from '@/lib/client/format-time';
import PageHeader from '@/components/PageHeader';

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

// Per-category themed visual — when an announcement has no imageUrl, we fall
// back to a gradient + icon keyed to the category so the card still reads rich.
// Colors all stay in the brand navy/blue family (per styling guidance); the
// icon is the only category differentiator.
interface CategoryTheme { gradient: string; icon: ReactNode; label: string; }

function categoryTheme(cat: string): CategoryTheme {
  const iconCommon = { width: 48, height: 48, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (cat) {
    case 'news':
      return {
        gradient: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
        label: 'News',
        icon: (<svg {...iconCommon}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>),
      };
    case 'update':
      return {
        gradient: 'linear-gradient(135deg, #0a3d6b 0%, #083355 100%)',
        label: 'Update',
        icon: (<svg {...iconCommon}><path d="M21 12a9 9 0 1 1-6.22-8.56"/><polyline points="21 3 21 9 15 9"/></svg>),
      };
    case 'birthday':
      return {
        gradient: 'linear-gradient(135deg, #052847 0%, #0a3d6b 50%, #1a5599 100%)',
        label: 'Birthday',
        icon: (<svg {...iconCommon}><path d="M20 21V10a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11"/><path d="M4 16s1-1 4-1 5 2 8 2 4-1 4-1"/><line x1="2" y1="21" x2="22" y2="21"/><line x1="9" y1="2" x2="9" y2="5"/><line x1="15" y1="2" x2="15" y2="5"/><line x1="12" y1="2" x2="12" y2="5"/></svg>),
      };
    case 'holiday':
      return {
        gradient: 'linear-gradient(135deg, #052847 0%, #1a5599 100%)',
        label: 'Holiday',
        icon: (<svg {...iconCommon}><path d="M2 12l10 10 10-10L12 2 2 12z"/><path d="M12 6v12M6 12h12"/></svg>),
      };
    case 'general':
    default:
      return {
        gradient: 'linear-gradient(135deg, #0a3d6b 0%, #052847 100%)',
        label: 'General',
        icon: (<svg {...iconCommon}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>),
      };
  }
}

function authorInitials(email: string): string {
  return email.split(/[@.]/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}

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

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 32 }}>
      <PageHeader
        eyebrow="What's new"
        title="News & Announcements"
        description="Latest posts from your team admins. Pinned items stay at the top."
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value); setPage(1); }}
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
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 80, fontSize: 14 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--subtle)', margin: '0 auto 16px', display: 'block' }}>
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
          </svg>
          No announcements yet.
        </div>
      ) : (
        <>
          {/* Featured hero — side-by-side layout. Left is image OR category
              gradient + icon; right is the content with author byline. */}
          {(() => {
            const theme = categoryTheme(featured.category);
            const hasImage = !!featured.imageUrl;
            return (
              <article className="card" style={{
                padding: 0,
                marginBottom: 24,
                overflow: 'hidden',
                display: 'grid',
                gridTemplateColumns: hasImage ? '1fr 1fr' : '360px 1fr',
                minHeight: 320,
              }}>
                {/* Visual panel */}
                <div style={{
                  background: hasImage
                    ? `#f6f4ef url('${featured.imageUrl}') center / cover no-repeat`
                    : theme.gradient,
                  position: 'relative',
                  color: '#fff',
                  minHeight: 240,
                }}>
                  {!hasImage && (
                    <div style={{ position: 'absolute', inset: 0, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)' }}>{theme.label}</p>
                      <div style={{ color: 'rgba(255,255,255,0.85)' }}>{theme.icon}</div>
                    </div>
                  )}
                  {featured.pinned && (
                    <div style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      padding: '6px 12px',
                      background: 'rgba(232,199,78,0.95)',
                      color: '#6b4500',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      borderRadius: 999,
                    }}>
                      Pinned
                    </div>
                  )}
                </div>
                {/* Content */}
                <div style={{ padding: 32, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: 10 }}>{featured.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--subtle)' }}>{formatDateTime(featured.postedAt)}</span>
                  </div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em', marginBottom: 14, lineHeight: 1.2 }}>{featured.title}</h2>
                  <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1 }}>{featured.body}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: 'var(--navy)',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {authorInitials(featured.postedBy)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Posted by</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{featured.postedBy}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })()}

          {rest.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
              {rest.map(a => {
                const theme = categoryTheme(a.category);
                const hasImage = !!a.imageUrl;
                return (
                  <article key={a._id} className="card-sm" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Visual header */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: hasImage
                        ? `#f6f4ef url('${a.imageUrl}') center / cover no-repeat`
                        : theme.gradient,
                      color: '#fff',
                      position: 'relative',
                      flexShrink: 0,
                    }}>
                      {!hasImage && (
                        <div style={{ position: 'absolute', inset: 0, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)' }}>{theme.label}</p>
                          <div style={{ color: 'rgba(255,255,255,0.78)' }}>{theme.icon}</div>
                        </div>
                      )}
                      {a.pinned && (
                        <div style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          padding: '4px 10px',
                          background: 'rgba(232,199,78,0.95)',
                          color: '#6b4500',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          borderRadius: 999,
                        }}>
                          Pinned
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: 10 }}>{a.category}</span>
                        <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{formatDateTime(a.postedAt)}</span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, lineHeight: 1.3 }}>{a.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', flex: 1 }}>{a.body}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                        <div style={{
                          width: 26, height: 26,
                          borderRadius: '50%',
                          background: 'var(--navy)',
                          color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {authorInitials(a.postedBy)}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.postedBy}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 28 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
