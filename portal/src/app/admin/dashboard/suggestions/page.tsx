'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import { formatDateTime } from '@/lib/client/format-time';

interface Suggestion {
  _id: string;
  submitterName: string;
  submitterEmail: string;
  suggestionType: string;
  message: string;
  status: 'new' | 'reviewing' | 'actioned' | 'declined';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  assignedTo?: string;
  assignedAt?: string;
  assignedBy?: string;
  createdAt: string;
}

interface EmployeeOption {
  _id: string;
  name?: string;
  email: string;
}

const STATUSES: { value: Suggestion['status']; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: '#0d9488' },
  { value: 'reviewing', label: 'Reviewing', color: '#7c3aed' },
  { value: 'actioned', label: 'Actioned', color: '#2e9a55' },
  { value: 'declined', label: 'Declined', color: '#8a9baa' },
];

export default function SuggestionsAdminPage() {
  const [rows, setRows] = useState<Suggestion[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ new: 0, reviewing: 0, actioned: 0, declined: 0 });
  const [filter, setFilter] = useState<Suggestion['status'] | 'all'>('new');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/employees')
      .then(r => r.json())
      .then((d: { employees?: EmployeeOption[] }) => {
        if (d.employees) setEmployees(d.employees);
      });
  }, []);

  async function assign(suggestionId: string, assigneeId: string) {
    const res = await secureFetch(`/api/admin/suggestions/${suggestionId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }),
    });
    if (res.ok) {
      setToast({ message: 'Tagged. Notification sent.', type: 'success' });
      setAssignOpen(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setToast({ message: data.error || 'Could not tag.', type: 'error' });
    }
  }

  function load() {
    const url = filter === 'all' ? '/api/admin/suggestions' : `/api/admin/suggestions?status=${filter}`;
    fetch(url).then(r => r.json()).then(d => {
      setRows(d.suggestions || []);
      setCounts(d.counts || {});
    }).finally(() => setLoading(false));
  }
  useEffect(() => { setLoading(true); load(); }, [filter]);

  async function updateStatus(id: string, status: Suggestion['status']) {
    const res = await secureFetch('/api/admin/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) { setToast({ message: 'Status updated.', type: 'success' }); load(); }
  }

  async function saveNotes(id: string) {
    const adminNotes = notesDraft[id] ?? '';
    const res = await secureFetch('/api/admin/suggestions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, adminNotes }),
    });
    if (res.ok) { setToast({ message: 'Notes saved.', type: 'success' }); load(); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Suggestion Inbox</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Employee suggestions from the Team Hub. Triage with status and leave admin notes.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '6px 14px', fontSize: 12 }}>
          All ({Object.values(counts).reduce((a, b) => a + b, 0)})
        </button>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={filter === s.value ? 'btn btn-navy' : 'btn btn-outline'} style={{ padding: '6px 14px', fontSize: 12 }}>
            {s.label} ({counts[s.value] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No suggestions.</div>
      ) : (
        rows.map(s => {
          const statusCfg = STATUSES.find(x => x.value === s.status) || STATUSES[0];
          return (
            <div key={s._id} className="card-sm" style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{s.submitterName}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{s.submitterEmail} · {formatDateTime(s.createdAt)}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: `${statusCfg.color}22`, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                  <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{s.suggestionType.replace('_', ' ')}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{s.message}</p>

              <div style={{ marginBottom: 12 }}>
                <label className="label">Admin notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={notesDraft[s._id] ?? s.adminNotes ?? ''}
                  onChange={e => setNotesDraft({ ...notesDraft, [s._id]: e.target.value })}
                  maxLength={2000}
                  placeholder="Notes visible to admins only"
                  style={{ resize: 'vertical' }}
                />
                <button onClick={() => saveNotes(s._id)} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12, marginTop: 6 }}>
                  Save notes
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {STATUSES.filter(x => x.value !== s.status).map(x => (
                  <button key={x.value} onClick={() => updateStatus(s._id, x.value)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 11 }}>
                    Mark {x.label}
                  </button>
                ))}
                <button onClick={() => setAssignOpen(assignOpen === s._id ? null : s._id)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 11 }}>
                  {s.assignedTo ? 'Reassign' : 'Tag employee'}
                </button>
              </div>

              {assignOpen === s._id && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--line)' }}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Tag someone to handle this. They get a priority notification.</p>
                  <select
                    className="input"
                    defaultValue=""
                    onChange={e => { if (e.target.value) assign(s._id, e.target.value); }}
                    style={{ fontSize: 13 }}
                  >
                    <option value="" disabled>Choose teammate…</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name || emp.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {s.assignedTo && (
                <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 8 }}>
                  Tagged by {s.assignedBy}{s.assignedAt ? ` on ${formatDateTime(s.assignedAt)}` : ''}
                </p>
              )}

              {s.reviewedAt && (
                <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>
                  Last reviewed by {s.reviewedBy} on {formatDateTime(s.reviewedAt)}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
