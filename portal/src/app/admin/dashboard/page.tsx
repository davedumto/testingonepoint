'use client';

import { useState } from 'react';
import { IconCheck } from '@/components/Icons';
import { secureFetch } from '@/lib/client/secure-fetch';

interface ImportResult {
  imported: number;
  skipped: number;
  usersCreated?: number;
  policiesCreated?: number;
  detectedHeaders?: string[];
  normalizedHeaders?: string[];
  mode?: string;
  errors: string[];
}

export default function AdminPage() {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [createMissingUsers, setCreateMissingUsers] = useState(false);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function handleImport() {
    if (!csvText.trim()) { setError('No CSV data to import.'); return; }
    setError(''); setResult(null); setDetectedHeaders([]); setLoading(true);

    try {
      const res = await secureFetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText, createMissingUsers }),
      });
      const data = await res.json();
      // Even on 400, the API includes detectedHeaders so ops can see what
      // the parser actually picked up — critical for debugging column name mismatches.
      if (data.detectedHeaders) setDetectedHeaders(data.detectedHeaders);
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
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Admin — CSV Import</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>
        Import contacts or policies from a CSV. The parser auto-detects what&apos;s in the file and picks the right mode.
      </p>

      {/* Instructions */}
      <div className="card" style={{ marginBottom: 24, background: 'rgba(13,148,136,0.04)', borderColor: 'var(--teal)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>Required: an email column</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12 }}>
          Header names are flexible — we accept <code>Email</code>, <code>Email Address</code>, <code>Primary Email</code>, etc.
          Same for <code>First Name</code> / <code>Last Name</code> / <code>Full Name</code> / <code>Phone</code>.
        </p>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 8, lineHeight: 1.7 }}>
          <strong>Contact mode</strong> (CSV has no policy columns): creates a <code>client</code> User record per row.<br />
          <strong>Policy mode</strong> (CSV has <code>product_name</code> or <code>policy_number</code>): upserts Policy records. Row is skipped if the client user doesn&apos;t exist — unless you tick &quot;Create missing users&quot; below.<br />
          <strong>Combined mode</strong>: both — one CSV with client info AND policy data.
        </p>
        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 10, lineHeight: 1.7 }}>
          <strong>product_category</strong> must be one of: auto, home, health, life, disability, business<br />
          <strong>status</strong> must be one of: active, pending, expired, cancelled, reinstatement_needed
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

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={createMissingUsers}
            onChange={e => setCreateMissingUsers(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>
            <strong>Create missing client users.</strong> When a row&apos;s email doesn&apos;t match any existing user, create a new <code>client</code> record using that row&apos;s name / phone / business name.
          </span>
        </label>

        {detectedHeaders.length > 0 && (
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(10,61,107,0.05)', border: '1px solid rgba(10,61,107,0.15)', marginBottom: 16, fontSize: 12, color: 'var(--ink)' }}>
            <strong>Parser saw these headers:</strong>{' '}
            {detectedHeaders.map((h, i) => (
              <code key={i} style={{ marginRight: 6, fontSize: 11 }}>{h}</code>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {result && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <IconCheck style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Import complete.</strong> {result.imported} imported, {result.skipped} skipped.
              {result.mode && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>Mode: {result.mode}</span>}
              {(result.usersCreated || 0) > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--green)' }}>
                  · {result.usersCreated} user{result.usersCreated === 1 ? '' : 's'} created
                </span>
              )}
              {(result.policiesCreated || 0) > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--green)' }}>
                  · {result.policiesCreated} polic{result.policiesCreated === 1 ? 'y' : 'ies'} upserted
                </span>
              )}
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
          {loading ? 'Importing...' : 'Import CSV'}
        </button>

        <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12, lineHeight: 1.6 }}>
          Existing records are upserted (Users matched on email, Policies on email+policy number).
        </p>
      </div>

      {/* Sample CSVs */}
      <div className="card-sm" style={{ marginBottom: 16 }}>
        <h3 className="label" style={{ marginBottom: 12 }}>Sample: Contacts only</h3>
        <pre style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 16, fontSize: 12, color: 'var(--ink)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8 }}>
{`First Name,Last Name,Email,Phone,Company
John,Smith,john@example.com,555-0100,
Jane,Doe,jane@example.com,555-0101,Doe LLC`}
        </pre>
      </div>

      <div className="card-sm">
        <h3 className="label" style={{ marginBottom: 12 }}>Sample: Contacts + Policies combined</h3>
        <pre style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: 16, fontSize: 12, color: 'var(--ink)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8 }}>
{`email,first_name,last_name,phone,product_name,product_category,carrier,policy_number,status,start_date,end_date,premium
john@example.com,John,Smith,555-0100,Auto Insurance,auto,Progressive,POL-001,active,2025-01-01,2026-01-01,150
jane@example.com,Jane,Doe,555-0101,Term Life,life,Mutual of Omaha,POL-003,active,2025-06-01,2045-06-01,28`}
        </pre>
      </div>
    </div>
  );
}
