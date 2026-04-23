'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { subscribe } from '@/lib/pusher/client';
import { secureFetch } from '@/lib/client/secure-fetch';

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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(() => {
    fetch('/employee/api/notifications?limit=10')
      .then(r => r.json())
      .then((d: { notifications?: Notif[]; unreadCount?: number }) => {
        if (d.notifications) setItems(d.notifications);
        if (typeof d.unreadCount === 'number') setUnread(d.unreadCount);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live push: add newly arrived notifications to the top of the list.
  useEffect(() => {
    if (!userId) return;
    return subscribe(`private-user-${userId}`, {
      'notification:new': (raw) => {
        const n = raw as Notif;
        setItems(prev => (prev.some(x => x._id === n._id) ? prev : [n, ...prev].slice(0, 10)));
        setUnread(u => u + 1);
      },
    });
  }, [userId]);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
    await secureFetch(`/employee/api/notifications/${id}/read`, { method: 'POST' });
  }

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    await secureFetch('/employee/api/notifications/read-all', { method: 'POST' });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        data-tour="bell"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          width: 40, height: 40,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--navy)',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, padding: '0 4px',
            background: 'var(--red)', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: '16px',
            borderRadius: 999, textAlign: 'center',
            border: '2px solid var(--card)',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 380, maxHeight: 480,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(5, 40, 71, 0.16)',
            overflow: 'hidden',
            zIndex: 50,
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <p style={{ padding: 28, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                You&apos;re all caught up.
              </p>
            ) : items.map(n => {
              const content = (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      flexShrink: 0,
                      width: 8, height: 8, borderRadius: '50%',
                      background: n.read ? 'transparent' : (n.priority === 'high' ? 'var(--red)' : 'var(--blue)'),
                      marginTop: 6,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--navy)', lineHeight: 1.35 }}>{n.title}</p>
                      {n.body && (
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                          {n.body}
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                        {n.actorName ? `${n.actorName} · ` : ''}{relativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </>
              );

              const onClick = () => { if (!n.read) void markRead(n._id); setOpen(false); };
              const style: React.CSSProperties = {
                display: 'block',
                padding: '12px 16px',
                borderBottom: '1px solid var(--line)',
                background: n.read ? 'transparent' : 'rgba(10, 61, 107, 0.04)',
                cursor: n.link ? 'pointer' : 'default',
                textDecoration: 'none',
                color: 'inherit',
              };

              return n.link ? (
                <Link key={n._id} href={n.link} onClick={onClick} style={style}>{content}</Link>
              ) : (
                <div key={n._id} onClick={onClick} style={style}>{content}</div>
              );
            })}
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
            <Link href="/employee/dashboard/notifications" onClick={() => setOpen(false)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
