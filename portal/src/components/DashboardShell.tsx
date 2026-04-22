'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconDashboard, IconPolicies, IconCart, IconForms, IconPhone, IconLogout, IconMobile, IconSettings } from './Icons';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Props {
  user: { name: string; email: string; userId: string };
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', Icon: IconDashboard, key: 'overview' },
  { href: '/dashboard/policies', label: 'My Policies', Icon: IconPolicies, key: 'policies' },
  { href: '/dashboard/cart', label: 'Coverage Cart', Icon: IconCart, key: 'cart' },
  { href: '/dashboard/forms', label: 'My Forms', Icon: IconForms, key: 'forms' },
  { href: '/dashboard/book-call', label: 'Book a Call', Icon: IconPhone, key: 'call' },
  { href: '/dashboard/settings', label: 'Settings', Icon: IconSettings, key: 'settings' },
];

export default function DashboardShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer whenever the route changes on mobile
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    // Single fetch on mount. Polling was removed because it also kept the
    // 20-min inactivity session alive indefinitely.
    fetch('/api/cart').then(r => r.json()).then(d => setCartCount(d.items?.length || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    function handleCartUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.count === 'number') setCartCount(detail.count);
      else fetch('/api/cart').then(r => r.json()).then(d => setCartCount(d.items?.length || 0)).catch(() => {});
    }
    window.addEventListener('cart-update', handleCartUpdate);
    return () => window.removeEventListener('cart-update', handleCartUpdate);
  }, []);

  // Inactivity logout: after 20 min of no user input, log out and redirect.
  // Server-side JWT expiry mirrors this; the client timer is for immediate
  // UX feedback so users don't discover expiry only on next action.
  useEffect(() => {
    const IDLE_MS = 20 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const onIdle = async () => {
      try { await secureFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
      router.push('/login?reason=inactive');
    };
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onIdle, IDLE_MS);
    };
    reset();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [router]);

  async function handleLogout() {
    await secureFetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={`sidebar-drawer${mobileOpen ? ' open' : ''}`}
        style={{
          width: 260, background: '#ffffff', borderRight: '1px solid #e8ecf1',
          flexShrink: 0, display: 'flex', flexDirection: 'column',
        }}
      >
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
            <p style={{ fontSize: 14, fontWeight: 600, color: '#052847', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            <p style={{ fontSize: 12, color: '#8a9baa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8a9baa', padding: '8px 14px 6px', marginTop: 4 }}>Menu</p>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            const showBadge = item.key === 'cart' && cartCount > 0;

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
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 2,
                    background: '#0d9488',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'scaleY(1)' : 'scaleY(0.4)',
                    transformOrigin: 'center',
                    transition: 'opacity 0.25s ease, transform 0.25s ease',
                  }}
                />
                <item.Icon style={{ width: 18, height: 18, color: isActive ? '#0d9488' : '#8a9baa', transition: 'color 0.2s ease' }} />
                {item.label}
                {showBadge && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#0d9488',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                  }}>
                    {cartCount}
                  </span>
                )}
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
              borderLeft: '3px solid transparent',
            }}
          >
            <IconLogout style={{ width: 18, height: 18 }} />
            Sign Out
          </button>
          <a
            href="tel:888-899-8117"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', marginTop: 2,
              fontSize: 13, fontWeight: 500,
              color: '#8a9baa',
              borderRadius: 8,
              borderLeft: '3px solid transparent',
            }}
          >
            <IconMobile style={{ width: 18, height: 18 }} />
            888-899-8117
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f4f7fb', overflow: 'auto', minWidth: 0 }}>
        {/* Mobile top bar with hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e8ecf1' }} className="mobile-topbar">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <img src="/logo.webp" alt="OnePoint" style={{ height: 28, width: 'auto' }} />
        </div>
        <div className="shell-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
