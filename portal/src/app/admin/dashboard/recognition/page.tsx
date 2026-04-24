'use client';

import { useEffect, useMemo, useState } from 'react';
import { secureFetch } from '@/lib/client/secure-fetch';

interface EmployeeRow {
  _id: string;
  name?: string;
  email: string;
  photoUrl?: string;
  isSetup: boolean;
}

interface EOTMRecord {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeePhotoUrl?: string;
  message?: string;
  announcedBy: string;
  publishedAt: string;
  expiresAt: string;
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminRecognitionPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [active, setActive] = useState<EOTMRecord | null>(null);
  const [history, setHistory] = useState<EOTMRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [empRes, recRes] = await Promise.all([
        fetch('/api/admin/employees').then(r => r.json()),
        fetch('/api/admin/recognition').then(r => r.json()),
      ]);
      const setupEmployees: EmployeeRow[] = (empRes.employees || []).filter((e: EmployeeRow) => e.isSetup);
      setEmployees(setupEmployees);
      setActive(recRes.active || null);
      setHistory(recRes.history || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const selectedEmployee = useMemo(
    () => employees.find(e => e._id === selectedId),
    [employees, selectedId],
  );

  async function announce(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedId) { setError('Pick an employee.'); return; }
    setPosting(true);
    try {
      const res = await secureFetch('/api/admin/recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedId, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not announce.'); return; }
      setSelectedId('');
      setMessage('');
      setConfirm(false);
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function remove(recordId: string, wasActive: boolean) {
    const prompt = wasActive
      ? 'Remove this Employee of the Month? The banner will disappear from every dashboard.'
      : 'Delete this record from history?';
    if (!window.confirm(prompt)) return;
    setDeletingId(recordId);
    try {
      const res = await secureFetch(`/api/admin/recognition/${recordId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not delete.'); return; }
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Employee of the Month</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Pick an employee and push it live. The banner shows on every dashboard for 24 hours, and a notification lands in each employee's feed.
        </p>
      </div>

      {/* Currently active card */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Currently active</p>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
        ) : active ? (
          <div className="card" style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 20 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: active.employeePhotoUrl ? `url('${active.employeePhotoUrl}') center/cover` : 'var(--surface)',
                border: '3px solid #e8c74e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: 'var(--navy)', flexShrink: 0,
              }}
            >
              {!active.employeePhotoUrl && active.employeeName.split(' ').map(s => s.charAt(0)).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a5a00' }}>🏆 Employee of the Month</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginTop: 2 }}>{active.employeeName}</p>
              {active.message && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>&ldquo;{active.message}&rdquo;</p>}
              <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>
                Announced by {active.announcedBy} · expires {fmtWhen(active.expiresAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(active._id, true)}
              disabled={deletingId === active._id}
              className="btn"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#9a2f2f', border: '1px solid rgba(220,38,38,0.2)', padding: '8px 14px', fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' }}
            >
              {deletingId === active._id ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 20, color: 'var(--muted)', fontSize: 14 }}>
            No active Employee of the Month. Pick someone below to announce.
          </div>
        )}
      </div>

      {/* Announce form */}
      <form onSubmit={announce} className="card" style={{ padding: 24, marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Announce a winner</p>
        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <label className="label">Employee</label>
          <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Select an employee…</option>
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>
                {emp.name || emp.email.split('@')[0]} · {emp.email}
              </option>
            ))}
          </select>
          {employees.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
              No employees have finished account setup yet.
            </p>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Message <span style={{ color: 'var(--subtle)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="What made this person's month stand out?"
            rows={3}
            maxLength={500}
            style={{ resize: 'vertical' }}
          />
          <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>{message.length}/500</p>
        </div>

        {confirm ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>
              Announce {selectedEmployee?.name || selectedEmployee?.email}? Every employee will see the banner for 24h.
            </p>
            <button type="submit" disabled={posting} className="btn btn-navy" style={{ padding: '10px 20px' }}>
              {posting ? 'Announcing…' : 'Yes, announce'}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="btn" style={{ background: 'transparent', color: 'var(--muted)', padding: '10px 16px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setError(''); if (!selectedId) { setError('Pick an employee.'); return; } setConfirm(true); }}
            className="btn btn-navy"
            style={{ padding: '11px 24px' }}
          >
            Announce Employee of the Month
          </button>
        )}
      </form>

      {/* History */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Recent winners</p>
        {history.length === 0 ? (
          <div className="card" style={{ padding: 20, color: 'var(--muted)', fontSize: 14 }}>No winners yet.</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                  <Th>Employee</Th>
                  <Th>Announced</Th>
                  <Th>By</Th>
                  <Th>Message</Th>
                  <Th>{' '}</Th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const isActive = new Date(h.expiresAt).getTime() > Date.now();
                  return (
                    <tr key={h._id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--navy)' }}>{h.employeeName}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{fmtWhen(h.publishedAt)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{h.announcedBy}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', maxWidth: 360 }}>{h.message || <span style={{ color: 'var(--subtle)' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => remove(h._id, isActive)}
                          disabled={deletingId === h._id}
                          style={{ background: 'none', border: 'none', color: '#9a2f2f', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
                        >
                          {deletingId === h._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', textAlign: 'left' }}>
      {children}
    </th>
  );
}
