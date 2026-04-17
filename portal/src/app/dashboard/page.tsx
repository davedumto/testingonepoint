'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTier, getRecommendations, TIER_CONFIG, type InsuranceProduct } from '@/lib/products';
import { IconArrowRight, IconPlus, IconCheck, IconPhone } from '@/components/Icons';
import Toast from '@/components/Toast';

interface Policy { _id: string; productName: string; productCategory: string; carrier: string; policyNumber: string; status: string; premium?: number; startDate?: string; endDate?: string; }
interface PendingQuote { _id: string; productName: string; status: string; }
interface CartItem { _id: string; productName: string; }
interface User { name: string; email: string; }

const CC: Record<string, string> = { auto: '#dc2626', home: '#2e9a55', health: '#0d9488', life: '#7c3aed', disability: '#052847', business: '#052847' };

const TIER_REWARDS: Record<string, string[]> = {
  'Bronze': ['Basic support', 'Policy management portal'],
  'Silver': ['Multi-policy discount', 'Priority email support', 'Annual coverage review'],
  'Platinum': ['Multi-policy discount', 'Priority call routing', 'Dedicated advisor', 'Annual coverage review'],
  'Emerald': ['Multi-policy discount', 'Priority call routing', 'Dedicated advisor', 'Annual coverage review', 'Renewal guarantee', 'Claims advocacy'],
};

const TIER_ICONS: Record<string, string> = {
  'Bronze': '🥉', 'Silver': '🥈', 'Platinum': '💎', 'Emerald': '👑', 'No Tier': '—',
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [quotes, setQuotes] = useState<PendingQuote[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recs, setRecs] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/auth/me'), fetch('/api/policies'), fetch('/api/forms'), fetch('/api/cart')])
      .then(async ([u, p, q, c]) => {
        const ud = await u.json(), pd = await p.json(), qd = await q.json(), cd = await c.json();
        setUser(ud.user || null); setPolicies(pd.policies || []); setQuotes(qd.quotes || []); setCart(cd.items || []);
        setRecs(getRecommendations((pd.policies || []).map((x: Policy) => x.productName)).slice(0, 4));
      }).finally(() => setLoading(false));
  }, []);

  const tier = getTier(policies.length);
  const incompleteCount = quotes.filter(q => q.status === 'incomplete').length;

  async function addToCart(p: InsuranceProduct) {
    const res = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productName: p.name, productCategory: p.category }) });
    if (res.ok) {
      const d = await res.json();
      const newCart = [...cart, d.item];
      setCart(newCart);
      setToast({ message: `${p.name} added to your cart`, type: 'success' });
      window.dispatchEvent(new CustomEvent('cart-update', { detail: { count: newCart.length } }));
    } else {
      const d = await res.json();
      setToast({ message: d.error || 'Could not add to cart', type: 'error' });
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>;

  const rewards = TIER_REWARDS[tier.label] || [];
  const ico = { width: 14, height: 14 };

  return (
    <div>
      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Welcome header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Welcome back</p>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {user?.name || 'Client'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <span className="badge" style={{ background: tier.color + '18', color: tier.color, padding: '4px 12px', fontSize: 12 }}>
            {TIER_ICONS[tier.label]} {tier.label} Member
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{policies.length} active {policies.length === 1 ? 'policy' : 'policies'}</span>
        </div>
      </div>

      {/* At a Glance — main policy card */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>At a Glance</h2>

        <div className="card">
          {/* Loyalty badge — top right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Account Overview</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{TIER_ICONS[tier.label] || '—'}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tier.color }}>{tier.label} loyalty level</div>
                <Link href="#rewards" style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>Discounts and Rewards</Link>
              </div>
            </div>
          </div>

          {/* 3-column layout like Progressive */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            {/* Column 1: Policies */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Policies</h4>
              {policies.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No active policies yet.</p>
              ) : (
                policies.map(p => (
                  <div key={p._id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: CC[p.productCategory] || 'var(--subtle)' }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{p.productName}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.carrier} · #{p.policyNumber}</div>
                      </div>
                    </div>
                    {p.startDate && p.endDate && (
                      <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 4, marginLeft: 12 }}>
                        {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                      </p>
                    )}
                    {p.premium && (
                      <p style={{ fontSize: 12, color: 'var(--subtle)', marginLeft: 12 }}>Premium: ${p.premium}/mo</p>
                    )}
                  </div>
                ))
              )}
              <Link href="/dashboard/policies" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                View all policies <IconArrowRight style={ico} />
              </Link>
            </div>

            {/* Column 2: Contact Info */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Contact Information</h4>
              <p style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{user?.email}</p>
              <Link href="/dashboard/book-call" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                Update contact info <IconArrowRight style={ico} />
              </Link>

              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, marginTop: 20 }}>Quick Actions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Link href="/dashboard/forms" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Start a new quote <IconArrowRight style={ico} />
                </Link>
                <Link href="/dashboard/book-call" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Book a call <IconArrowRight style={ico} />
                </Link>
                <Link href="/dashboard/cart" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  View cart ({cart.length}) <IconArrowRight style={ico} />
                </Link>
              </div>
            </div>

            {/* Column 3: Account Status */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Account Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Active Policies</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{policies.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Loyalty Tier</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: tier.color }}>{tier.label}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>In Cart</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>{cart.length}</p>
                </div>
                {tier.next && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                    Add 1 more policy to reach <strong style={{ color: 'var(--navy)' }}>{tier.next}</strong> and unlock more rewards.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Rewards section */}
      <div id="rewards" style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Discounts and Rewards</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Your current loyalty level: <strong style={{ color: tier.color }}>{tier.label}</strong></p>

        {/* Tier progression */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Loyalty Rewards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderTop: '1px solid var(--line)' }}>
            {Object.entries(TIER_CONFIG).map(([key, t]) => {
              const isActive = tier.label === t.label;
              return (
                <div key={key} style={{ padding: '16px 14px', borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: isActive ? t.color + '0D' : 'transparent', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{TIER_ICONS[t.label]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? t.color : 'var(--navy)' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {t.min === t.max ? `${t.min} ${t.min === 1 ? 'policy' : 'policies'}` : `${t.min}+ policies`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current rewards */}
          {rewards.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>Your rewards include:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {rewards.map(r => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
                    <IconCheck style={{ width: 14, height: 14, color: 'var(--green)', flexShrink: 0 }} />
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bundle & Save — cross-sell */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Bundle &amp; Save</h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Coverage you don&apos;t have yet — adding more unlocks the next tier.</p>

        <div className="grid-2">
          {recs.map(product => {
            const inCart = cart.some(c => c.productName === product.name);
            return (
              <div key={product.name} className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 4, height: 28, borderRadius: 2, background: CC[product.category] || 'var(--subtle)' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{product.name}</h3>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 12, lineHeight: 1.5 }}>{product.description}</p>
                </div>
                <button
                  onClick={() => !inCart && addToCart(product)}
                  disabled={inCart}
                  className={inCart ? 'btn btn-outline' : 'btn btn-navy'}
                  style={{ padding: '8px 16px', fontSize: 12, flexShrink: 0, marginLeft: 16 }}
                >
                  {inCart ? <><IconCheck style={ico} /> Added</> : <><IconPlus style={ico} /> Add</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Need help */}
      <div className="card-sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Need help with your coverage?</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Talk to a licensed OnePoint advisor — no cost, no pressure.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
          <Link href="/dashboard/book-call" className="btn btn-navy" style={{ padding: '10px 20px', fontSize: 12 }}>
            <IconPhone style={ico} /> Book a Call
          </Link>
          <a href="tel:888-899-8117" className="btn btn-outline" style={{ padding: '10px 20px', fontSize: 12 }}>
            Call 888-899-8117
          </a>
        </div>
      </div>
    </div>
  );
}
