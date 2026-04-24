'use client';

import { useEffect, useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

// Top-level folder categories per §D1 of the document spec.
type Category = 'active_policies' | 'quotes' | 'billing' | 'claims' | 'compliance' | 'client_uploads';

const CATEGORY_META: Record<Category, { label: string; hint: string; emoji: string }> = {
  active_policies: { label: 'Active Policies',  hint: 'DEC pages, ID cards, endorsements', emoji: '🛡️' },
  quotes:          { label: 'Quotes & Proposals', hint: 'Quoted, revised, final options', emoji: '🧾' },
  billing:         { label: 'Billing',            hint: 'Invoices, payments, statements', emoji: '💳' },
  claims:          { label: 'Claims',             hint: 'FNOL, adjuster reports, settlement', emoji: '🚨' },
  compliance:      { label: 'Compliance',         hint: 'Signed forms + rejections',       emoji: '📄' },
  client_uploads:  { label: 'Your Uploads',       hint: "Things you've sent to us",        emoji: '📤' },
};

// Only these kinds are client-uploadable from this page — per the spec, all
// other document kinds are agency-generated and uploaded by staff.
const CLIENT_UPLOAD_KINDS = [
  { value: 'driver_license',    label: 'Driver License' },
  { value: 'property_photo',    label: 'Property Photo' },
  { value: 'business_document', label: 'Business Document' },
  { value: 'medical_document',  label: 'Medical Document (Health)' },
] as const;

const DOC_KIND_LABEL: Record<string, string> = {
  dec: 'Declaration (DEC)', id_card: 'ID Card', endorsement: 'Endorsement',
  full_policy: 'Full Policy', renewal: 'Renewal', coi: 'Certificate (COI)',
  quote_summary: 'Quote Summary', coverage_comparison: 'Coverage Comparison', quote_supporting: 'Supporting Doc',
  invoice: 'Invoice', payment_confirmation: 'Payment', billing_statement: 'Statement',
  fnol: 'First Notice of Loss', claim_photo: 'Claim Photo', adjuster_report: 'Adjuster Report',
  claim_correspondence: 'Correspondence', settlement: 'Settlement',
  coverage_selection: 'Coverage Selection', rejection_form: 'Rejection Form',
  cancellation_request: 'Cancellation Request', no_loss_statement: 'No Loss Statement', esign: 'E-Signature',
  driver_license: 'Driver License', property_photo: 'Property Photo',
  business_document: 'Business Document', medical_document: 'Medical Document',
};

interface Doc {
  _id: string;
  kind: string;
  category: Category;
  name: string;
  url: string;
  mimeType?: string;
  carrier?: string;
  policyType?: string;
  policyNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  status: string;
  quoteVersion?: 'quoted' | 'revised' | 'final_option';
  isPinned: boolean;
  tags: string[];
  uploaderType: 'client' | 'agent' | 'admin';
  uploadedAt: string;
  billedBy?: 'carrier' | 'agency';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadKind, setUploadKind] = useState<typeof CLIENT_UPLOAD_KINDS[number]['value']>('driver_license');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    if (category) qs.set('category', category);
    fetch(`/api/documents?${qs.toString()}`)
      .then(r => r.json())
      .then(d => setDocs(d.documents || []))
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => { load(); }, [load]);

  async function togglePin(docId: string) {
    const res = await secureFetch(`/api/documents/${docId}/pin`, { method: 'POST' });
    if (res.ok) {
      const d = await res.json();
      setDocs(prev => prev.map(x => x._id === docId ? { ...x, isPinned: d.isPinned } : x));
    }
  }

  async function archiveDoc(docId: string) {
    if (!confirm('Archive this document? You’ll still be able to find it under Archived.')) return;
    const res = await secureFetch(`/api/documents/${docId}/archive`, { method: 'POST' });
    if (res.ok) {
      setDocs(prev => prev.filter(x => x._id !== docId));
      setToast({ message: 'Document archived.', type: 'success' });
    } else {
      const d = await res.json().catch(() => ({}));
      setToast({ message: d.error || 'Could not archive.', type: 'error' });
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('kind', uploadKind);
      if (uploadName.trim()) fd.append('name', uploadName.trim());

      const res = await secureFetch('/api/documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Upload failed.', type: 'error' }); return; }

      setToast({ message: 'Uploaded.', type: 'success' });
      setShowUpload(false);
      setUploadFile(null);
      setUploadName('');
      load();
    } finally {
      setUploading(false);
    }
  }

  const pinned = docs.filter(d => d.isPinned);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Document Vault</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Your policies, IDs, quotes, claims, and compliance docs — all in one place.</p>
        </div>
        <button type="button" onClick={() => setShowUpload(s => !s)} className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}>
          {showUpload ? 'Cancel' : '+ Upload Document'}
        </button>
      </div>

      {/* Client upload form — only client_uploads category */}
      {showUpload && (
        <form onSubmit={handleUpload} className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Upload a personal document</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.55 }}>
            Use this for driver licenses, property photos, or business documents. Agency-generated documents (policy declarations, ID cards, endorsements) are uploaded by your advisor.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">Type</label>
              <select className="input" value={uploadKind} onChange={e => setUploadKind(e.target.value as typeof uploadKind)}>
                {CLIENT_UPLOAD_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Display name (optional)</label>
              <input type="text" className="input" placeholder="e.g. License front" value={uploadName} onChange={e => setUploadName(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">File</label>
            <input type="file" accept=".pdf,image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="input" />
            <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>PDF, JPG, PNG, WEBP, or HEIC. Max 15 MB.</p>
          </div>
          <button type="submit" disabled={!uploadFile || uploading} className="btn btn-navy" style={{ padding: '10px 18px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      )}

      {/* Search + category filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <svg style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Find a document (e.g. 'id card', 'progressive')…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setCategory('')}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: category === '' ? 'rgba(10,61,107,0.1)' : 'transparent',
            color: category === '' ? 'var(--navy)' : 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {(Object.keys(CATEGORY_META) as Category[]).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              background: category === c ? 'rgba(10,61,107,0.1)' : 'transparent',
              color: category === c ? 'var(--navy)' : 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            <span style={{ marginRight: 4 }}>{CATEGORY_META[c].emoji}</span>
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      {/* Pinned strip — shown only when no filters applied */}
      {!search.trim() && !category && pinned.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>📌 Pinned</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {pinned.map(d => <DocCard key={d._id} doc={d} onPin={togglePin} onArchive={archiveDoc} />)}
          </div>
        </section>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : docs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No documents match</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Try a different category or clear your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {docs.filter(d => !(pinned.includes(d) && !search && !category)).map(d => (
            <DocCard key={d._id} doc={d} onPin={togglePin} onArchive={archiveDoc} />
          ))}
        </div>
      )}

      {/* Compliance disclaimers per §D13 */}
      <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 30, lineHeight: 1.55 }}>
        Documents in this vault are for informational purposes only. Coverage is subject to your policy terms and conditions.
      </p>
    </div>
  );
}

// Fire-and-forget access log. Uses `keepalive: true` so the ping survives the
// navigation when the user clicks through to the Cloudinary URL in a new tab.
// Intentionally no await — we don't want to block the user from opening the doc.
function logDocView(docId: string) {
  try {
    fetch(`/api/documents/${docId}/view-log`, { method: 'POST', keepalive: true });
  } catch {
    /* best-effort */
  }
}

function DocCard({ doc, onPin, onArchive }: { doc: Doc; onPin: (id: string) => void; onArchive: (id: string) => void }) {
  const canArchive = doc.uploaderType === 'client';
  return (
    <div className="card-sm" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
          <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>{DOC_KIND_LABEL[doc.kind] || doc.kind}</p>
        </div>
        <button
          type="button"
          onClick={() => onPin(doc._id)}
          title={doc.isPinned ? 'Unpin' : 'Pin to top'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: doc.isPinned ? 'var(--blue, #0a3d6b)' : 'var(--subtle)' }}
        >
          {doc.isPinned ? '📌' : '📍'}
        </button>
      </div>

      {(doc.carrier || doc.policyNumber) && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          {doc.carrier}{doc.policyNumber ? ` · #${doc.policyNumber}` : ''}
        </p>
      )}

      {doc.billedBy && (
        <p style={{ fontSize: 11, color: 'var(--muted)' }}>
          Billed by {doc.billedBy === 'carrier' ? `${doc.carrier || 'carrier'}` : 'OnePoint'}
        </p>
      )}

      <p style={{ fontSize: 11, color: 'var(--subtle)' }}>Uploaded {formatDate(doc.uploadedAt)}</p>

      <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 4 }}>
        <a href={doc.url} target="_blank" rel="noopener" onClick={() => logDocView(doc._id)} style={{ flex: 1, textAlign: 'center', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: 'var(--navy)', background: '#fff', border: '1.5px solid var(--navy)', borderRadius: 8, textDecoration: 'none' }}>
          Open
        </a>
        <a href={doc.url} download onClick={() => logDocView(doc._id)} style={{ flex: 1, textAlign: 'center', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--navy)', borderRadius: 8, textDecoration: 'none' }}>
          Download
        </a>
        {canArchive && (
          <button
            type="button"
            onClick={() => onArchive(doc._id)}
            title="Archive"
            style={{ padding: '8px 10px', fontSize: 12, color: 'var(--subtle)', background: 'transparent', border: '1.5px solid var(--line)', borderRadius: 8, cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
