'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe, CHANNELS } from '@/lib/pusher/client';

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

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  discussion: { label: 'Discussion', bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  question: { label: 'Question', bg: 'rgba(124,58,237,0.1)', color: '#7c3aed' },
  praise: { label: 'Praise', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' },
  poll: { label: 'Poll', bg: 'rgba(46,154,85,0.1)', color: '#2e9a55' },
};

function initials(name: string) {
  return name.split(' ').map(s => s[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '•';
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
  return new Date(iso).toLocaleDateString();
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

  async function toggleLike(postId: string) {
    const res = await secureFetch(`/employee/api/conversations/${postId}/like`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likedByMe: data.liked, likes: data.liked ? [...p.likes, '1'] : p.likes.slice(0, -1) } : p));
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Conversations</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Share ideas, ask questions, and celebrate each other.</p>

      {/* New post */}
      <form onSubmit={submitPost} className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['discussion', 'question', 'praise'] as const).map(t => (
            <button type="button" key={t} onClick={() => setNewPostType(t)} className={newPostType === t ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '6px 14px', fontSize: 12, textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
        {newPostType === 'praise' && (
          <input type="text" placeholder="Who are you praising?" value={newPraiseRecipient} onChange={e => setNewPraiseRecipient(e.target.value)} className="input" style={{ marginBottom: 8 }} maxLength={120} />
        )}
        <textarea
          className="input"
          placeholder={newPostType === 'question' ? 'What would you like to ask?' : newPostType === 'praise' ? 'Why do they deserve recognition?' : 'Share your thoughts…'}
          value={newPostBody}
          onChange={e => setNewPostBody(e.target.value)}
          rows={3}
          maxLength={5000}
          style={{ resize: 'vertical', marginBottom: 12 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{newPostBody.length}/5000</span>
          <button type="submit" disabled={posting || !newPostBody.trim()} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: 13 }}>
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'discussion', 'question', 'praise'] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)} className={filter === t ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '6px 14px', fontSize: 12, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No posts yet. Be the first.</div>
      ) : (
        posts.map(post => {
          const typeCfg = TYPE_BADGE[post.type] || TYPE_BADGE.discussion;
          return (
            <article key={post._id} className="card" style={{ padding: 18, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {initials(post.authorName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{post.authorName}</p>
                    <span className="badge" style={{ background: typeCfg.bg, color: typeCfg.color }}>{typeCfg.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>{timeAgo(post.createdAt)}</p>
                </div>
              </div>
              {post.type === 'praise' && post.praiseRecipientName && (
                <p style={{ fontSize: 13, color: '#8a5a00', fontWeight: 600, marginBottom: 6 }}>
                  🎉 Recognizing <strong>{post.praiseRecipientName}</strong>
                </p>
              )}
              <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{post.body}</p>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <button onClick={() => toggleLike(post._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.likedByMe ? 'var(--teal)' : 'var(--muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {post.likedByMe ? '♥' : '♡'} {post.likes.length}
                </button>
                <button onClick={() => setReplyingTo(replyingTo === post._id ? null : post._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
                  💬 {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
                </button>
              </div>

              {/* Replies */}
              {post.replies.length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid var(--line)' }}>
                  {post.replies.map(reply => (
                    <div key={reply._id} style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {initials(reply.authorName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12 }}>
                          <strong style={{ color: 'var(--navy)' }}>{reply.authorName}</strong>
                          <span style={{ color: 'var(--subtle)', marginLeft: 6 }}>{timeAgo(reply.createdAt)}</span>
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 2 }}>{reply.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === post._id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <textarea
                    className="input"
                    placeholder="Write a reply…"
                    value={replyDrafts[post._id] || ''}
                    onChange={e => setReplyDrafts(d => ({ ...d, [post._id]: e.target.value }))}
                    rows={2}
                    maxLength={5000}
                    style={{ resize: 'vertical', flex: 1 }}
                  />
                  <button onClick={() => submitReply(post._id)} disabled={!(replyDrafts[post._id] || '').trim()} className="btn btn-navy" style={{ padding: '8px 14px', fontSize: 12 }}>
                    Reply
                  </button>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
