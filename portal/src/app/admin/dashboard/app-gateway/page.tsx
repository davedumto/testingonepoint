'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

type Slug = 'ghl' | 'canva' | 'lastpass' | 'microsoft';
interface Row { provider: Slug; enabled: boolean; }

const INFO: Record<Slug, { name: string; description: string; color: string }> = {
  ghl: { name: 'GoHighLevel', description: 'CRM, automations, and client management', color: '#0d9488' },
  canva: { name: 'Canva', description: 'Design marketing materials and social media graphics', color: '#7c3aed' },
  lastpass: { name: 'LastPass', description: 'Team password management and secure vault', color: '#dc2626' },
  microsoft: { name: 'Microsoft 365', description: 'Email, SharePoint, Teams, and Office apps', color: '#052847' },
};

export default function AppGatewayAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Slug | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function fetchRows() {
    fetch('/api/admin/providers')
      .then(r => r.json())
      .then(d => setRows(d.providers || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchRows(); }, []);

  async function toggle(provider: Slug, enabled: boolean) {
    setToggling(provider);
    try {
      const res = await secureFetch('/api/admin/providers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, enabled }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setRows(prev => prev.map(r => r.provider === provider ? { ...r, enabled } : r));
      setToast({ message: `${INFO[provider].name} ${enabled ? 'enabled' : 'disabled'}.`, type: 'success' });
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</p>;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>App Gateway</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Control which third-party apps appear on the employee App Access Gateway. Disabled apps are hidden entirely, employees can&apos;t request access or authenticate through the portal.
      </p>

      <div>
        {rows.map(row => {
          const info = INFO[row.provider];
          const isBusy = toggling === row.provider;
          return (
            <div key={row.provider} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{info.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{info.description}</p>
              </div>
              <span className="badge" style={{
                background: row.enabled ? 'rgba(46,154,85,0.1)' : 'rgba(138,155,170,0.15)',
                color: row.enabled ? '#2e9a55' : '#8a9baa',
              }}>
                {row.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => toggle(row.provider, !row.enabled)}
                disabled={isBusy}
                aria-label={`${row.enabled ? 'Disable' : 'Enable'} ${info.name}`}
                style={{
                  position: 'relative',
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: row.enabled ? '#2e9a55' : '#cbd5e1',
                  border: 'none',
                  cursor: isBusy ? 'wait' : 'pointer',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: row.enabled ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: 'rgba(13,148,136,0.06)', fontSize: 13, color: 'var(--navy)', borderRadius: 6, lineHeight: 1.5 }}>
        <strong>Note:</strong> When you disable a provider, existing approved access requests stay in the database but the card is hidden from employees and direct OAuth attempts are rejected. Re-enabling restores visibility without re-requesting access.
      </div>
    </div>
  );
}
