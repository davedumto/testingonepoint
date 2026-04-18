'use client';

import { useEffect, useState } from 'react';
import { ALL_PRODUCTS } from '@/lib/products';
import { secureFetch } from '@/lib/client/secure-fetch';

interface PendingQuote { _id: string; productName: string; productCategory: string; formData: Record<string, string>; status: string; updatedAt: string; }

const FIELDS = [
  { label: 'Full Name', type: 'text', placeholder: 'John Doe' },
  { label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' },
  { label: 'Date of Birth', type: 'date', placeholder: '' },
  { label: 'Address', type: 'text', placeholder: '123 Main St, City, State ZIP' },
  { label: 'Coverage Amount Desired', type: 'text', placeholder: 'e.g. $500,000' },
  { label: 'Current Carrier (if any)', type: 'text', placeholder: 'e.g. Progressive' },
  { label: 'Additional Notes', type: 'textarea', placeholder: 'Any specific needs?' },
];

const ST: Record<string, { bg: string; color: string }> = {
  incomplete: { bg: 'rgba(13,148,136,0.1)', color: 'var(--teal)' },
  submitted: { bg: 'rgba(5,40,71,0.08)', color: 'var(--navy)' },
  in_review: { bg: 'rgba(124,58,237,0.1)', color: 'var(--purple)' },
  completed: { bg: 'rgba(46,154,85,0.1)', color: 'var(--green)' },
};

export default function FormsPage() {
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [active, setActive] = useState<PendingQuote | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [selProduct, setSelProduct] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/forms').then(r => r.json()).then(d => setQuotes(d.quotes || [])).finally(() => setLoading(false)); }, []);

  function openQuote(q: PendingQuote) { setActive(q); setFormData(q.formData || {}); setShowNew(false); setMsg(''); }
  function startNew() { if (!selProduct) return; setActive(null); setFormData({}); setShowNew(true); setMsg(''); }

  async function saveForm(submit: boolean) {
    const fn = submit ? setSubmitting : setSaving; fn(true);
    const product = active?.productName || selProduct;
    const category = active?.productCategory || ALL_PRODUCTS.find(p => p.name === selProduct)?.category || 'auto';
    try {
      const res = await secureFetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteId: active?._id, productName: product, productCategory: category, formData, submit }) });
      const data = await res.json();
      if (res.ok) {
        if (submit) { setMsg('Form submitted! An advisor will reach out.'); setActive(null); setShowNew(false); const r = await fetch('/api/forms'); const d = await r.json(); setQuotes(d.quotes || []); }
        else { setMsg('Progress saved.'); if (data.quote) setActive(data.quote); setTimeout(() => setMsg(''), 3000); }
      }
    } catch { alert('Failed to save.'); } finally { fn(false); }
  }

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>Loading forms...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>My Insurance Forms</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Complete unfinished forms or start a new application.</p>

      {msg && <div className={`alert ${msg.includes('submitted') ? 'alert-success' : 'alert-success'}`}>{msg}</div>}

      {(active || showNew) && (
        <div className="card" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{active ? `Continue: ${active.productName}` : `New: ${selProduct}`}</h2>
            <button onClick={() => { setActive(null); setShowNew(false); }} style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
          {FIELDS.map(f => (
            <div key={f.label} style={{ marginBottom: 20 }}>
              <label className="label">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={formData[f.label] || ''} onChange={e => setFormData(p => ({ ...p, [f.label]: e.target.value }))} rows={3} placeholder={f.placeholder} className="input" style={{ resize: 'vertical', minHeight: 80 }} />
              ) : (
                <input type={f.type} value={formData[f.label] || ''} onChange={e => setFormData(p => ({ ...p, [f.label]: e.target.value }))} placeholder={f.placeholder} className="input" />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button onClick={() => saveForm(false)} disabled={saving} className="btn btn-outline">{saving ? 'Saving...' : 'Save Progress'}</button>
            <button onClick={() => saveForm(true)} disabled={submitting} className="btn btn-navy">{submitting ? 'Submitting...' : 'Submit Form'}</button>
          </div>
        </div>
      )}

      {!active && !showNew && (
        <div className="card" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <select value={selProduct} onChange={e => setSelProduct(e.target.value)} className="input" style={{ flex: 1 }}>
            <option value="">Select a product to start a new form...</option>
            {ALL_PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name} ({p.category})</option>)}
          </select>
          <button onClick={startNew} disabled={!selProduct} className="btn btn-navy" style={{ opacity: selProduct ? 1 : 0.5 }}>Start Form</button>
        </div>
      )}

      {quotes.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Your Forms</h2>
          {quotes.map(q => {
            const s = ST[q.status] || ST.incomplete;
            return (
              <button key={q._id} onClick={() => openQuote(q)} className="card-sm" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{q.productName}</h3>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Updated: {new Date(q.updatedAt).toLocaleDateString()}</p>
                </div>
                <span className="badge" style={{ background: s.bg, color: s.color }}>{q.status}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
