'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTier, getRecommendations, TIER_CONFIG, type InsuranceProduct } from '@/lib/products';
import { IconArrowRight, IconPlus, IconCheck } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';
import Toast from '@/components/Toast';
import IdCardWidget from '@/components/IdCardWidget';
import TierBadge from '@/components/TierBadge';
import type { ClientTier } from '@/lib/tier-meta';

// === Types for the /api/dashboard/overview response ===
interface PortfolioPolicy {
  _id: string;
  productName: string;
  productCategory: string;
  carrier: string;
  policyNumber: string;
  status: string;
  premium?: number;
  endDate?: string;
  billingType?: 'carrier_direct' | 'agency_billed' | 'unknown';
}
interface OverviewAction { kind: 'renewal' | 'payment' | 'service_request' | 'claim'; id: string; title: string; detail: string; dueDate?: string; href: string; }
interface OverviewAlert { severity: 'warning' | 'error'; title: string; detail: string; href: string; }
interface MessagePreview { _id: string; senderType: 'client' | 'agent' | 'admin'; body: string; createdAt: string; readByClient: boolean; }
interface NextPayment { date: string; amount: number; carrier?: string; billedBy: 'carrier' | 'agency'; }
interface Overview {
  user: { firstName: string; name: string; tier?: ClientTier; assignedAgent?: string; unreadMessages: number };
  stats: { activePolicies: number; monthlyPremium: number; nextPaymentDue: NextPayment | null; renewalsDue: number; openRequests: number; openClaims: number; };
  portfolio: PortfolioPolicy[];
  upcomingActions: OverviewAction[];
  alerts: OverviewAlert[];
  messagesPreview: MessagePreview[];
}

// Brand-consistent category accent color for portfolio cards.
const CC: Record<string, string> = {
  auto: '#0a3d6b', home: '#052847', health: '#0a3d6b',
  life: '#052847', disability: '#0a3d6b', business: '#052847',
};

function money(amount: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount); }
function moneyExact(amount: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount); }
function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

const ACTION_ICON: Record<OverviewAction['kind'], string> = {
  renewal: '🔄', payment: '💳', service_request: '💬', claim: '📋',
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cart, setCart] = useState<Array<{ _id: string; productName: string }>>([]);
  const [recs, setRecs] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/dashboard/overview'), fetch('/api/cart')])
      .then(async ([ov, c]) => {
        const ovd = await ov.json(), cd = await c.json();
        if (ovd.user) {
          setOverview(ovd);
          // Cross-sell recs key off policy names in the portfolio
          setRecs(getRecommendations(ovd.portfolio.map((p: PortfolioPolicy) => p.productName)).slice(0, 4));
        }
        setCart(cd.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(p: InsuranceProduct) {
    const res = await secureFetch('/api/cart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productName: p.name, productCategory: p.category }),
    });
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

  if (loading || !overview) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;

  const tier = getTier(overview.stats.activePolicies);
  const { stats, portfolio, upcomingActions, alerts, messagesPreview } = overview;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 6 }}>Welcome back</p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {overview.user.firstName || overview.user.name || 'there'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <TierBadge tier={overview.user.tier} size="md" />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {stats.activePolicies} active {stats.activePolicies === 1 ? 'policy' : 'policies'}
          </span>
          {overview.user.assignedAgent && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              · Your agent, <strong style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{overview.user.assignedAgent}</strong>
            </span>
          )}
        </div>
      </div>

      {/* One-click ID card — spec §10/D3 high-panic surface */}
      <IdCardWidget />

      {/* ==== 6 stat tiles (spec §3 Overview Widgets) ==== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatTile label="Active Policies" value={String(stats.activePolicies)} />
        <StatTile label="Monthly Premium" value={money(stats.monthlyPremium)} />
        <StatTile
          label="Next Payment"
          value={stats.nextPaymentDue ? moneyExact(stats.nextPaymentDue.amount) : '—'}
          detail={stats.nextPaymentDue ? `${formatDate(stats.nextPaymentDue.date)} · ${stats.nextPaymentDue.billedBy === 'carrier' ? (stats.nextPaymentDue.carrier || 'Carrier') : 'OnePoint'}` : 'Nothing scheduled'}
          href="/dashboard/billing"
        />
        <StatTile label="Renewals Due" value={String(stats.renewalsDue)} detail="Next 60 days" href="/dashboard/policies" emphasize={stats.renewalsDue > 0} />
        <StatTile label="Open Requests" value={String(stats.openRequests)} href="/dashboard/service-requests" emphasize={stats.openRequests > 0} />
        <StatTile label="Open Claims" value={String(stats.openClaims)} href="/dashboard/claims" emphasize={stats.openClaims > 0} />
      </div>

      {/* Talk to a human — spec §19 Live Agent V1. Phone CTA plus callback
          request lives up high so urgent-need clients don't have to hunt. */}
      <div className="card" style={{
        padding: 18,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)',
        border: 'none',
        color: '#fff',
      }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginBottom: 3 }}>Need help?</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Talk to your OnePoint team</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Mon–Fri 9am–5pm ET. We&apos;re here for quotes, claims, or anything you need.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="tel:888-899-8117" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--navy)', background: '#fff', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            📞 888-899-8117
          </a>
          <Link href="/dashboard/book-call" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, textDecoration: 'none' }}>
            Request a call →
          </Link>
        </div>
      </div>

      {/* ==== 4 visual sections from spec §3 ====
          Use the .grid-2 class (which collapses to 1 col under 768px) instead
          of inline gridTemplateColumns, otherwise the inline style overrides
          the media query and the sections stay cramped on mobile. */}
      <div className="grid-2" style={{ gap: 20, marginBottom: 28 }}>
        {/* Your Protection Portfolio */}
        <section className="card" style={{ padding: 22 }}>
          <SectionHeader title="🛡️ Your Protection Portfolio" link={{ href: '/dashboard/policies', label: 'All policies' }} />
          {portfolio.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>No active policies yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {portfolio.slice(0, 4).map(p => (
                <Link key={p._id} href={`/dashboard/policies/${p._id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: CC[p.productCategory] || 'var(--subtle)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{p.productName}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.carrier} · #{p.policyNumber}
                    </p>
                  </div>
                  {p.premium != null && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{money(p.premium)}</p>
                      <p style={{ fontSize: 10, color: 'var(--subtle)' }}>/month</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Actions */}
        <section className="card" style={{ padding: 22 }}>
          <SectionHeader title="📅 Upcoming Actions" />
          {upcomingActions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Nothing on your plate right now. Good time to review coverage.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {upcomingActions.slice(0, 5).map(a => {
                const days = daysUntil(a.dueDate);
                return (
                  <Link key={a.id + a.kind} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, textDecoration: 'none', background: 'var(--surface)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{ACTION_ICON[a.kind]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.detail}</p>
                    </div>
                    {days != null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: days <= 7 ? '#9a2f2f' : 'var(--muted)', flexShrink: 0 }}>
                        {days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Important Alerts */}
        <section className="card" style={{ padding: 22 }}>
          <SectionHeader title="⚠️ Important Alerts" />
          {alerts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Nothing critical right now.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {alerts.slice(0, 4).map((a, i) => {
                const isError = a.severity === 'error';
                return (
                  <Link key={i} href={a.href} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: 12, borderRadius: 8, textDecoration: 'none',
                    background: isError ? 'rgba(220,38,38,0.08)' : 'rgba(232,199,78,0.12)',
                    border: `1px solid ${isError ? 'rgba(220,38,38,0.25)' : 'rgba(232,199,78,0.3)'}`,
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 16 }}>{isError ? '🚨' : '⚠️'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isError ? '#9a2f2f' : '#6b4500' }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink)', marginTop: 2 }}>{a.detail}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Messages from OnePoint */}
        <section className="card" style={{ padding: 22 }}>
          <SectionHeader title="💬 Messages from OnePoint" link={{ href: '/dashboard/messages', label: 'Open inbox' }} />
          {messagesPreview.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>No messages yet. Your team will reach out here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {messagesPreview.map(m => {
                const isAgent = m.senderType === 'agent' || m.senderType === 'admin';
                return (
                  <Link key={m._id} href="/dashboard/messages" style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 8, background: 'var(--surface)', textDecoration: 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAgent ? '#0a3d6b' : 'var(--subtle)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {isAgent ? 'OP' : 'You'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {m.body}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 2 }}>{formatDate(m.createdAt)}{isAgent && !m.readByClient ? ' · New' : ''}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Tier rewards ladder */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Loyalty Tiers</h2>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(TIER_CONFIG).length}, 1fr)` }}>
            {Object.entries(TIER_CONFIG).map(([key, t]) => {
              const isActive = tier.label === t.label;
              return (
                <div key={key} style={{ padding: '14px 10px', borderRight: '1px solid var(--line)', background: isActive ? t.color + '12' : 'transparent', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? t.color : 'var(--navy)' }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                    {t.min === t.max ? `${t.min} ${t.min === 1 ? 'policy' : 'policies'}` : `${t.min}+`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cross-sell */}
      {recs.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>Bundle &amp; Save</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Coverage you don&apos;t have yet.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {recs.map(product => {
              const inCart = cart.some(c => c.productName === product.name);
              return (
                <div key={product.name} className="card-sm" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                    style={{ padding: '8px 14px', fontSize: 12, textTransform: 'none', letterSpacing: 0, flexShrink: 0 }}
                  >
                    {inCart ? (<><IconCheck style={{ width: 13, height: 13 }} /> Added</>) : (<><IconPlus style={{ width: 13, height: 13 }} /> Add</>)}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({ label, value, detail, href, emphasize }: { label: string; value: string; detail?: string; href?: string; emphasize?: boolean }) {
  const body = (
    <div className="card-sm" style={{
      padding: 16,
      background: emphasize ? 'rgba(232,199,78,0.08)' : undefined,
      borderColor: emphasize ? 'rgba(232,199,78,0.35)' : undefined,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value}</p>
      {detail && <p style={{ fontSize: 11, color: 'var(--muted)' }}>{detail}</p>}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{body}</Link>;
  return body;
}

function SectionHeader({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{title}</h2>
      {link && (
        <Link href={link.href} style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue, #0a3d6b)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {link.label}
          <IconArrowRight style={{ width: 11, height: 11 }} />
        </Link>
      )}
    </div>
  );
}
