'use client';

const TOOLS = [
  { name: 'Quote Forms', description: 'Run quotes across carriers', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Quote-Forms.aspx', color: '#0d9488' },
  { name: 'Tech Tools', description: 'Internal tooling and utilities', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tech-Tools.aspx', color: '#7c3aed' },
  { name: 'Client Tools', description: 'Service desk + resources', url: 'https://onepointinsuranceagency.sharepoint.com/sites/OnePointTeamHub/SitePages/Tools-%26-Resources.aspx', color: '#0a7d63' },
  { name: 'Imagine — Grok', description: 'AI assistant for research', url: 'https://grok.com', color: '#000000' },
  { name: 'My LastPass Vault', description: 'Shared credential vault', url: 'https://lastpass.com/vault', color: '#d32d27' },
  { name: 'OnePoint CRM', description: 'GoHighLevel client workspace', url: 'http://app.innovateihub.com/', color: '#0d9488' },
  { name: 'Microsoft Teams', description: 'Team chat and meetings', url: 'https://teams.cloud.microsoft/', color: '#5059c9' },
  { name: 'Outlook', description: 'Email and calendar', url: 'https://outlook.cloud.microsoft/mail/', color: '#0078d4' },
];

export default function ToolsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Tools &amp; Resources</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        All the tools you use day-to-day. Click any tile to open it in a new tab.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {TOOLS.map(tool => (
          <a key={tool.name} href={tool.url} target="_blank" rel="noopener" className="card" style={{ padding: 20, textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: tool.color }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{tool.name}</p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{tool.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
