'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe } from '@/lib/pusher/client';

interface Message {
  _id: string;
  senderType: 'client' | 'agent' | 'admin';
  senderName: string;
  body: string;
  attachments: { name: string; url: string }[];
  readByClient: boolean;
  createdAt: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change — standard chat UX.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const load = useCallback(async () => {
    const [meRes, msgRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/messages'),
    ]);
    const meData = meRes.ok ? await meRes.json() : null;
    const msgData = msgRes.ok ? await msgRes.json() : null;
    if (meData?.user?.userId) setUserId(meData.user.userId);
    if (msgData?.messages) setMessages(msgData.messages);
    // Clear any unread agent-authored markers as soon as the client opens this page.
    secureFetch('/api/messages/read-all', { method: 'POST' }).catch(() => {});
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Live updates: subscribe to our own per-user channel once we know the userId.
  useEffect(() => {
    if (!userId) return;
    return subscribe(`private-user-${userId}`, {
      'message:new': (raw) => {
        const m = raw as Message;
        setMessages(prev => (prev.some(x => x._id === m._id) ? prev : [...prev, m]));
      },
    });
  }, [userId]);

  async function uploadAttachment(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await secureFetch('/api/messages/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data.attachment as { name: string; url: string; cloudinaryPublicId?: string; mimeType?: string; sizeBytes?: number };
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    // A message needs either text OR at least one attachment — not both required.
    if (!body && pendingFiles.length === 0) return;
    setSending(true);
    try {
      // Upload all selected files first, then send the message with URLs.
      // Sequential rather than parallel so the server isn't overwhelmed and
      // the user gets a clear error on the first failure.
      const uploaded = [];
      for (const f of pendingFiles) {
        try {
          uploaded.push(await uploadAttachment(f));
        } catch (err) {
          setToast({ message: `Upload failed for ${f.name}: ${err instanceof Error ? err.message : 'unknown error'}`, type: 'error' });
          return;
        }
      }

      const res = await secureFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body || '(attachment)', attachments: uploaded }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not send.', type: 'error' }); return; }
      // Optimistically append — the Pusher echo is deduped by _id.
      setMessages(prev => (prev.some(x => x._id === data.message._id) ? prev : [...prev, data.message]));
      setInput('');
      setPendingFiles([]);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', height: 'calc(100svh - 140px)', minHeight: 400 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>Messages</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Direct line to your OnePoint team. Replies come in live.</p>
      </div>

      {/* Conversation scroll area */}
      <div
        ref={scrollRef}
        className="card"
        style={{ flex: 1, padding: 20, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>Start the conversation</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Ask a question, send a document, or just say hi. We&apos;re here.</p>
          </div>
        ) : (
          messages.map(m => <MessageBubble key={m._id} m={m} />)
        )}
      </div>

      {/* Pending attachments preview — appears above the composer once files
          are selected, so the user can verify + remove before sending. */}
      {pendingFiles.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {pendingFiles.map((f, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--surface)', borderRadius: 999, fontSize: 11, color: 'var(--navy)' }}>
              📎 {f.name}
              <button
                type="button"
                onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--subtle)', padding: 0, fontSize: 14 }}
                aria-label="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={send} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {/* Hidden file input driven by the paperclip label below */}
        <label style={{ padding: '12px', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, flexShrink: 0, lineHeight: 1 }} title="Attach file">
          📎
          <input
            type="file"
            accept=".pdf,image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files || []);
              setPendingFiles(prev => [...prev, ...files]);
              e.target.value = '';  // reset so selecting the same file twice still fires onChange
            }}
          />
        </label>
        <textarea
          className="input"
          placeholder={pendingFiles.length > 0 ? 'Add a note (optional)…' : 'Type a message…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={2}
          maxLength={5000}
          style={{ resize: 'vertical', minHeight: 48, maxHeight: 180, padding: '10px 14px', fontSize: 14 }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
        />
        <button type="submit" disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="btn btn-navy" style={{ padding: '12px 20px', fontSize: 13, textTransform: 'none', letterSpacing: 0, flexShrink: 0 }}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const isMe = m.senderType === 'client';
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '75%',
        padding: '10px 14px',
        borderRadius: 12,
        background: isMe ? 'var(--navy)' : 'var(--surface)',
        color: isMe ? '#fff' : 'var(--ink)',
      }}>
        {!isMe && <p style={{ fontSize: 11, fontWeight: 700, color: '#0a3d6b', marginBottom: 4 }}>{m.senderName} · OnePoint</p>}
        <p style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</p>
        {m.attachments?.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {m.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener" style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.85)' : 'var(--blue, #0a3d6b)', textDecoration: 'underline' }}>
                📎 {a.name}
              </a>
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--subtle)', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
          {formatTime(m.createdAt)}
        </p>
      </div>
    </div>
  );
}
