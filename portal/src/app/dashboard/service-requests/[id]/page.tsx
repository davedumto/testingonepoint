'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

type Status = 'submitted' | 'in_progress' | 'waiting_on_client' | 'completed' | 'cancelled';

interface Comment { authorId: string; authorName: string; authorType: 'client' | 'agent' | 'admin'; body: string; createdAt: string; }
interface Attachment { name: string; url: string; uploadedAt: string; }
interface SRDetail {
  _id: string;
  type: string;
  description: string;
  urgency: string;
  status: Status;
  policyId?: string;
  assignedTo: string;
  attachments: Attachment[];
  comments: Comment[];
  submittedAt: string;
  firstResponseAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

const TYPE_LABEL: Record<string, string> = {
  policy_change: 'Policy Change', add_vehicle: 'Add Vehicle', remove_driver: 'Remove Driver',
  address_update: 'Address Update', certificate_request: 'Certificate (COI) Request',
  billing_issue: 'Billing Issue', cancellation_request: 'Cancellation Request',
};

const STATUS_META: Record<Status, { label: string; bg: string; color: string; description: string }> = {
  submitted: { label: 'Submitted', bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b', description: 'Received — operations will pick this up shortly.' },
  in_progress: { label: 'In Progress', bg: 'rgba(232,199,78,0.2)', color: '#8a5a00', description: 'We\'re working on it. Check back for updates.' },
  waiting_on_client: { label: 'Waiting on You', bg: 'rgba(220,38,38,0.12)', color: '#9a2f2f', description: 'We need more info from you — please reply below.' },
  completed: { label: 'Completed', bg: 'rgba(10,125,74,0.12)', color: '#0a7d4a', description: 'Done. If anything else comes up, open a new request.' },
  cancelled: { label: 'Cancelled', bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e', description: 'This request was cancelled.' },
};

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ServiceRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sr, setSr] = useState<SRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function load() {
    fetch(`/api/service-requests/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setSr(d.request);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await secureFetch(`/api/service-requests/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not post.', type: 'error' }); return; }
      setComment('');
      load();
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;
  if (error || !sr) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 20, textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>{error || 'Request not found.'}</p>
      <Link href="/dashboard/service-requests" style={{ color: 'var(--blue, #0a3d6b)', fontWeight: 600 }}>← Back to requests</Link>
    </div>
  );

  const statusMeta = STATUS_META[sr.status];
  const closed = sr.status === 'completed' || sr.status === 'cancelled';

  return (
    <div style={{ maxWidth: 780 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/dashboard/service-requests" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to requests</Link>

      <div style={{ marginTop: 14, marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Service Request</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.01em' }}>{TYPE_LABEL[sr.type] || sr.type}</h1>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>Submitted {formatDateTime(sr.submittedAt)}</p>
      </div>

      {/* Status banner */}
      <div style={{ padding: 16, borderRadius: 10, background: statusMeta.bg, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: statusMeta.color, marginBottom: 4 }}>{statusMeta.label}</p>
        <p style={{ fontSize: 12, color: 'var(--ink)' }}>{statusMeta.description}</p>
      </div>

      {/* Details */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Your Request</h2>
        <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sr.description}</p>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 2 }}>Urgency</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{sr.urgency}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 2 }}>Assigned</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{sr.assignedTo}</p>
          </div>
          {sr.firstResponseAt && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 2 }}>First response</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formatDateTime(sr.firstResponseAt)}</p>
            </div>
          )}
          {sr.completedAt && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 2 }}>Completed</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{formatDateTime(sr.completedAt)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Attachments */}
      {sr.attachments?.length > 0 && (
        <section className="card" style={{ padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Attachments</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sr.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'var(--surface)', borderRadius: 8, textDecoration: 'none' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{a.name}</p>
                <span style={{ fontSize: 11, color: 'var(--subtle)' }}>Open →</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Conversation thread */}
      <section className="card" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Conversation</h2>
        {sr.comments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>No replies yet. We&apos;ll respond here as we make progress.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
            {sr.comments.map((c, i) => {
              const isClient = c.authorType === 'client';
              return (
                <div key={i} style={{
                  padding: 14,
                  borderRadius: 10,
                  background: isClient ? 'rgba(10,61,107,0.06)' : 'var(--surface)',
                  borderLeft: isClient ? '3px solid var(--navy)' : '3px solid #0a7d4a',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{c.authorName}</p>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: isClient ? 'rgba(10,61,107,0.15)' : 'rgba(10,125,74,0.15)', color: isClient ? 'var(--navy)' : '#0a7d4a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {c.authorType}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--subtle)', marginLeft: 'auto' }}>{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</p>
                </div>
              );
            })}
          </div>
        )}

        {!closed && (
          <form onSubmit={submitComment}>
            <textarea
              className="input"
              rows={3}
              maxLength={5000}
              placeholder="Add a reply or update…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              style={{ resize: 'vertical', minHeight: 80, marginBottom: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={posting || !comment.trim()} className="btn btn-navy" style={{ padding: '8px 18px', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
                {posting ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
