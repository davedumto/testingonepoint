'use client';

import { useState } from 'react';
import { IconCheck } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';

export default function AdminPage() {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function handleImport() {
    if (!csvText.trim()) { setError('No CSV data to import.'); return; }
    setError(''); setResult(null); setLoading(true);

    try {
      const res = await secureFetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Import failed.'); return; }
      setResult(data);
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Admin — Policy Import</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>
        Import policies exported from GHL. Upload a CSV file or paste the data directly.
      </p>

      {/* Instructions */}
      <div className="card" style={{ marginBottom: 24, background: 'rgba(13,148,136,0.04)', borderColor: 'var(--teal)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>CSV Format Required</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
          The CSV must have a header row with these columns (order doesn&apos;t matter):
        </p>
        <code style={{ display: 'block', background: 'var(--card)', border: '1px solid var(--line)', padding: 12, fontSize: 13, color: 'var(--navy)', fontFamily: 'monospace', overflowX: 'auto' }}>
          email, product_name, product_category, carrier, policy_number, status, start_date, end_date, premium
        </code>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12, lineHeight: 1.6 }}>
          <strong>product_category</strong> must be one of: auto, home, health, life, disability, business<br />
          <strong>status</strong> must be one of: active, pending, expired, cancelled<br />
          <strong>email</strong> must match a registered portal user — unmatched rows will be skipped
        </p>
      </div>

      {/* Upload */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="label" style={{ marginBottom: 16 }}>Step 1: Upload CSV or paste data</h3>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--navy)', color: '#fff', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}>
            Choose CSV File
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          {csvText && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>File loaded ({csvText.split('\n').length - 1} rows)</span>}
        </div>

        <p style={{ fontSize: 12, color: 'var(--subtle)', marginBottom: 8 }}>Or paste CSV data directly:</p>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={10}
          placeholder="email,product_name,product_category,carrier,policy_number,status,start_date,end_date,premium
john@example.com,Auto Insurance,auto,Progressive,POL-12345,active,2025-01-01,2026-01-01,150
jane@example.com,Homeowners,home,Travelers,POL-67890,active,2025-03-15,2026-03-15,95"
          className="input"
          style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical', minHeight: 180 }}
        />
      </div>

      {/* Import button */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="label" style={{ marginBottom: 16 }}>Step 2: Run import</h3>

        {error && <div className="alert alert-error">{error}</div>}

        {result && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <IconCheck style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Import complete.</strong> {result.imported} imported, {result.skipped} skipped.
              {result.errors.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>View {result.errors.length} errors</summary>
                  <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                    {result.errors.map((err, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="btn btn-navy"
          style={{ opacity: loading || !csvText.trim() ? 0.5 : 1 }}
        >
          {loading ? 'Importing...' : 'Import Policies'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12, lineHeight: 1.6 }}>
          Existing policies (matched by user email + policy number) will be updated. New policies will be created.
          Only users with registered portal accounts will be matched.
        </p>
      </div>

      {/* Sample CSV */}
      <div className="card-sm">
        <h3 className="label" style={{ marginBottom: 12 }}>Sample CSV</h3>
        <pre style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 16, fontSize: 12, color: 'var(--ink)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8 }}>
{`email,product_name,product_category,carrier,policy_number,status,start_date,end_date,premium
john@example.com,Auto Insurance,auto,Progressive,POL-001,active,2025-01-01,2026-01-01,150
john@example.com,Homeowners,home,Travelers,POL-002,active,2025-03-15,2026-03-15,95
jane@example.com,Term Life,life,Mutual of Omaha,POL-003,active,2025-06-01,2045-06-01,28
jane@example.com,Dental,health,Ameritas,POL-004,active,2025-01-01,2026-01-01,35`}
        </pre>
      </div>
    </div>
  );
}
