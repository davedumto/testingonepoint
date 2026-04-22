'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const ALLOWED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Africa/Lagos',
  'Europe/London',
  'UTC',
];

interface Emp { _id: string; email: string; name?: string; timezone?: string; isSetup: boolean; isLocked?: boolean; has2FA?: boolean; addedAt: string; lastLogin?: string; }

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function fetchEmployees() {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const res = await secureFetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: `${newEmail} added. They can now set up their password.`, type: 'success' });
        setNewEmail('');
        fetchEmployees();
      } else {
        setToast({ message: data.error || 'Failed.', type: 'error' });
      }
    } catch { setToast({ message: 'Error.', type: 'error' }); }
    finally { setAdding(false); }
  }

  async function updateTimezone(id: string, timezone: string) {
    const res = await secureFetch('/api/admin/employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, timezone }),
    });
    if (res.ok) {
      setToast({ message: `Timezone updated to ${timezone}.`, type: 'success' });
      fetchEmployees();
    } else {
      setToast({ message: 'Failed to update timezone.', type: 'error' });
    }
  }

  async function removeEmployee(id: string) {
    if (!confirm('Remove this employee?')) return;
    const res = await secureFetch(`/api/admin/employees?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setToast({ message: 'Employee removed.', type: 'success' }); fetchEmployees(); }
  }

  async function unlockEmployee(email: string) {
    const res = await secureFetch('/api/admin/employees/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setToast({ message: `${email} unlocked.`, type: 'success' });
      fetchEmployees();
    } else {
      const d = await res.json().catch(() => ({}));
      setToast({ message: d.error || 'Failed to unlock.', type: 'error' });
    }
  }

  async function disable2FA(email: string) {
    if (!confirm(`Disable 2FA for ${email}? They'll log in with password only until they re-enable it.`)) return;
    const res = await secureFetch('/api/admin/employees/disable-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      setToast({ message: `2FA disabled for ${email}.`, type: 'success' });
      fetchEmployees();
    } else {
      const d = await res.json().catch(() => ({}));
      setToast({ message: d.error || 'Failed to disable 2FA.', type: 'error' });
    }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Manage Employees</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Add employee emails and set their timezone. They&apos;ll set their own password on first login.</p>

      {/* Add employee */}
      <form onSubmit={addEmployee} className="card" style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label className="label">Employee Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            className="input"
            placeholder="david@onepointinsuranceagency.com"
          />
        </div>
        <button type="submit" disabled={adding} className="btn btn-navy" style={{ padding: '12px 24px', flexShrink: 0 }}>
          {adding ? 'Adding...' : 'Add Employee'}
        </button>
      </form>

      {/* Employee list */}
      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</p>
      ) : employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--muted)' }}>No employees added yet.</p>
        </div>
      ) : (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Employee List ({employees.length})</h2>
          {employees.map(emp => (
            <div key={emp._id} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{emp.name || emp.email}</p>
                  <span className="badge" style={{
                    background: emp.isSetup ? 'rgba(46,154,85,0.1)' : 'rgba(13,148,136,0.1)',
                    color: emp.isSetup ? '#2e9a55' : '#0d9488',
                  }}>
                    {emp.isSetup ? 'Active' : 'Pending Setup'}
                  </span>
                  {emp.isLocked && (
                    <span className="badge" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                      Locked
                    </span>
                  )}
                  {emp.has2FA && (
                    <span className="badge" style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}>
                      2FA
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{emp.email}</p>
              </div>
              <div style={{ minWidth: 180 }}>
                <select
                  value={emp.timezone || 'America/New_York'}
                  onChange={e => updateTimezone(emp._id, e.target.value)}
                  className="input"
                  style={{ padding: '6px 8px', fontSize: 12 }}
                >
                  {ALLOWED_TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--subtle)' }}>Added {new Date(emp.addedAt).toLocaleDateString()}</p>
                {emp.lastLogin && <p style={{ fontSize: 11, color: 'var(--subtle)' }}>Last login {new Date(emp.lastLogin).toLocaleString()}</p>}
              </div>
              {emp.isLocked && (
                <button onClick={() => unlockEmployee(emp.email)} style={{ fontSize: 12, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Unlock
                </button>
              )}
              {emp.has2FA && (
                <button onClick={() => disable2FA(emp.email)} style={{ fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Disable 2FA
                </button>
              )}
              <button onClick={() => removeEmployee(emp._id)} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
