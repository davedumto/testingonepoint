'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconLogout, IconSettings } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';
import NotificationBell from '@/components/NotificationBell';
import OnboardingTour, { tourStorageKey } from '@/components/OnboardingTour';

interface EmpUser { name: string; email: string; employeeId?: string; hasCompletedOnboarding?: boolean; photoUrl?: string }

type P = { style?: React.CSSProperties };
function IconHome({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>; }
function IconNews({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>; }
function IconChat({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function IconDocs({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function IconTools({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>; }
function IconDirectory({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconCalendar({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function IconClock({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconBook({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function IconUser({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconBell({ style }: P) { return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }

const NAV_ITEMS: { href: string; label: string; Icon: (p: P) => React.ReactElement; exact: boolean; group: string }[] = [
  { href: '/employee/dashboard', label: 'Team Hub', Icon: IconHome, exact: true, group: 'Hub' },
  { href: '/employee/dashboard/news', label: 'News', Icon: IconNews, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/conversations', label: 'Conversations', Icon: IconChat, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/documents', label: 'Documents', Icon: IconDocs, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/tools', label: 'Tools & Resources', Icon: IconTools, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/directory', label: 'Team Directory', Icon: IconDirectory, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/meetings', label: 'Meetings', Icon: IconCalendar, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/learning', label: 'Learning Hub', Icon: IconBook, exact: false, group: 'Hub' },
  { href: '/employee/dashboard/notifications', label: 'Notifications', Icon: IconBell, exact: false, group: 'Me' },
  { href: '/employee/dashboard/time-tracking', label: 'Time Tracking', Icon: IconClock, exact: false, group: 'Me' },
  { href: '/employee/dashboard/profile', label: 'My Profile', Icon: IconUser, exact: false, group: 'Me' },
  { href: '/employee/dashboard/settings', label: 'Settings', Icon: IconSettings, exact: false, group: 'Me' },
];

export default function EmployeeDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<EmpUser | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    fetch('/api/employee/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setUser(d.employee);
        // Tour only fires on the home dashboard, and only if the user hasn't
        // already seen it. Check localStorage FIRST (survives reloads even if
        // the server sync failed on completion), then fall back to the
        // server-side hasCompletedOnboarding flag.
        if (d.employee && pathname === '/employee/dashboard') {
          let localDone = false;
          try { localDone = localStorage.getItem(tourStorageKey(d.employee.employeeId)) === '1'; } catch { /* SSR/privacy */ }
          if (!localDone && !d.employee.hasCompletedOnboarding) {
            setTourOpen(true);
          }
        }
      })
      .catch(() => router.push('/employee/login'));
  }, [router, pathname]);

  async function handleLogout() {
    await secureFetch('/api/employee/auth/logout', { method: 'POST' });
    router.push('/employee/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '..';

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {tourOpen && user?.employeeId && <OnboardingTour userId={user.employeeId} onComplete={() => setTourOpen(false)} />}

      {/* Sidebar — fixed to viewport height; only its own nav scrolls if overflowing */}
      <aside data-tour="sidebar" style={{
        width: 260, height: '100vh', background: '#ffffff', borderRight: '1px solid #e8ecf1',
        flexShrink: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid #e8ecf1' }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 36, width: 'auto' }} />
        </div>

        {/* User info */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8ecf1', display: 'flex', alignItems: 'center', gap: 12 }}>
          {user?.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name || 'Profile'}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#052847', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#052847', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user ? (user.name?.trim() || user.email.split('@')[0]) : '…'}
            </p>
            <p style={{ fontSize: 12, color: '#8a9baa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {(() => {
            const seen: string[] = [];
            const byGroup: Record<string, typeof NAV_ITEMS> = {};
            NAV_ITEMS.forEach(item => {
              if (!byGroup[item.group]) { byGroup[item.group] = []; seen.push(item.group); }
              byGroup[item.group].push(item);
            });
            return seen.map(group => (
              <div key={group} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a9baa', padding: '8px 14px 6px' }}>{group}</p>
                {byGroup[group].map(item => {
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        position: 'relative',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 14px', marginBottom: 2,
                        fontSize: 14, fontWeight: isActive ? 600 : 500,
                        borderRadius: 8,
                        color: isActive ? '#052847' : '#5a6c7e',
                        background: isActive ? '#f0f4f8' : 'transparent',
                        transition: 'background 0.2s ease, color 0.2s ease, font-weight 0.2s ease',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: 2,
                          background: '#052847',
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? 'scaleY(1)' : 'scaleY(0.4)',
                          transformOrigin: 'center',
                          transition: 'opacity 0.25s ease, transform 0.25s ease',
                        }}
                      />
                      <item.Icon style={{ width: 18, height: 18, color: isActive ? '#052847' : '#8a9baa', transition: 'color 0.2s ease' }} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ));
          })()}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px', borderTop: '1px solid #e8ecf1' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 14px', fontSize: 14, fontWeight: 500,
              color: '#8a9baa', background: 'none', border: 'none',
              borderRadius: 8, cursor: 'pointer', textAlign: 'left',
              borderLeft: '3px solid transparent', fontFamily: 'inherit',
            }}
          >
            <IconLogout style={{ width: 18, height: 18 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content — the only scrollable region on desktop */}
      <main style={{ flex: 1, background: '#f4f7fb', overflowY: 'auto', height: '100vh', position: 'relative' }}>
        {/* Floating top-right bell. Position absolute inside the scroll container so
            it stays pinned to the visible viewport edge without reserving layout space. */}
        {user?.employeeId && (
          <div style={{ position: 'sticky', top: 16, zIndex: 20, display: 'flex', justifyContent: 'flex-end', padding: '0 24px', pointerEvents: 'none', height: 0 }}>
            <div style={{ pointerEvents: 'auto' }}>
              <NotificationBell userId={user.employeeId} />
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
