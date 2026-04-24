'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface IdCardDoc {
  _id: string;
  name: string;
  url: string;
  carrier?: string;
  policyNumber?: string;
  policyType?: string;
  isPinned: boolean;
  uploadedAt: string;
}

// Per spec §10/D3: one-click ID card access is flagged as ELITE and
// "mobile-optimized — this is where clients panic most". This widget surfaces
// the pinned (preferred) or most-recent active ID card on the dashboard home.
export default function IdCardWidget() {
  const [card, setCard] = useState<IdCardDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents?kind=id_card')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const docs: IdCardDoc[] = d?.documents || [];
        // Sort server-side already puts pinned first; take the head.
        setCard(docs[0] || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !card) return null;

  // Fire-and-forget view log so HIPAA/audit requirements are covered even
  // when the user opens the Cloudinary URL directly.
  const logView = () => {
    try { fetch(`/api/documents/${card._id}/view-log`, { method: 'POST', keepalive: true }); } catch { /* best-effort */ }
  };

  return (
    <div className="card" style={{
      padding: 18,
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      background: 'linear-gradient(135deg, rgba(10,61,107,0.06) 0%, rgba(5,40,71,0.04) 100%)',
      border: '1px solid rgba(10,61,107,0.15)',
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: 52, height: 52,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
        color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="6" y1="10" x2="10" y2="10"/><line x1="6" y1="14" x2="14" y2="14"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)' }}>Your ID Card</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</p>
        {card.carrier && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{card.carrier}{card.policyNumber ? ` · #${card.policyNumber}` : ''}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <a href={card.url} target="_blank" rel="noopener" onClick={logView} style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--navy)', background: '#fff', border: '1.5px solid var(--navy)', borderRadius: 8, textDecoration: 'none' }}>
          Open
        </a>
        <a href={card.url} download onClick={logView} style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--navy)', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </a>
        <Link href="/dashboard/documents?category=active_policies" style={{ padding: '9px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none' }}>
          All
        </Link>
      </div>
    </div>
  );
}
