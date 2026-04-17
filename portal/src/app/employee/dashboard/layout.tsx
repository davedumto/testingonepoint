'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconDashboard, IconLogout } from '@/components/Icons';

interface EmpUser { name: string; email: string }

function IconClock({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}

function IconGrid({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}

const NAV_ITEMS = [
  { href: '/employee/dashboard', label: 'App Gateway', Icon: IconGrid, exact: true },
  { href: '/employee/dashboard/time-tracking', label: 'Time Tracking', Icon: IconClock, exact: false },
];

export default function EmployeeDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<EmpUser | null>(null);

  useEffect(() => {
    fetch('/api/employee/auth/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setUser(d.employee))
      .catch(() => router.push('/employee/login'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/employee/auth/logout', { method: 'POST' });
    router.push('/employee/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '..';

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: '#ffffff', borderRight: '1px solid #e8ecf1',
        flexShrink: 0, display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '22px 24px', borderBottom: '1px solid #e8ecf1' }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 36, width: 'auto' }} />
        </div>

        {/* User info */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8ecf1', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: '#052847', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#052847', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Loading...'}</p>
            <p style={{ fontSize: 12, color: '#8a9baa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a9baa', padding: '8px 14px 6px', marginTop: 4 }}>Menu</p>
          {NAV_ITEMS.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', marginBottom: 2,
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  borderRadius: 8,
                  color: isActive ? '#052847' : '#5a6c7e',
                  background: isActive ? '#f0f4f8' : 'transparent',
                  transition: 'all 0.15s',
                  borderLeft: isActive ? '3px solid #0d9488' : '3px solid transparent',
                  textDecoration: 'none',
                }}
              >
                <item.Icon style={{ width: 18, height: 18, color: isActive ? '#0d9488' : '#8a9baa' }} />
                {item.label}
              </Link>
            );
          })}
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

      {/* Main content */}
      <main style={{ flex: 1, background: '#f4f7fb', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
