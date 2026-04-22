'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'training', label: 'Training' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'forms', label: 'Forms' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'resources', label: 'Resources' },
  { value: 'other', label: 'Other' },
] as const;

interface DocLink {
  _id: string;
  name: string;
  url: string;
  category: string;
  description?: string;
  postedBy: string;
  postedAt: string;
}

const EMPTY_FORM = { name: '', url: '', category: 'resources', description: '' };

export default function DocumentsAdminPage() {
  const [rows, setRows] = useState<DocLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch('/api/admin/documents').then(r => r.json()).then(d => setRows(d.documents || [])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function startEdit(d: DocLink) {
    setEditingId(d._id);
    setForm({ name: d.name, url: d.url, category: d.category, description: d.description || '' });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await secureFetch('/api/admin/documents', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setToast({ message: editingId ? 'Document updated.' : 'Document added.', type: 'success' });
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return;
    const res = await secureFetch(`/api/admin/documents?id=${id}`, { method: 'DELETE' });
    if (res.ok) { setToast({ message: 'Deleted.', type: 'success' }); load(); }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Documents</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Paste OneDrive, SharePoint, or Google Drive URLs. Employees click through directly to the file.
      </p>

      <form onSubmit={save} className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
          {editingId ? 'Edit document' : 'New document'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
          <div>
            <label className="label">Name</label>
            <input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={250} placeholder="Q4 Marketing Playbook" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label className="label">URL</label>
          <input type="url" className="input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} required placeholder="https://onepointinsuranceagency.sharepoint.com/..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label">Description (optional)</label>
          <textarea className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add document'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); }} className="btn btn-outline" style={{ padding: '10px 20px' }}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>All documents ({rows.length})</h2>
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No documents yet.</div>
      ) : (
        rows.map(d => (
          <div key={d._id} className="card-sm" style={{ padding: 14, marginBottom: 8, display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{d.category}</span>
                <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{new Date(d.postedAt).toLocaleDateString()}</span>
              </div>
              <a href={d.url} target="_blank" rel="noopener" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{d.name} ↗</a>
              <p style={{ fontSize: 11, color: 'var(--subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{d.url}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
              <button onClick={() => startEdit(d)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>Edit</button>
              <button onClick={() => remove(d._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
