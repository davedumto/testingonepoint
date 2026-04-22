'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebarNav from './AdminSidebarNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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
        style={{ width: 240, background: '#fff', borderRight: '1px solid var(--line)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--teal)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 14, height: 14, color: '#fff' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>Admin Panel</span>
          </div>
        </div>

        <AdminSidebarNav />

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Logged in as Admin</p>
        </div>
      </aside>

      <main style={{ flex: 1, background: 'var(--surface)', overflow: 'auto', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{ alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', borderBottom: '1px solid var(--line)' }}>
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>Admin Panel</span>
        </div>
        <div className="shell-content" style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
