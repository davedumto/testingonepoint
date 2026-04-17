'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Toast from '@/components/Toast';

interface AppStatus {
  provider: string;
  accessStatus: 'none' | 'pending' | 'approved' | 'denied';
  lastAuthenticated: string | null;
  hasAccess: boolean;
}

const APP_INFO: Record<string, { name: string; description: string; color: string }> = {
  ghl: { name: 'GoHighLevel', description: 'CRM, automations, and client management', color: '#0d9488' },
  canva: { name: 'Canva', description: 'Design marketing materials and social media graphics', color: '#7c3aed' },
  lastpass: { name: 'LastPass', description: 'Team password management and secure vault', color: '#dc2626' },
  microsoft: { name: 'Microsoft 365', description: 'Email, SharePoint, Teams, and Office apps', color: '#052847' },
};

function EmployeeDashboardContent() {
  const searchParams = useSearchParams();
  const [apps, setApps] = useState<AppStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);

  // Check URL params for auth callback results
  useEffect(() => {
    const auth = searchParams.get('auth');
    const provider = searchParams.get('provider');
    if (auth === 'success' && provider) {
      const name = APP_INFO[provider]?.name || provider;
      setToast({ message: `Successfully authenticated with ${name}`, type: 'success' });
    } else if (auth === 'failed' && provider) {
      const name = APP_INFO[provider]?.name || provider;
      setToast({ message: `Authentication with ${name} failed. Try again.`, type: 'error' });
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch('/api/employee/auth/me').then(r => r.json()),
      fetch('/employee/api/oauth/status').then(r => r.json()),
    ]).then(([userData, statusData]) => {
      setUser(userData.employee || null);
      setApps(statusData.status || []);
    }).finally(() => setLoading(false));
  }, []);

  async function requestAccess(provider: string) {
    setRequesting(provider);
    try {
      const res = await fetch('/employee/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Access request for ${APP_INFO[provider]?.name} submitted. Waiting for admin approval.`, type: 'success' });
        // Refresh status
        const statusRes = await fetch('/employee/api/oauth/status');
        const statusData = await statusRes.json();
        setApps(statusData.status || []);
      } else {
        setToast({ message: data.error || 'Request failed.', type: 'error' });
      }
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setRequesting(null);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Employee Portal</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>
          App Access Gateway
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          Welcome, {user?.name}. Request access to business tools and authenticate through the portal.
        </p>
      </div>

      {/* App cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {Object.entries(APP_INFO).map(([key, info]) => {
          const status = apps.find(a => a.provider === key);
          const accessStatus = status?.accessStatus || 'none';
          const lastAuth = status?.lastAuthenticated;

          return (
            <div key={key} className="card" style={{ padding: 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: info.color }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{info.name}</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{info.description}</p>
                </div>
                {/* Status badge */}
                <span style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                  background: accessStatus === 'approved' ? 'rgba(46,154,85,0.1)' :
                    accessStatus === 'pending' ? 'rgba(13,148,136,0.1)' :
                    accessStatus === 'denied' ? 'rgba(220,38,38,0.1)' : 'rgba(138,155,170,0.1)',
                  color: accessStatus === 'approved' ? '#2e9a55' :
                    accessStatus === 'pending' ? '#0d9488' :
                    accessStatus === 'denied' ? '#dc2626' : '#8a9baa',
                }}>
                  {accessStatus === 'none' ? 'No Access' : accessStatus}
                </span>
              </div>

              {/* Last authenticated */}
              {lastAuth && (
                <p style={{ fontSize: 12, color: 'var(--subtle)', marginBottom: 12 }}>
                  Last authenticated: {new Date(lastAuth).toLocaleString()}
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {accessStatus === 'none' || accessStatus === 'denied' ? (
                  <button
                    onClick={() => requestAccess(key)}
                    disabled={requesting === key}
                    className="btn btn-navy"
                    style={{ padding: '8px 16px', fontSize: 12, flex: 1, opacity: requesting === key ? 0.5 : 1 }}
                  >
                    {requesting === key ? 'Requesting...' : 'Request Access'}
                  </button>
                ) : accessStatus === 'pending' ? (
                  <div style={{ flex: 1, padding: '8px 16px', background: 'var(--surface)', textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                    Awaiting Admin Approval
                  </div>
                ) : accessStatus === 'approved' ? (
                  <a
                    href={`/employee/api/oauth/${key}`}
                    className="btn btn-teal"
                    style={{ padding: '8px 16px', fontSize: 12, flex: 1, textAlign: 'center', textDecoration: 'none' }}
                  >
                    Authenticate Now
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}
