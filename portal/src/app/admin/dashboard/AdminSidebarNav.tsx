'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS: { href: string; label: string; exact: boolean; group?: string }[] = [
  { href: '/admin/dashboard', label: 'CSV Import', exact: true, group: 'Team' },
  { href: '/admin/dashboard/employees', label: 'Employees', exact: false, group: 'Team' },
  { href: '/admin/dashboard/time-tracking', label: 'Time Tracking', exact: false, group: 'Team' },
  { href: '/admin/dashboard/access-requests', label: 'Access Requests', exact: false, group: 'Access' },
  { href: '/admin/dashboard/app-gateway', label: 'App Gateway', exact: false, group: 'Access' },
  { href: '/admin/dashboard/announcements', label: 'Announcements', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/meetings', label: 'Meetings', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/events', label: 'Events', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/documents', label: 'Documents', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/suggestions', label: 'Suggestions', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/broadcast', label: 'Broadcast', exact: false, group: 'Hub' },
  { href: '/admin/dashboard/security', label: 'Security', exact: false, group: 'System' },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  // Group the nav items, preserving the order of first appearance.
  const groups: string[] = [];
  const grouped: Record<string, typeof NAV_ITEMS> = {};
  NAV_ITEMS.forEach(item => {
    const g = item.group || 'Other';
    if (!grouped[g]) { grouped[g] = []; groups.push(g); }
    grouped[g].push(item);
  });

  return (
    <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
      {groups.map(group => (
        <div key={group} style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', padding: '4px 14px', marginBottom: 4 }}>{group}</p>
          {grouped[group].map(item => {
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
                  padding: '9px 14px',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--navy)' : 'var(--muted)',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  borderRadius: 6,
                  marginBottom: 2,
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
        </div>
      ))}
    </nav>
  );
}
