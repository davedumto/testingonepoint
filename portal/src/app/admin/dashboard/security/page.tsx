'use client';

import { useEffect, useState } from 'react';

interface AnomalyData {
  newIpLogins: { count: number; items: { userId: string; userEmail: string; ip: string; timestamp: string }[] };
  crossAccountAttacks: { count: number; items: { ip: string; accounts: string[]; count: number }[] };
  orphanedSessions: { count: number; items: { userId: string; userEmail: string; userName: string; loginAt: string }[] };
  oauthBursts: { count: number; items: { userId: string; count: number }[] };
  flaggedSessions: { count: number; items: { userId: string; userEmail: string; userName: string; loginAt: string; flagReason: string }[] };
}

export default function SecurityDashboard() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/security/anomalies')
      .then(r => { if (!r.ok) throw new Error('Unauthorized'); return r.json(); })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading security data...</p>;
  if (error) return <p style={{ color: '#dc2626', textAlign: 'center', padding: '80px 0' }}>{error}</p>;
  if (!data) return null;

  const sections = [
    {
      title: 'New IP Logins (24h)',
      description: 'Successful logins from IPs not seen in the past 90 days',
      count: data.newIpLogins.count,
      color: data.newIpLogins.count > 0 ? '#dc2626' : 'var(--navy)',
      items: data.newIpLogins.items.map(i => ({
        primary: i.userEmail,
        secondary: `IP: ${i.ip}`,
        time: new Date(i.timestamp).toLocaleString(),
      })),
    },
    {
      title: 'Cross-Account Attacks (10min)',
      description: 'Failed logins from the same IP targeting multiple accounts',
      count: data.crossAccountAttacks.count,
      color: data.crossAccountAttacks.count > 0 ? '#dc2626' : 'var(--navy)',
      items: data.crossAccountAttacks.items.map(i => ({
        primary: `IP: ${i.ip}`,
        secondary: `Targeted ${i.count} accounts: ${i.accounts.join(', ')}`,
        time: '',
      })),
    },
    {
      title: 'Orphaned Sessions (>24h)',
      description: 'Clock-ins without matching clock-outs older than 24 hours',
      count: data.orphanedSessions.count,
      color: data.orphanedSessions.count > 0 ? '#e8821a' : 'var(--navy)',
      items: data.orphanedSessions.items.map(i => ({
        primary: i.userName || i.userEmail,
        secondary: i.userEmail,
        time: `Clocked in: ${new Date(i.loginAt).toLocaleString()}`,
      })),
    },
    {
      title: 'OAuth Bursts (60s)',
      description: '5+ OAuth authentications within 60 seconds for a single employee',
      count: data.oauthBursts.count,
      color: data.oauthBursts.count > 0 ? '#dc2626' : 'var(--navy)',
      items: data.oauthBursts.items.map(i => ({
        primary: `User: ${i.userId}`,
        secondary: `${i.count} authentications in 60 seconds`,
        time: '',
      })),
    },
    {
      title: 'Flagged Sessions (7 days)',
      description: 'Clock events outside normal business hours or on weekends',
      count: data.flaggedSessions.count,
      color: data.flaggedSessions.count > 0 ? '#e8821a' : 'var(--navy)',
      items: data.flaggedSessions.items.map(i => ({
        primary: i.userName || i.userEmail,
        secondary: i.flagReason,
        time: new Date(i.loginAt).toLocaleString(),
      })),
    },
  ];

  const totalAnomalies = sections.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Security Anomalies</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
        Real-time anomaly detection across authentication, time tracking, and OAuth.
        {totalAnomalies > 0 ? ` ${totalAnomalies} anomalies detected.` : ' No anomalies detected.'}
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 32 }}>
        {sections.map(s => (
          <div key={s.title} className="card-sm" style={{ textAlign: 'center' }}>
            <p className="label" style={{ marginBottom: 4, fontSize: 10 }}>{s.title.split('(')[0].trim()}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Detail sections */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 4 }}>{section.title}</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{section.description}</p>

          {section.items.length === 0 ? (
            <div className="card-sm" style={{ padding: 20, textAlign: 'center' }}>
              <p style={{ color: 'var(--subtle)', fontSize: 13 }}>No anomalies in this category.</p>
            </div>
          ) : (
            section.items.map((item, i) => (
              <div key={i} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4, borderLeft: `3px solid ${section.color}` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{item.primary}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{item.secondary}</p>
                </div>
                {item.time && <p style={{ fontSize: 12, color: 'var(--subtle)', textAlign: 'right' }}>{item.time}</p>}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
