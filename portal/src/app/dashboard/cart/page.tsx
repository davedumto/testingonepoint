'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTier } from '@/lib/products';
import { secureFetch } from '@/lib/client/secure-fetch';
import { IconCheck, IconTrash, IconCart } from '@/components/Icons';

interface CartItem { _id: string; productName: string; productCategory: string; }
interface Policy { productName: string; }

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { Promise.all([fetch('/api/cart'), fetch('/api/policies')]).then(async ([c, p]) => { setItems((await c.json()).items || []); setPolicies((await p.json()).policies || []); setLoading(false); }); }, []);

  async function removeItem(id: string) {
    await secureFetch(`/api/cart?id=${id}`, { method: 'DELETE' });
    const newItems = items.filter(i => i._id !== id);
    setItems(newItems);
    window.dispatchEvent(new CustomEvent('cart-update', { detail: { count: newItems.length } }));
  }

  async function handleCheckout() {
    setChecking(true);
    try { const res = await secureFetch('/api/checkout', { method: 'POST' }); if (res.ok) { setSuccess(true); setItems([]); window.dispatchEvent(new CustomEvent('cart-update', { detail: { count: 0 } })); setTimeout(() => router.push('/dashboard'), 4000); } else { const d = await res.json(); alert(d.error || 'Failed.'); } }
    catch { alert('Error.'); } finally { setChecking(false); }
  }

  const currentTier = getTier(policies.length);
  const newTier = getTier(policies.length + items.length);

  if (loading) return <p style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>Loading cart...</p>;

  if (success) return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '64px 0' }}>
      <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(46,154,85,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconCheck style={{ width: 40, height: 40, color: 'var(--green)' }} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Bundle Request Submitted!</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>An advisor will call within one business day.</p>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Coverage Cart</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Review selections, then request a bundle quote.</p>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <IconCart style={{ width: 48, height: 48, color: 'var(--subtle)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Your cart is empty</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Browse recommended coverage on your dashboard.</p>
          <button onClick={() => router.push('/dashboard')} className="btn btn-navy">Browse Coverage</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            {items.map(item => (
              <div key={item._id} className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{item.productName}</h3>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginTop: 4 }}>{item.productCategory}</p>
                </div>
                <button onClick={() => removeItem(item._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <IconTrash style={{ width: 16, height: 16 }} /> Remove
                </button>
              </div>
            ))}
          </div>
          <div>
            <div className="card" style={{ position: 'sticky', top: 32 }}>
              <h3 className="label" style={{ marginBottom: 16 }}>Bundle Summary</h3>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Products</span><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Current tier</span><span style={{ fontWeight: 700, color: currentTier.color }}>{currentTier.label}</span>
                </div>
                {currentTier.label !== newTier.label && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--muted)' }}>New tier</span><span style={{ fontWeight: 700, color: newTier.color }}>{newTier.label}</span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
                <button onClick={handleCheckout} disabled={checking} className="btn btn-navy btn-full">{checking ? 'Submitting...' : 'Request Bundle Quote'}</button>
                <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12, lineHeight: 1.5 }}>No commitment — an advisor will call first.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
