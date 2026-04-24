'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import TierBadge from '@/components/TierBadge';
import type { ClientTier } from '@/lib/tier-meta';

interface ClientRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  tier?: ClientTier;
  assignedAgent?: string;
  businessName?: string;
  activePolicies: number;
  monthlyPremium: number;
  openRequests: number;
  createdAt: string;
  ghlContactId?: string;
  ghlCreatedAt?: string;
  ghlLastActivity?: string;
  tags?: string[];
}

function money(n: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); }
function fmtDate(iso?: string) { if (!iso) return ''; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }); }

// Tag-specific colors. Defaults to a muted navy; known lifecycle buckets get
// their own accent so the admin eye can skim the list quickly.
function tagStyle(tag: string): { bg: string; color: string } {
  const t = tag.toLowerCase();
  if (t.includes('client')) return { bg: 'rgba(10,125,74,0.14)', color: '#0a7d4a' };
  if (t.includes('lost')) return { bg: 'rgba(220,38,38,0.1)', color: '#9a2f2f' };
  if (t.includes('urgent')) return { bg: 'rgba(220,38,38,0.15)', color: '#9a2f2f' };
  if (t.includes('lead')) return { bg: 'rgba(232,199,78,0.2)', color: '#8a5a00' };
  if (t.includes('quote')) return { bg: 'rgba(10,61,107,0.12)', color: '#0a3d6b' };
  return { bg: 'rgba(140,150,165,0.18)', color: '#5a6c7e' };
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (agentFilter) params.set('agent', agentFilter);
    if (tagFilter) params.set('tag', tagFilter);
    setLoading(true);
    fetch(`/api/admin/clients?${params.toString()}`)
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .finally(() => setLoading(false));
  }, [search, agentFilter, tagFilter]);

  const totals = useMemo(() => ({
    count: clients.length,
    premium: clients.reduce((s, c) => s + (c.monthlyPremium || 0), 0),
    openRequests: clients.reduce((s, c) => s + c.openRequests, 0),
  }), [clients]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Clients</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{totals.count} clients · {money(totals.premium)} total monthly premium · {totals.openRequests} open requests</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
          />
        </div>
        <select className="input" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All agents</option>
          <option value="alex">Alex</option>
          <option value="vera">Vera</option>
          <option value="team">Team</option>
        </select>
        <input
          type="text"
          placeholder="Filter by tag (e.g. health lead)…"
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="input"
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Popular-tag quick filters. Clicking swaps the tag filter input. */}
      <PopularTagChips clients={clients} active={tagFilter} onPick={setTagFilter} />

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : clients.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--muted)' }}>No clients match.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Horizontal scroll on mobile — the table has 6 columns which
              won't fit under ~700px. Better to scroll than to stack awkwardly. */}
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                <Th>Client</Th>
                <Th>Tags</Th>
                <Th>Tier</Th>
                <Th align="right">Policies</Th>
                <Th align="right">Monthly</Th>
                <Th align="right">Open SRs</Th>
                <Th>Last activity</Th>
                <Th>Agent</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/admin/dashboard/clients/${c._id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</p>
                      {c.businessName && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>🏢 {c.businessName}</p>}
                      {c.phone && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>📞 {c.phone}</p>}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 14px', maxWidth: 220 }}>
                    {(c.tags && c.tags.length > 0) ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.tags.slice(0, 3).map((t, i) => {
                          const s = tagStyle(t);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => { e.preventDefault(); setTagFilter(t); }}
                              title={`Filter by "${t}"`}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: s.bg,
                                color: s.color,
                                fontSize: 10,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t}
                            </button>
                          );
                        })}
                        {c.tags.length > 3 && (
                          <span style={{ fontSize: 10, color: 'var(--subtle)', fontWeight: 600, alignSelf: 'center' }}>
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--subtle)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <TierBadge tier={c.tier} size="sm" />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{c.activePolicies}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: 'var(--ink)' }}>{c.monthlyPremium ? money(c.monthlyPremium) : '—'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13 }}>
                    {c.openRequests > 0 ? (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(220,38,38,0.1)', color: '#9a2f2f', fontWeight: 700 }}>
                        {c.openRequests}
                      </span>
                    ) : <span style={{ color: 'var(--subtle)' }}>0</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)' }}>
                    {c.ghlLastActivity ? fmtDate(c.ghlLastActivity) : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{c.assignedAgent || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Aggregates the top-N most common tags across the current result set so the
// admin can one-click filter by lifecycle bucket without typing.
function PopularTagChips({ clients, active, onPick }: { clients: ClientRow[]; active: string; onPick: (t: string) => void }) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clients) {
      for (const t of c.tags || []) m.set(t, (m.get(t) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [clients]);

  if (counts.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', alignSelf: 'center', marginRight: 4 }}>Popular</span>
      {active && (
        <button
          type="button"
          onClick={() => onPick('')}
          style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(220,38,38,0.08)', color: '#9a2f2f', fontSize: 11, fontWeight: 600, border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}
        >
          ✕ Clear filter
        </button>
      )}
      {counts.map(([t, n]) => {
        const s = tagStyle(t);
        const isActive = active === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onPick(isActive ? '' : t)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: isActive ? s.color : s.bg,
              color: isActive ? '#fff' : s.color,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${isActive ? s.color : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {t} <span style={{ opacity: 0.7, marginLeft: 4 }}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', textAlign: align }}>
      {children}
    </th>
  );
}
