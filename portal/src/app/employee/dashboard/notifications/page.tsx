'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { subscribe } from '@/lib/pusher/client';
import { secureFetch } from '@/lib/client/secure-fetch';
import { formatDateTime } from '@/lib/client/format-time';
import PageHeader from '@/components/PageHeader';

interface Notif {
  _id: string;
  type: 'announcement' | 'mention' | 'system' | 'broadcast' | 'suggestion_reply';
  title: string;
  body?: string;
  link?: string;
  priority: 'normal' | 'high';
  read: boolean;
  actorName?: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  announcement: 'Announcement',
  mention: 'Mention',
  system: 'System',
  broadcast: 'Priority',
  suggestion_reply: 'Suggestion update',
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = filter === 'unread' ? '?unread=1&limit=50' : '?limit=50';
    fetch(`/employee/api/notifications${qs}`)
      .then(r => r.json())
      .then((d: { notifications?: Notif[] }) => setItems(d.notifications || []))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetch('/api/employee/auth/me').then(r => r.json()).then(d => {
      if (d.employee?.employeeId) setUserId(d.employee.employeeId);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    return subscribe(`private-user-${userId}`, {
      'notification:new': (raw) => {
        const n = raw as Notif;
        setItems(prev => (prev.some(x => x._id === n._id) ? prev : [n, ...prev]));
      },
    });
  }, [userId]);

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    await secureFetch(`/employee/api/notifications/${id}/read`, { method: 'POST' });
  }

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    await secureFetch('/employee/api/notifications/read-all', { method: 'POST' });
  }

  const visible = filter === 'unread' ? items.filter(n => !n.read) : items;
  const unreadCount = items.filter(n => !n.read).length;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 32 }}>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Team announcements, mentions, and priority alerts from your admins."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'btn btn-navy' : 'btn btn-outline'}
          style={{ padding: '6px 14px', fontSize: 12 }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'btn btn-navy' : 'btn btn-outline'}
          style={{ padding: '6px 14px', fontSize: 12 }}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>
        <div style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
          {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(n => {
            const isPriority = n.priority === 'high';
            const content = (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{
                    flexShrink: 0,
                    width: 10, height: 10, borderRadius: '50%',
                    background: n.read ? 'var(--line)' : (isPriority ? 'var(--red)' : 'var(--blue)'),
                    marginTop: 7,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="badge" style={{
                        background: isPriority ? 'rgba(220,38,38,0.1)' : 'rgba(10,61,107,0.1)',
                        color: isPriority ? 'var(--red)' : 'var(--blue)',
                        fontSize: 10,
                      }}>
                        {TYPE_LABEL[n.type] || n.type}
                      </span>
                      <p style={{ fontSize: 15, fontWeight: n.read ? 500 : 700, color: 'var(--navy)' }}>{n.title}</p>
                    </div>
                    {n.body && <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, marginTop: 4 }}>{n.body}</p>}
                    <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>
                      {n.actorName ? `${n.actorName} · ` : ''}{formatDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              </>
            );

            const onClick = () => { if (!n.read) void markRead(n._id); };
            const style: React.CSSProperties = {
              display: 'block',
              padding: 18,
              background: n.read ? 'var(--card)' : 'rgba(10,61,107,0.04)',
              border: `1px solid ${isPriority && !n.read ? 'rgba(220,38,38,0.3)' : 'var(--line)'}`,
              borderRadius: 10,
              textDecoration: 'none',
              color: 'inherit',
              cursor: n.link ? 'pointer' : 'default',
            };

            return n.link ? (
              <Link key={n._id} href={n.link} onClick={onClick} style={style}>{content}</Link>
            ) : (
              <div key={n._id} onClick={onClick} style={style}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
