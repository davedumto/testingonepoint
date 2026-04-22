'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe, CHANNELS } from '@/lib/pusher/client';

// -- Static external links -----------------------------------------------------

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';

type ProductIcon = 'auto' | 'home' | 'health' | 'life' | 'disability' | 'business' | 'calendar' | 'grad';

const INSURANCE_PRODUCTS: Array<{ name: string; description: string; url: string; accent: string; icon: ProductIcon }> = [
  { name: 'Auto', description: 'Personal vehicle coverage', url: `${MARKETING_BASE}/auto-insurance/`, accent: '#dc2626', icon: 'auto' },
  { name: 'Home Owners', description: 'Home + property protection', url: `${MARKETING_BASE}/home`, accent: '#2e9a55', icon: 'home' },
  { name: 'Health', description: 'ACA + ancillary medical', url: `${MARKETING_BASE}/health`, accent: '#0d9488', icon: 'health' },
  { name: 'Life', description: 'Term + whole life', url: `${MARKETING_BASE}/life`, accent: '#7c3aed', icon: 'life' },
  { name: 'Disability', description: 'Short + long term disability', url: `${MARKETING_BASE}/disability-insurance`, accent: '#052847', icon: 'disability' },
  { name: 'Business', description: 'Commercial + BOP coverage', url: `${MARKETING_BASE}/business`, accent: '#8a3b12', icon: 'business' },
];

function ProductGlyph({ name }: { name: ProductIcon }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'auto': return <svg {...common}><path d="M5 17h14M5 17a2 2 0 1 1-4 0M19 17a2 2 0 1 0 4 0M5 17v-4l2-5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 1l2 5v4" /></svg>;
    case 'home': return <svg {...common}><path d="M3 11l9-8 9 8M5 10v10h14V10" /></svg>;
    case 'health': return <svg {...common}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>;
    case 'life': return <svg {...common}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 5a5.5 5.5 0 0 1 9.5 7c-2.5 4.5-9.5 9-9.5 9z" /></svg>;
    case 'disability': return <svg {...common}><path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z M9 12l2 2 4-4" /></svg>;
    case 'business': return <svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></svg>;
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case 'grad': return <svg {...common}><path d="M2 9l10-5 10 5-10 5L2 9z M6 11v5c2 1.5 4 2.5 6 2.5s4-1 6-2.5v-5M22 9v5" /></svg>;
  }
}

const APPOINTMENT_URL = `${MARKETING_BASE}/book-call`;
const TRAINING_HUB_URL = 'https://portal.onepointinsuranceagency.com/';

const QUICK_TOOLS = [
  // TODO: admin-configurable in Phase 4. Stubs for Quote Forms / Tech Tools / Imagine until URLs are supplied.
  { name: 'Quote Forms', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Quote-Forms.aspx', color: '#0d9488', imageUrl: 'https://media.akamai.odsp.cdn.office.net/southcentralus1-mediap.svc.ms/transform/thumbnail?provider=url&inputFormat=jpg&docid=https%3A%2F%2Fcdn.hubblecontent.osi.office.net%2Fm365content%2Fpublish%2Fe8d814a4-baa6-4c1e-82e6-f03a10350289%2F678822401.jpg&w=400' },
  { name: 'Tech Tools', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tech-Tools.aspx', color: '#7c3aed', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322a38e07b348488dea5.png' },
  { name: 'Client Tools', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tools-%26-Resources.aspx', color: '#0a7d63', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322b9ff45b49cc916125.png' },
  { name: 'Imagine, Grok', url: 'https://grok.com', color: '#000000', imageUrl: 'https://grok.com/icon-512x512.png' },
  { name: 'My LastPass Vault', url: 'https://lastpass.com/vault', color: '#d32d27', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e93498a1636a6c6547a3a3.png' },
  { name: 'Microsoft Teams', url: 'https://teams.cloud.microsoft/', color: '#5059c9', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e93498b0e5e2bb7fe92615.png' },
  { name: 'Outlook', url: 'https://outlook.cloud.microsoft/mail/', color: '#0078d4', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e934989ff45b49cc9201f8.png' },
];

const CRM_IMAGE_URL = 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322a717d5dd4e123759b.png';

const CRM_DESTINATION = 'http://app.innovateihub.com/';
const CRM_OAUTH_INITIATE = '/employee/api/oauth/ghl';
const CRM_AUTH_FRESHNESS_MS = 24 * 60 * 60 * 1000;

// US timezone clocks on the header
const LOCATION_CLOCKS = [
  { label: 'Alpharetta, GA', tz: 'America/New_York' },
  { label: 'Texas City, TX', tz: 'America/Chicago' },
  { label: 'Nashville, TN', tz: 'America/Chicago' },
  { label: 'Miami, FL', tz: 'America/New_York' },
];

// -- Types ---------------------------------------------------------------------

interface Announcement { _id: string; title: string; body: string; category: string; pinned: boolean; imageUrl?: string; postedBy: string; postedAt: string; }
interface Meeting { _id: string; name: string; group: string; teamsUrl: string; scheduleLabel: string; description?: string; host?: string; }
interface HubEventItem { _id: string; title: string; category: string; date: string; allDay: boolean; timeLabel?: string; description?: string; imageUrl?: string; }
interface DocLink { _id: string; name: string; url: string; category: string; description?: string; postedAt: string; }
interface HubData {
  announcements: Announcement[];
  meetings: Meeting[];
  events: HubEventItem[];
  documents: DocLink[];
  crm: { hasApprovedAccess: boolean; lastAuthenticated: string | null };
}

// -- Helpers -------------------------------------------------------------------

function isAuthFresh(lastAuth?: string | null): boolean {
  if (!lastAuth) return false;
  const t = new Date(lastAuth).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < CRM_AUTH_FRESHNESS_MS;
}

function formatClock(tz: string, now: Date): string {
  return now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateShort(iso: string | Date): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatEventMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}
function formatEventDay(iso: string): string {
  return String(new Date(iso).getDate());
}

const SUGGESTION_TYPES = [
  { value: 'process', label: 'Process Improvement' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'technology', label: 'Technology / Tools' },
  { value: 'culture', label: 'Culture / Team' },
  { value: 'other', label: 'Other' },
] as const;

// -- Component -----------------------------------------------------------------

export default function EmployeeTeamHubPage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [hub, setHub] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Suggestion form
  const [suggestName, setSuggestName] = useState('');
  const [suggestEmail, setSuggestEmail] = useState('');
  const [suggestType, setSuggestType] = useState<typeof SUGGESTION_TYPES[number]['value']>('process');
  const [suggestMessage, setSuggestMessage] = useState('');
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);

  const refetchHub = useCallback(() => {
    fetch('/employee/api/hub')
      .then(r => r.json())
      .then(hubData => { if (hubData.announcements) setHub(hubData); });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/employee/auth/me').then(r => r.json()),
      fetch('/employee/api/hub').then(r => r.json()),
    ]).then(([me, hubData]) => {
      if (me.employee) {
        setUser({ name: me.employee.name || me.employee.email, email: me.employee.email });
        setSuggestName(me.employee.name || '');
        setSuggestEmail(me.employee.email || '');
      }
      if (hubData.announcements) setHub(hubData);
    }).finally(() => setLoading(false));
  }, []);

  // Live invalidation: any admin write on a hub surface triggers a single
  // refetch. No-op when Pusher env vars aren't set.
  useEffect(() => {
    return subscribe(CHANNELS.hub, { 'hub:changed': () => refetchHub() });
  }, [refetchHub]);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (!suggestMessage.trim()) return;
    setSuggestSubmitting(true);
    try {
      const res = await secureFetch('/employee/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterName: suggestName,
          submitterEmail: suggestEmail,
          suggestionType: suggestType,
          message: suggestMessage,
        }),
      });
      if (res.ok) {
        setToast({ message: 'Suggestion received. Thanks for helping us improve.', type: 'success' });
        setSuggestMessage('');
        setSuggestType('process');
      } else {
        const d = await res.json().catch(() => ({}));
        setToast({ message: d.error || 'Could not submit suggestion.', type: 'error' });
      }
    } finally {
      setSuggestSubmitting(false);
    }
  }

  const crmFresh = isAuthFresh(hub?.crm.lastAuthenticated);
  const crmHref = !hub?.crm.hasApprovedAccess || !crmFresh ? CRM_OAUTH_INITIATE : CRM_DESTINATION;
  const crmLabel = !hub?.crm.hasApprovedAccess
    ? 'Request Access'
    : crmFresh ? 'Open CRM' : 'Authenticate';

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header + Location & Times */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 6 }}>Team Hub</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>
          Welcome, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
          Your workspace for meetings, tools, announcements, and everything you need day-to-day.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Location &amp; Times</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {LOCATION_CLOCKS.map(loc => (
            <div key={loc.label} style={{ background: 'var(--surface)', padding: '10px 14px', borderRadius: 6 }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{loc.label}</p>
              <p style={{ fontSize: 18, color: 'var(--navy)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {formatClock(loc.tz, now)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Insurance product / coverage tiles */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Coverage &amp; Products</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {INSURANCE_PRODUCTS.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noopener" className="product-tile" style={{ ['--accent' as string]: p.accent }}>
              <div className="product-tile-icon" style={{ background: `${p.accent}15`, color: p.accent }}>
                <ProductGlyph name={p.icon} />
              </div>
              <p className="product-tile-name">{p.name}</p>
              <p className="product-tile-desc">{p.description}</p>
              <span className="product-tile-arrow" aria-hidden>→</span>
            </a>
          ))}
          <a href={APPOINTMENT_URL} target="_blank" rel="noopener" className="product-tile product-tile-cta" style={{ ['--accent' as string]: '#0d9488' }}>
            <div className="product-tile-icon" style={{ background: 'rgba(13,148,136,0.15)', color: '#0d9488' }}>
              <ProductGlyph name="calendar" />
            </div>
            <p className="product-tile-name">Book a Call</p>
            <p className="product-tile-desc">Set up a client meeting</p>
            <span className="product-tile-arrow" aria-hidden>→</span>
          </a>
          <a href={TRAINING_HUB_URL} target="_blank" rel="noopener" className="product-tile product-tile-cta" style={{ ['--accent' as string]: '#7c3aed' }}>
            <div className="product-tile-icon" style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed' }}>
              <ProductGlyph name="grad" />
            </div>
            <p className="product-tile-name">Training Hub</p>
            <p className="product-tile-desc">Modules &amp; sessions</p>
            <span className="product-tile-arrow" aria-hidden>→</span>
          </a>
        </div>
      </section>

      {/* Announcements + Suggestion Box side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 32 }} className="grid-2">
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>News &amp; Announcements</h2>
            <Link href="/employee/dashboard/news" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>More news →</Link>
          </div>
          {hub?.announcements.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hub.announcements.slice(0, 4).map(a => (
                <div key={a._id} className="card-sm" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {a.pinned && <span className="badge" style={{ background: 'rgba(232,199,78,0.2)', color: '#8a5a00' }}>Pinned</span>}
                    <span className="badge badge-teal" style={{ textTransform: 'capitalize' }}>{a.category}</span>
                    <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{formatDateShort(a.postedAt)}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{a.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.body.slice(0, 280)}{a.body.length > 280 ? '…' : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-sm" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No announcements yet. Admins will post updates here.
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Suggestion Box</h2>
          <form onSubmit={submitSuggestion} className="card" style={{ padding: 18 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
              Share an idea, concern, or shoutout. Goes straight to admin.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Your name</label>
              <input type="text" className="input" value={suggestName} onChange={e => setSuggestName(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Email</label>
              <input type="email" className="input" value={suggestEmail} onChange={e => setSuggestEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Type</label>
              <select className="input" value={suggestType} onChange={e => setSuggestType(e.target.value as typeof suggestType)}>
                {SUGGESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Your suggestion</label>
              <textarea className="input" rows={5} value={suggestMessage} onChange={e => setSuggestMessage(e.target.value)} required placeholder="What's on your mind?" style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={suggestSubmitting || !suggestMessage.trim()} className="btn btn-navy btn-full">
              {suggestSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </section>
      </div>

      {/* Team Meetings */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Team Meetings</h2>
          <Link href="/employee/dashboard/meetings" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>All meetings →</Link>
        </div>
        {hub?.meetings.filter(m => m.group !== 'training').length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {hub.meetings.filter(m => m.group !== 'training').map(m => (
              <div key={m._id} className="card-sm" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.scheduleLabel}</p>
                  {m.host && <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 2 }}>Host: {m.host}</p>}
                </div>
                {m.description && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{m.description}</p>}
                <a href={m.teamsUrl} target="_blank" rel="noopener" className="btn btn-teal" style={{ padding: '8px 14px', fontSize: 12, textDecoration: 'none', marginTop: 'auto' }}>
                  Join on Teams
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-sm" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No meetings configured. Admins can add them from the admin dashboard.
          </div>
        )}
      </section>

      {/* Training */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Training</h2>
          <Link href="/employee/dashboard/learning" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>Full learning hub →</Link>
        </div>
        {hub?.meetings.filter(m => m.group === 'training').length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {hub.meetings.filter(m => m.group === 'training').map(m => (
              <div key={m._id} className="card-sm" style={{ padding: 16 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{m.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.scheduleLabel}</p>
                {m.description && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 8 }}>{m.description}</p>}
                <a href={m.teamsUrl} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none', marginTop: 10, display: 'inline-flex' }}>
                  Join Session
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-sm" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No training sessions scheduled right now.
          </div>
        )}
      </section>

      {/* Quick Access Tools */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Quick Access Tools</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* GHL CRM tile with OAuth gate */}
          <a href={crmHref} target={crmFresh && hub?.crm.hasApprovedAccess ? '_blank' : '_self'} rel="noopener" className="card-sm" style={{ padding: 0, textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#f6f4ef', position: 'relative' }}>
              <img src={CRM_IMAGE_URL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span className="badge" style={{
                position: 'absolute', top: 8, right: 8,
                background: crmFresh && hub?.crm.hasApprovedAccess ? 'rgba(46,154,85,0.95)' : 'rgba(13,148,136,0.95)',
                color: '#fff',
                fontSize: 10,
              }}>
                {crmLabel}
              </span>
            </div>
            <div style={{ padding: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>OnePoint CRM</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>GoHighLevel</p>
            </div>
          </a>

          {QUICK_TOOLS.map(tool => (
            <a key={tool.name} href={tool.url} target="_blank" rel="noopener" className="card-sm" style={{ padding: 0, textDecoration: 'none', overflow: 'hidden' }}>
              <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#f6f4ef' }}>
                <img src={tool.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ padding: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{tool.name}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Open tool →</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Recent Documents + Upcoming Events side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }} className="grid-2">
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Recent Documents</h2>
            <Link href="/employee/dashboard/documents" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>All documents →</Link>
          </div>
          {hub?.documents.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hub.documents.slice(0, 5).map(d => (
                <a key={d._id} href={d.url} target="_blank" rel="noopener" className="card-sm" style={{ padding: 12, textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--subtle)' }}>
                      {d.category} · {formatDateShort(d.postedAt)}
                    </p>
                  </div>
                  <svg style={{ width: 16, height: 16, color: 'var(--subtle)', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                  </svg>
                </a>
              ))}
            </div>
          ) : (
            <div className="card-sm" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No documents posted yet.
            </div>
          )}
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Upcoming Birthdays &amp; Events</h2>
            <Link href="/employee/dashboard/events" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>See all →</Link>
          </div>
          {hub?.events.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hub.events.slice(0, 5).map(ev => (
                <div key={ev._id} className="card-sm" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, textAlign: 'center', background: 'var(--surface)', padding: '6px 4px', borderRadius: 4, flexShrink: 0 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.08em' }}>{formatEventMonth(ev.date)}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{formatEventDay(ev.date)}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{ev.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                      {ev.category.replace('_', ' ')}{ev.timeLabel ? ` · ${ev.timeLabel}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-sm" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No upcoming events.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
