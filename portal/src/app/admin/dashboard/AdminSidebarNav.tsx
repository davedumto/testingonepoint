'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS: { href: string; label: string; exact: boolean }[] = [
  { href: '/admin/dashboard', label: 'CSV Import', exact: true },
  { href: '/admin/dashboard/access-requests', label: 'Access Requests', exact: false },
  { href: '/admin/dashboard/app-gateway', label: 'App Gateway', exact: false },
  { href: '/admin/dashboard/time-tracking', label: 'Time Tracking', exact: false },
  { href: '/admin/dashboard/employees', label: 'Employees', exact: false },
  { href: '/admin/dashboard/security', label: 'Security', exact: false },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav style={{ flex: 1, padding: '16px 12px' }}>
      {NAV_ITEMS.map(item => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--navy)' : 'var(--muted)',
              background: isActive ? 'var(--surface)' : 'transparent',
              borderRadius: 6,
              marginBottom: 4,
              textDecoration: 'none',
              transition: 'background 0.2s ease, color 0.2s ease, font-weight 0.2s ease',
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
                background: 'var(--teal)',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scaleY(1)' : 'scaleY(0.4)',
                transformOrigin: 'center',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
