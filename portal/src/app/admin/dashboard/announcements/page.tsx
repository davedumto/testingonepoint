'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'news', label: 'News' },
  { value: 'update', label: 'Update' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'holiday', label: 'Holiday' },
] as const;

interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  imageUrl?: string;
  postedBy: string;
  postedAt: string;
  expiresAt?: string;
}

const EMPTY_FORM = { title: '', body: '', category: 'general', pinned: false, imageUrl: '', expiresAt: '' };

export default function AnnouncementsAdminPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch('/api/admin/announcements').then(r => r.json()).then(d => setRows(d.announcements || [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }
  function startEdit(a: Announcement) {
    setEditingId(a._id);
    setForm({
      title: a.title,
      body: a.body,
      category: a.category,
      pinned: a.pinned,
      imageUrl: a.imageUrl || '',
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '',
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = '/api/admin/announcements';
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await secureFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setToast({ message: editingId ? 'Announcement updated.' : 'Announcement posted.', type: 'success' });
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return;
    const res = await secureFetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setToast({ message: 'Deleted.', type: 'success' }); load(); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Announcements</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Post updates, news, and holidays to the Team Hub home. Pinned posts show first.
      </p>

      <form onSubmit={save} className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
          {editingId ? 'Edit announcement' : 'New announcement'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
          <div>
            <label className="label">Title</label>
            <input type="text" className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength={200} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">Body</label>
          <textarea className="input" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={5} required maxLength={5000} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }} className="grid-2">
          <div>
            <label className="label">Image URL (optional)</label>
            <input type="url" className="input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="label">Expires at (optional)</label>
            <input type="datetime-local" className="input" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--ink)' }}>
          <input type="checkbox" checked={form.pinned} onChange={e => setForm({ ...form, pinned: e.target.checked })} />
          Pin to top of Team Hub
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Post announcement'}
          </button>
          {editingId && (
            <button type="button" onClick={startCreate} className="btn btn-outline" style={{ padding: '10px 20px' }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>All announcements ({rows.length})</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No announcements yet.</div>
      ) : (
        rows.map(a => (
          <div key={a._id} className="card-sm" style={{ padding: 14, marginBottom: 8, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                {a.pinned && <span className="badge" style={{ background: 'rgba(232,199,78,0.25)', color: '#8a5a00' }}>Pinned</span>}
                <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{a.category}</span>
                <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{new Date(a.postedAt).toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{a.title}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{a.body.slice(0, 200)}{a.body.length > 200 ? '…' : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={() => startEdit(a)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
              <button onClick={() => remove(a._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
