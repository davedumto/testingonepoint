'use client';

import { useState } from 'react';
import { secureFetch } from '@/lib/client/secure-fetch';
import Toast from '@/components/Toast';

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('high');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function send() {
    if (!title.trim()) { setToast({ message: 'Title is required.', type: 'error' }); return; }
    setSending(true);
    try {
      const res = await secureFetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), link: link.trim() || undefined, priority }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Broadcast failed.', type: 'error' }); return; }
      setToast({ message: `Sent to ${data.sentTo} employee${data.sentTo === 1 ? '' : 's'}.`, type: 'success' });
      setTitle(''); setBody(''); setLink('');
      setConfirming(false);
    } catch {
      setToast({ message: 'Broadcast failed.', type: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 6 }}>Admin</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>Broadcast</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          Push a notification to every active employee in real time. High priority shows a red indicator and stays highlighted until dismissed.
        </p>
      </div>

      <div className="card">
        <div style={{ marginBottom: 18 }}>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Office closed Friday for the holiday" />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Body (optional)</label>
          <textarea className="input" value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="More detail, links, context…" style={{ resize: 'vertical' }} />
          <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>{body.length}/2000</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Deep link (optional)</label>
          <input className="input" value={link} onChange={e => setLink(e.target.value)} maxLength={500} placeholder="https://… or /employee/dashboard/news" />
          <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>If set, clicking the notification opens this URL.</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Priority</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setPriority('normal')} className={priority === 'normal' ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '8px 16px', fontSize: 13 }}>
              Normal
            </button>
            <button type="button" onClick={() => setPriority('high')} className={priority === 'high' ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '8px 16px', fontSize: 13 }}>
              High (BOLO)
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 8 }}>
            High-priority notifications show a red indicator. Use for urgent team-wide alerts.
          </p>
        </div>

        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="btn btn-navy" style={{ padding: '12px 24px' }}>
            Review & Send
          </button>
        ) : (
          <div style={{ padding: 16, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600, marginBottom: 8 }}>
              Send this {priority === 'high' ? 'priority ' : ''}broadcast to every active employee?
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              This action can&apos;t be undone. Each recipient gets their own copy, delivered in real time.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={send} disabled={sending} className="btn btn-navy" style={{ padding: '10px 20px', fontSize: 13 }}>
                {sending ? 'Sending…' : 'Confirm send'}
              </button>
              <button onClick={() => setConfirming(false)} disabled={sending} className="btn btn-outline" style={{ padding: '10px 20px', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
