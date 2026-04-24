'use client';

import { useEffect, useState } from 'react';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const HERO_BG = `${MARKETING_BASE}/working.jpg`;

// Image-led tool tiles, using the same filesafe CDN assets as the Team Hub's
// Quick Access block so the visual language stays consistent.
const TOOLS = [
  { name: 'Quote Forms', description: 'Run quotes across carriers', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Quote-Forms.aspx', imageUrl: 'https://media.akamai.odsp.cdn.office.net/southcentralus1-mediap.svc.ms/transform/thumbnail?provider=url&inputFormat=jpg&docid=https%3A%2F%2Fcdn.hubblecontent.osi.office.net%2Fm365content%2Fpublish%2Fe8d814a4-baa6-4c1e-82e6-f03a10350289%2F678822401.jpg&w=400' },
  { name: 'Tech Tools', description: 'Internal tooling and utilities', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tech-Tools.aspx', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322a38e07b348488dea5.png' },
  { name: 'Client Tools', description: 'Service desk and resources', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tools-%26-Resources.aspx', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322b9ff45b49cc916125.png' },
  { name: 'Imagine, Grok', description: 'AI assistant for research', url: 'https://grok.com', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69eb916eb0e5e2bb7f6f317b.png' },
  { name: 'My LastPass Vault', description: 'Shared credential vault', url: 'https://lastpass.com/vault', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e93498a1636a6c6547a3a3.png' },
  { name: 'OnePoint CRM', description: 'GoHighLevel client workspace', url: 'http://app.innovateihub.com/', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e9322a717d5dd4e123759b.png' },
  { name: 'Microsoft Teams', description: 'Team chat and meetings', url: 'https://teams.cloud.microsoft/', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e93498b0e5e2bb7fe92615.png' },
  { name: 'Microsoft Loop', description: 'Docs and project pages', url: 'https://loop.cloud.microsoft/', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69eb916e0d66f2a665df0105.png' },
  { name: 'Outlook', description: 'Email and calendar', url: 'https://outlook.cloud.microsoft/mail/', imageUrl: 'https://assets.cdn.filesafe.space/HJjN5l584XeaaH5Qokj4/media/69e934989ff45b49cc9201f8.png' },
  { name: 'Canva', description: 'Design graphics and social posts', url: 'https://www.canva.com/', imageUrl: 'https://www.google.com/s2/favicons?domain=canva.com&sz=256' },
  { name: 'HyGen', description: 'AI video generation', url: 'https://app.hygen.ai/', imageUrl: 'https://www.google.com/s2/favicons?domain=hygen.ai&sz=256' },
];

export default function ToolsPage() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      {/* Navy hero — matches the Team Hub header band */}
      <div
        className="card-hero-navy"
        style={{ marginBottom: 28, ['--hero-bg' as string]: `url('${HERO_BG}')` }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Your stack</p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
              Tools &amp; Resources
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55 }}>
              Every app you use day to day, one click away. Tiles open in a new tab so you never lose your place.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: 10, minWidth: 140 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tools available</p>
              <p style={{ fontSize: 22, color: '#fff', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>{TOOLS.length}</p>
            </div>
            {now && (
              <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: 10, minWidth: 140 }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Eastern time</p>
                <p style={{ fontSize: 18, color: '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                  {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }).format(now)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section heading to echo the Hub's "Coverage & Products" treatment */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.01em' }}>Quick Access</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Tap any tile to open the app.</p>
          </div>
        </div>

        {/* Image-led cards — 16:9 image header + name/description body. Matches
            the Hub's Quick Access Tools treatment so the portal feels unified. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, alignItems: 'start' }}>
          {TOOLS.map(tool => (
            <a key={tool.name} href={tool.url} target="_blank" rel="noopener" className="card-sm" style={{ padding: 0, textDecoration: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#f6f4ef', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={tool.imageUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <span style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.92)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(5,40,71,0.15)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                  </svg>
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.name}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
