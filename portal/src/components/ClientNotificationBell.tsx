'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe } from '@/lib/pusher/client';

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Bell component for the client sidebar. Shows an unread count, opens a
// dropdown with the last 10 notifications, and marks all as read when
// opened (cheap + matches user mental model of "opening the bell = seen").
export default function ClientNotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch('/api/client-notifications').then(r => r.ok ? r.json() : null).then(d => {
      if (d) {
        setNotifications(d.notifications || []);
        setUnread(d.unreadCount || 0);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Click-outside to close the dropdown
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Live increment + prepend on incoming `notification:new`
  useEffect(() => {
    if (!userId) return;
    return subscribe(`private-user-${userId}`, {
      'notification:new': (raw) => {
        const n = raw as Notification;
        setNotifications(prev => (prev.some(x => x._id === n._id) ? prev : [n, ...prev].slice(0, 50)));
        setUnread(u => u + 1);
      },
    });
  }, [userId]);

  async function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    // On open, eagerly mark everything as read — optimistic UI. The server
    // call flips the docs; if it fails the badge comes back on next reload.
    if (nextOpen && unread > 0) {
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      try { await secureFetch('/api/client-notifications/read-all', { method: 'POST' }); } catch { /* best effort */ }
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleOpen}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 8,
          color: 'var(--muted)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#9a2f2f',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid var(--line)',
            borderRadius: 10,
            boxShadow: '0 10px 32px rgba(5,40,71,0.18)',
            zIndex: 50,
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Notifications</p>
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue, #0a3d6b)', textDecoration: 'none' }}>
              View all
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p style={{ padding: 24, fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>No notifications yet.</p>
          ) : (
            <div>
              {notifications.slice(0, 10).map(n => {
                const body = (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'flex-start', background: n.read ? '#fff' : 'rgba(10,61,107,0.04)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] || '🔔'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--navy)', marginBottom: 2 }}>{n.title}</p>
                      {n.body && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</p>}
                      <p style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 3 }}>{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n._id} href={n.link} onClick={() => setOpen(false)} style={{ textDecoration: 'none' }}>
                    {body}
                  </Link>
                ) : (
                  <div key={n._id}>{body}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
