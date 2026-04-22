'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const GROUPS = [
  { value: 'general', label: 'General' },
  { value: 'quoting', label: 'Quoting' },
  { value: 'sales', label: 'Sales' },
  { value: 'digital', label: 'Digital' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
] as const;

interface Meeting {
  _id: string;
  name: string;
  group: string;
  teamsUrl: string;
  scheduleLabel: string;
  description?: string;
  host?: string;
  order: number;
  active: boolean;
}

const EMPTY_FORM = { name: '', group: 'general', teamsUrl: '', scheduleLabel: '', description: '', host: '', order: 0, active: true };

export default function MeetingsAdminPage() {
  const [rows, setRows] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch('/api/admin/meetings').then(r => r.json()).then(d => setRows(d.meetings || [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function startEdit(m: Meeting) {
    setEditingId(m._id);
    setForm({
      name: m.name,
      group: m.group,
      teamsUrl: m.teamsUrl,
      scheduleLabel: m.scheduleLabel,
      description: m.description || '',
      host: m.host || '',
      order: m.order,
      active: m.active,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await secureFetch('/api/admin/meetings', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setToast({ message: editingId ? 'Meeting updated.' : 'Meeting added.', type: 'success' });
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this meeting?')) return;
    const res = await secureFetch(`/api/admin/meetings?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setToast({ message: 'Deleted.', type: 'success' }); load(); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Team Meetings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Paste Teams meeting URLs so employees can join from the Team Hub with one click.
      </p>

      <form onSubmit={save} className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
          {editingId ? 'Edit meeting' : 'New meeting'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
          <div>
            <label className="label">Name</label>
            <input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={120} placeholder="General Meeting" />
          </div>
          <div>
            <label className="label">Group</label>
            <select className="input" value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}>
              {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Teams URL</label>
          <input type="url" className="input" value={form.teamsUrl} onChange={e => setForm({ ...form, teamsUrl: e.target.value })} required placeholder="https://teams.microsoft.com/l/meetup-join/..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
          <div>
            <label className="label">Schedule</label>
            <input type="text" className="input" value={form.scheduleLabel} onChange={e => setForm({ ...form, scheduleLabel: e.target.value })} required placeholder="Wednesdays 5:30 PM EST" maxLength={200} />
          </div>
          <div>
            <label className="label">Host (optional)</label>
            <input type="text" className="input" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="Marcel" maxLength={100} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active (shown on Team Hub)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <label className="label" style={{ margin: 0 }}>Sort order</label>
            <input type="number" className="input" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} style={{ width: 80 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add meeting'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }} className="btn btn-outline" style={{ padding: '10px 20px' }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>All meetings ({rows.length})</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No meetings yet.</div>
      ) : (
        rows.map(m => (
          <div key={m._id} className="card-sm" style={{ padding: 14, marginBottom: 8, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{m.group}</span>
                {!m.active && <span className="badge" style={{ background: 'rgba(138,155,170,0.15)', color: '#8a9baa' }}>Inactive</span>}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{m.name}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{m.scheduleLabel}{m.host ? ` · ${m.host}` : ''}</p>
              <p style={{ fontSize: 11, color: 'var(--subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 4 }}>{m.teamsUrl}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={() => startEdit(m)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
              <button onClick={() => remove(m._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
