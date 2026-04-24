'use client';

import { useEffect, useState, useMemo } from 'react';
import { QUOTE_CATALOG, QUOTE_GROUP_LABEL, QUOTE_GROUP_HINT, type QuoteGroup, type QuoteProduct } from '@/lib/quote-catalog';
import { secureFetch } from '@/lib/client/secure-fetch';
import Toast from '@/components/Toast';

interface MeUser { firstName?: string; lastName?: string; name?: string; email: string; phone?: string; }

// Append the client's contact info to the marketing form URL so the form
// arrives pre-filled per spec §Q3. Marketing site must be accepting these
// query params — kept to a minimal set so nothing breaks if a field is missing.
function buildRedirectUrl(product: QuoteProduct, user: MeUser | null): string {
  if (!user) return product.formUrl;
  const params = new URLSearchParams();
  const first = user.firstName || (user.name?.split(' ')[0] ?? '');
  const last = user.lastName || (user.name?.split(' ').slice(1).join(' ') ?? '');
  if (first) params.set('firstName', first);
  if (last) params.set('lastName', last);
  if (user.email) params.set('email', user.email);
  if (user.phone) params.set('phone', user.phone);
  params.set('source', 'portal');
  const joiner = product.formUrl.includes('?') ? '&' : '?';
  return `${product.formUrl}${joiner}${params.toString()}`;
}

export default function QuotesPage() {
  const [group, setGroup] = useState<QuoteGroup>('personal');
  const [user, setUser] = useState<MeUser | null>(null);
  const [pending, setPending] = useState<QuoteProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.user) setUser(d.user);
    }).catch(() => {});
  }, []);

  const byGroup = useMemo(() => QUOTE_CATALOG.filter(p => p.group === group), [group]);

  function startQuote(p: QuoteProduct) { setPending(p); }

  async function confirmAndRedirect() {
    if (!pending) return;
    // Fire-and-forget tracking so a slow DB never blocks the redirect.
    secureFetch('/api/quotes/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productKey: pending.key }),
    }).catch(() => {});

    const url = buildRedirectUrl(pending, user);
    window.open(url, '_blank', 'noopener');
    setPending(null);
    setToast({ message: 'We pre-filled your info on the form. A new tab just opened.', type: 'info' });
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Get a Quote</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Pick what you need. We&apos;ll pre-fill your info so you don&apos;t have to retype it.</p>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        {(Object.keys(QUOTE_GROUP_LABEL) as QuoteGroup[]).map(g => {
          const active = group === g;
          return (
            <button
              key={g}
              onClick={() => setGroup(g)}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: 'none',
                background: active ? 'var(--navy)' : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {QUOTE_GROUP_LABEL[g]}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>{QUOTE_GROUP_HINT[group]}</p>

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 30 }}>
        {byGroup.map(p => (
          <button
            key={p.key}
            onClick={() => startQuote(p)}
            className="card-sm"
            style={{
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--line)',
              background: '#fff',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 28 }}>{p.icon}</span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{p.name}</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, flex: 1 }}>{p.description}</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue, #0a3d6b)', marginTop: 'auto' }}>Get quote →</span>
          </button>
        ))}
      </div>

      {/* Compliance disclaimer block — always visible per spec §Q9 */}
      <div style={{ padding: 14, borderRadius: 10, background: 'rgba(232,199,78,0.1)', border: '1px solid rgba(232,199,78,0.3)' }}>
        <p style={{ fontSize: 12, color: '#6b4500', fontWeight: 700, marginBottom: 4 }}>Before you quote</p>
        <p style={{ fontSize: 12, color: '#6b4500', lineHeight: 1.55 }}>
          Submitting a quote does not bind coverage. Final pricing is subject to underwriting and carrier approval.
        </p>
      </div>

      {/* Pre-redirect confirmation modal */}
      {pending && (
        <div
          onClick={() => setPending(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5,40,71,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 40 }}>{pending.icon}</span>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{pending.name}</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{QUOTE_GROUP_LABEL[pending.group]}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 18 }}>
              We&apos;ll open our quote form in a new tab with your name, email, and phone already filled in. Your agent gets notified right away.
            </p>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(232,199,78,0.1)', border: '1px solid rgba(232,199,78,0.3)', marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: '#6b4500', lineHeight: 1.55 }}>
                Submitting a quote does not bind coverage. Final pricing is subject to underwriting.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPending(null)}
                style={{ padding: '10px 16px', fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, borderRadius: 8 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndRedirect}
                className="btn btn-navy"
                style={{ padding: '10px 18px', fontSize: 13, textTransform: 'none', letterSpacing: 0 }}
              >
                Open quote form →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
