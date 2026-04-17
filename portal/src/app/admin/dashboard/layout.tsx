import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Admin sidebar — white */}
      <aside style={{ width: 240, background: '#fff', borderRight: '1px solid var(--line)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <a href="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--navy)', background: 'var(--surface)', borderRadius: 6, marginBottom: 4 }}>
            CSV Import
          </a>
          <a href="/admin/dashboard/access-requests" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 14, fontWeight: 500, color: 'var(--muted)', borderRadius: 6, marginBottom: 4 }}>
            Access Requests
          </a>
          <a href="/admin/dashboard/time-tracking" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 14, fontWeight: 500, color: 'var(--muted)', borderRadius: 6, marginBottom: 4 }}>
            Time Tracking
          </a>
          <a href="/admin/dashboard/employees" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 14, fontWeight: 500, color: 'var(--muted)', borderRadius: 6, marginBottom: 4 }}>
            Employees
          </a>
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 12, color: 'var(--subtle)' }}>Logged in as Admin</p>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: 'var(--surface)', overflow: 'auto' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
