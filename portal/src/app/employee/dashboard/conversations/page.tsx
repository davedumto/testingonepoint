'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe, CHANNELS } from '@/lib/pusher/client';
import { formatDate } from '@/lib/client/format-time';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const HERO_BG = `${MARKETING_BASE}/working.jpg`;

type PostType = 'discussion' | 'question' | 'praise';

interface Reply { _id: string; authorId: string; authorName: string; body: string; createdAt: string; }
interface Post {
  _id: string;
  authorId: string;
  authorName: string;
  type: PostType | 'poll';
  body: string;
  praiseRecipientName?: string;
  likes: string[];
  likedByMe: boolean;
  replyCount: number;
  createdAt: string;
  replies: Reply[];
}

// Post-type badges in brand colors. Praise keeps its amber accent because
// it's a genuine positive-affect signal (kudos) and reads differently from
// navy — the only off-brand colour we're keeping, purely because of meaning.
// Type badges in brand colors. Praise keeps amber because it reads as a
// distinct positive-affect signal (kudos), which is the one off-brand accent
// with semantic value.
const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  discussion: { label: 'Discussion', bg: 'rgba(10,61,107,0.1)', color: '#0a3d6b' },
  question: { label: 'Question', bg: 'rgba(5,40,71,0.1)', color: '#052847' },
  praise: { label: 'Praise', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  poll: { label: 'Poll', bg: 'rgba(10,61,107,0.1)', color: '#0a3d6b' },
};

type IconProps = { width?: number; height?: number };
const TypeIcons = {
  discussion: ({ width = 14, height = 14 }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  question: ({ width = 14, height = 14 }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  praise: ({ width = 14, height = 14 }: IconProps) => (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
};

// Turn "admin@onepointinsuranceagency.com" into "Admin" when we have nothing
// better. Keeps the feed from looking like a log file.
function displayName(raw: string): string {
  if (!raw) return 'Teammate';
  if (!raw.includes('@')) return raw;
  const prefix = raw.split('@')[0].replace(/[._-]/g, ' ');
  return prefix.replace(/\b\w/g, c => c.toUpperCase());
}

function initials(name: string) {
  const clean = displayName(name);
  return clean.split(' ').map(s => s[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '•';
}

// Stable avatar color from the author identity — keeps the same person the
// same shade of navy/blue across visits without a server-side field.
function avatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  const shades = ['#052847', '#0a3d6b', '#083355', '#1a5599', '#052847'];
  return shades[h % shades.length];
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default function ConversationsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [posting, setPosting] = useState(false);
  const [newPostType, setNewPostType] = useState<PostType>('discussion');
  const [newPostBody, setNewPostBody] = useState('');
  const [newPraiseRecipient, setNewPraiseRecipient] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // Used to gate the delete button on each reply — only the author sees it.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/employee/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.employee?.employeeId) setCurrentUserId(d.employee.employeeId); })
      .catch(() => { /* silent — delete button just stays hidden */ });
  }, []);

  function load() {
    setLoading(true);
    const qs = filter === 'all' ? '' : `?type=${filter}`;
    fetch(`/employee/api/conversations${qs}`)
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]);

  // Live updates via Pusher. No-op when env vars aren't set, so falls back
  // to the reload-on-action UX without extra branching here.
  useEffect(() => {
    return subscribe(CHANNELS.conversations, {
      'post:new': (raw) => {
        const p = raw as Post;
        if (filter !== 'all' && p.type !== filter) return;
        setPosts(prev => (prev.some(x => x._id === p._id) ? prev : [p, ...prev]));
      },
      'reply:new': (raw) => {
        const { postId, replyCount, reply } = raw as { postId: string; replyCount: number; reply: Reply };
        setPosts(prev => prev.map(post => {
          if (post._id !== postId) return post;
          if (post.replies.some(r => r._id === reply._id)) return post;
          return { ...post, replyCount, replies: [...post.replies, reply] };
        }));
      },
      'like:update': (raw) => {
        const { postId, likeCount } = raw as { postId: string; likeCount: number };
        // likedByMe is driven by the current user's own toggleLike() — Pusher
        // only needs to sync the count. The UI renders post.likes.length, so
        // we just pad/trim the array to match.
        setPosts(prev => prev.map(post => {
          if (post._id !== postId || post.likes.length === likeCount) return post;
          const likes = post.likes.length < likeCount
            ? [...post.likes, ...Array.from({ length: likeCount - post.likes.length }, (_, i) => `_p${i}`)]
            : post.likes.slice(0, likeCount);
          return { ...post, likes };
        }));
      },
      'reply:delete': (raw) => {
        const { postId, replyId, replyCount } = raw as { postId: string; replyId: string; replyCount: number };
        setPosts(prev => prev.map(post => {
          if (post._id !== postId) return post;
          return { ...post, replyCount, replies: post.replies.filter(r => r._id !== replyId) };
        }));
      },
    });
  }, [filter]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPostBody.trim()) return;
    setPosting(true);
    try {
      const res = await secureFetch('/employee/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newPostType, body: newPostBody.trim(), praiseRecipientName: newPostType === 'praise' ? newPraiseRecipient.trim() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not post.', type: 'error' }); return; }
      setNewPostBody('');
      setNewPraiseRecipient('');
      setNewPostType('discussion');
      load();
    } finally { setPosting(false); }
  }

  async function submitReply(postId: string) {
    const body = (replyDrafts[postId] || '').trim();
    if (!body) return;
    const res = await secureFetch(`/employee/api/conversations/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setReplyDrafts(d => ({ ...d, [postId]: '' }));
      setReplyingTo(null);
      load();
    }
  }

  async function deleteReply(postId: string, replyId: string) {
    if (!confirm('Delete this reply? This cannot be undone.')) return;
    const res = await secureFetch(`/employee/api/conversations/${postId}/reply/${replyId}`, { method: 'DELETE' });
    if (res.ok) {
      // Optimistically remove locally; the Pusher event will be a no-op on this
      // client (already gone) but will update other open clients.
      setPosts(prev => prev.map(post => {
        if (post._id !== postId) return post;
        return { ...post, replyCount: Math.max(0, post.replyCount - 1), replies: post.replies.filter(r => r._id !== replyId) };
      }));
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error || 'Could not delete reply.', type: 'error' });
    }
  }

  async function toggleLike(postId: string) {
    const res = await secureFetch(`/employee/api/conversations/${postId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likedByMe: data.liked, likes: data.liked ? [...p.likes, '1'] : p.likes.slice(0, -1) } : p));
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navy hero — mirrors the Team Hub greeting band */}
      <div
        className="card-hero-navy"
        style={{ marginBottom: 28, ['--hero-bg' as string]: `url('${HERO_BG}')` }}
      >
        <div style={{ maxWidth: 640 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Water cooler</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
            Conversations
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55 }}>
            Share ideas, ask questions, and celebrate each other in real time.
          </p>
        </div>
      </div>

      {/* Composer — tighter layout, type pills inline with submit, no floating
          character pill. Praise field appears inline only when praise is picked. */}
      <form onSubmit={submitPost} className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['discussion', 'question', 'praise'] as const).map(t => {
            const active = newPostType === t;
            const Icon = TypeIcons[t];
            const label = t.charAt(0).toUpperCase() + t.slice(1);
            return (
              <button
                type="button"
                key={t}
                onClick={() => setNewPostType(t)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  border: active ? '1px solid var(--navy)' : '1px solid var(--line)',
                  background: active ? 'var(--navy)' : '#fff',
                  color: active ? '#fff' : 'var(--muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon width={12} height={12} />
                {label}
              </button>
            );
          })}
        </div>
        {newPostType === 'praise' && (
          <input
            type="text"
            placeholder="Who are you praising? (teammate's name)"
            value={newPraiseRecipient}
            onChange={e => setNewPraiseRecipient(e.target.value)}
            className="input"
            maxLength={120}
            style={{ marginBottom: 10, fontSize: 13 }}
          />
        )}
        <textarea
          className="input"
          placeholder={newPostType === 'question' ? "Ask anything, someone here has probably solved it" : newPostType === 'praise' ? 'Tell everyone why they deserve the shoutout…' : "What's on your mind?"}
          value={newPostBody}
          onChange={e => setNewPostBody(e.target.value)}
          rows={2}
          maxLength={5000}
          style={{ resize: 'vertical', marginBottom: 10, fontSize: 14, lineHeight: 1.55, minHeight: 72, maxHeight: 220, padding: '10px 14px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: newPostBody.length > 4500 ? 'var(--red)' : 'var(--subtle)' }}>
            {newPostBody.length} / 5000
          </span>
          <button type="submit" disabled={posting || !newPostBody.trim()} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: 12, textTransform: 'none', letterSpacing: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {posting ? 'Posting…' : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Post
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filter pills — compact text-button style, no chunky outlined buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        {(['all', 'discussion', 'question', 'praise'] as const).map(t => {
          const active = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: active ? 'rgba(10,61,107,0.1)' : 'transparent',
                color: active ? 'var(--navy)' : 'var(--muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--subtle)', margin: '0 auto 16px', display: 'block' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Quiet in here</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Be the first to start a conversation.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => {
            const typeCfg = TYPE_BADGE[post.type] || TYPE_BADGE.discussion;
            const TypeIcon = TypeIcons[post.type as keyof typeof TypeIcons] || TypeIcons.discussion;
            const isPraise = post.type === 'praise';
            const isReplying = replyingTo === post._id;
            const hasReplies = post.replies.length > 0;
            return (
              <article key={post._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Praise: slim gold strip */}
                {isPraise && post.praiseRecipientName && (
                  <div style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(90deg, rgba(232,199,78,0.22) 0%, rgba(232,199,78,0.06) 100%)',
                    borderBottom: '1px solid rgba(232,199,78,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <TypeIcons.praise width={13} height={13} />
                    <p style={{ fontSize: 12, color: '#6b4500', fontWeight: 600 }}>
                      Celebrating <strong>{post.praiseRecipientName}</strong>
                    </p>
                  </div>
                )}

                {/* Twitter-style: avatar left column, content right column */}
                <div style={{ padding: 18, display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: avatarBg(post.authorId),
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {initials(post.authorName)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header line: name · time · type badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{displayName(post.authorName)}</p>
                      <span style={{ fontSize: 12, color: 'var(--subtle)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--subtle)' }}>{timeAgo(post.createdAt)}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: typeCfg.bg,
                        color: typeCfg.color,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        <TypeIcon width={10} height={10} />
                        {typeCfg.label}
                      </span>
                    </div>

                    {/* Body */}
                    <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{post.body}</p>

                    {/* Engagement bar — text-button style, no border */}
                    <div style={{ display: 'flex', gap: 4, marginLeft: -10 }}>
                      <button
                        onClick={() => toggleLike(post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          color: post.likedByMe ? 'var(--blue)' : 'var(--muted)',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={post.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        {post.likes.length > 0 ? post.likes.length : 'Like'}
                      </button>
                      <button
                        onClick={() => setReplyingTo(isReplying ? null : post._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          color: isReplying ? 'var(--blue)' : 'var(--muted)',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {post.replyCount > 0 ? `${post.replyCount}` : 'Reply'}
                      </button>
                    </div>

                    {/* Replies — flat list, no nested bubbles, separated by hairlines */}
                    {hasReplies && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {post.replies.map(reply => {
                          const isMine = currentUserId && reply.authorId === currentUserId;
                          return (
                            <div key={reply._id} style={{ display: 'flex', gap: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: avatarBg(reply.authorId),
                                color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700,
                                flexShrink: 0,
                              }}>
                                {initials(reply.authorName)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{displayName(reply.authorName)}</p>
                                    <span style={{ fontSize: 11, color: 'var(--subtle)' }}>· {timeAgo(reply.createdAt)}</span>
                                  </div>
                                  {isMine && (
                                    <button
                                      type="button"
                                      onClick={() => deleteReply(post._id, reply._id)}
                                      title="Delete reply"
                                      aria-label="Delete reply"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--subtle)',
                                        padding: 4,
                                        borderRadius: 4,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--subtle)')}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 2 }}>{reply.body}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply composer — inline, no surface bg */}
                    {isReplying && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: hasReplies ? 'none' : '1px solid var(--line)' }}>
                        <textarea
                          className="input"
                          placeholder={`Reply to ${displayName(post.authorName)}…`}
                          value={replyDrafts[post._id] || ''}
                          onChange={e => setReplyDrafts(d => ({ ...d, [post._id]: e.target.value }))}
                          rows={2}
                          maxLength={5000}
                          style={{ resize: 'vertical', fontSize: 13, marginBottom: 8 }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', borderRadius: 6 }}
                          >
                            Cancel
                          </button>
                          <button onClick={() => submitReply(post._id)} disabled={!(replyDrafts[post._id] || '').trim()} className="btn btn-navy" style={{ padding: '6px 16px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
