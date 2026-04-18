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

  useEffect(() => {
    function fetchCartCount() {
      fetch('/api/cart').then(r => r.json()).then(d => setCartCount(d.items?.length || 0)).catch(() => {});
    }
    fetchCartCount();
    const interval = setInterval(fetchCartCount, 10000);
    return () => clearInterval(interval);
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

  async function handleLogout() {
    await secureFetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', marginBottom: 2,
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  borderRadius: 8,
                  color: isActive ? '#052847' : '#5a6c7e',
                  background: isActive ? '#f0f4f8' : 'transparent',
                  transition: 'all 0.15s',
                  borderLeft: isActive ? '3px solid #0d9488' : '3px solid transparent',
                }}
              >
                <item.Icon style={{ width: 18, height: 18, color: isActive ? '#0d9488' : '#8a9baa' }} />
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
      <main style={{ flex: 1, background: '#f4f7fb', overflow: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
