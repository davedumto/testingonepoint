'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const CATEGORIES = [
  { value: 'event', label: 'Event' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'work_anniversary', label: 'Work Anniversary' },
  { value: 'training', label: 'Training' },
] as const;

interface HubEvent {
  _id: string;
  title: string;
  category: string;
  date: string;
  allDay: boolean;
  timeLabel?: string;
  description?: string;
  imageUrl?: string;
}

const EMPTY_FORM = { title: '', category: 'event', date: '', allDay: true, timeLabel: '', description: '', imageUrl: '' };

export default function EventsAdminPage() {
  const [rows, setRows] = useState<HubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch('/api/admin/events').then(r => r.json()).then(d => setRows(d.events || [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function startEdit(ev: HubEvent) {
    setEditingId(ev._id);
    setForm({
      title: ev.title,
      category: ev.category,
      date: new Date(ev.date).toISOString().slice(0, 10),
      allDay: ev.allDay,
      timeLabel: ev.timeLabel || '',
      description: ev.description || '',
      imageUrl: ev.imageUrl || '',
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await secureFetch('/api/admin/events', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setToast({ message: editingId ? 'Event updated.' : 'Event added.', type: 'success' });
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return;
    const res = await secureFetch(`/api/admin/events?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setToast({ message: 'Deleted.', type: 'success' }); load(); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Events &amp; Birthdays</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Add birthdays, holidays, work anniversaries, and events. They appear on the Team Hub &quot;Upcoming&quot; section.
      </p>

      <form onSubmit={save} className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
          {editingId ? 'Edit event' : 'New event'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-3">
          <div>
            <label className="label">Title</label>
            <input type="text" className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="Marcel's Birthday" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
          <div>
            <label className="label">Time (if not all-day)</label>
            <input type="text" className="input" value={form.timeLabel} onChange={e => setForm({ ...form, timeLabel: e.target.value })} placeholder="2:00 PM EST" />
          </div>
          <div>
            <label className="label">Image URL (optional)</label>
            <input type="url" className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={1000} style={{ resize: 'vertical' }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--ink)' }}>
          <input type="checkbox" checked={form.allDay} onChange={e => setForm({ ...form, allDay: e.target.checked })} />
          All-day event
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add event'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }} className="btn btn-outline" style={{ padding: '10px 20px' }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>All events ({rows.length})</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No events yet.</div>
      ) : (
        rows.map(ev => (
          <div key={ev._id} className="card-sm" style={{ padding: 14, marginBottom: 8, display: 'flex', gap: 12 }}>
            <div style={{ width: 56, textAlign: 'center', background: 'var(--surface)', padding: '8px 4px', borderRadius: 4, flexShrink: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.08em' }}>{new Date(ev.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{new Date(ev.date).getDate()}</p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{ev.category.replace('_', ' ')}</span>
                {!ev.allDay && ev.timeLabel && <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{ev.timeLabel}</span>}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{ev.title}</p>
              {ev.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{ev.description}</p>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={() => startEdit(ev)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
              <button onClick={() => remove(ev._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
