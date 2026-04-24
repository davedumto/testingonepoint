'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  priority: 'normal' | 'high';
  read: boolean;
  actorName?: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  agent_message: '💬',
  doc_uploaded: '📄',
  sr_update: '📋',
  claim_update: '🚨',
  renewal_reminder: '🔄',
  payment_alert: '💳',
  missing_doc: '⚠️',
  system: '🔔',
};

const TYPE_LABEL: Record<string, string> = {
  agent_message: 'Message',
  doc_uploaded: 'Document',
  sr_update: 'Service Request',
  claim_update: 'Claim',
  renewal_reminder: 'Renewal',
  payment_alert: 'Payment',
  missing_doc: 'Missing Document',
  system: 'System',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set('unread', '1');
    setLoading(true);
    fetch(`/api/client-notifications?${params.toString()}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    }).finally(() => setLoading(false));
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try { await secureFetch(`/api/client-notifications/${id}/read`, { method: 'POST' }); } catch { /* best effort */ }
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await secureFetch('/api/client-notifications/read-all', { method: 'POST' }); } catch { /* best effort */ }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Notifications</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setUnreadOnly(false)}
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', background: !unreadOnly ? 'rgba(10,61,107,0.1)' : 'transparent', color: !unreadOnly ? 'var(--navy)' : 'var(--muted)', cursor: 'pointer' }}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setUnreadOnly(true)}
          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', background: unreadOnly ? 'rgba(10,61,107,0.1)' : 'transparent', color: unreadOnly ? 'var(--navy)' : 'var(--muted)', cursor: 'pointer' }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>You&apos;re all caught up</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Renewals, payments, and messages from your team will show here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const isHigh = n.priority === 'high' && !n.read;
            const content = (
              <div
                className="card-sm"
                style={{
                  padding: 16,
                  background: n.read ? '#fff' : 'rgba(10,61,107,0.04)',
                  borderLeft: isHigh ? '3px solid #9a2f2f' : n.read ? '3px solid transparent' : '3px solid var(--blue, #0a3d6b)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] || '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: 'var(--navy)' }}>{n.title}</p>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(10,61,107,0.1)', color: 'var(--navy)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {TYPE_LABEL[n.type] || n.type}
                    </span>
                    {isHigh && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontWeight: 700, textTransform: 'uppercase' }}>
                        High
                      </span>
                    )}
                  </div>
                  {n.body && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.body}</p>}
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                    {n.actorName && `${n.actorName} · `}{fmtDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); markRead(n._id); }}
                    style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    title="Mark read"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );

            return n.link ? (
              <Link
                key={n._id}
                href={n.link}
                onClick={() => { if (!n.read) markRead(n._id); }}
                style={{ textDecoration: 'none' }}
              >
                {content}
              </Link>
            ) : (
              <div key={n._id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
