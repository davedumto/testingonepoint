'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function EmployeeForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/employee/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error'); return; }
      setSent(true);
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 44, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Reset your password</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>We&apos;ll send a link to your work email</p>
        </div>

        {sent ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: 'rgba(46,154,85,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 32, height: 32, color: 'var(--green)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>If an employee account with <strong style={{ color: 'var(--ink)' }}>{email}</strong> exists, we sent a reset link. Expires in 15 minutes.</p>
            <Link href="/employee/login" style={{ display: 'inline-block', marginTop: 24, fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card">
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ marginBottom: 24 }}>
              <label className="label">Work email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@onepointinsuranceagency.com" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-navy btn-full">{loading ? 'Sending...' : 'Send Reset Link'}</button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted)' }}>
          Remember your password?{' '}<Link href="/employee/login" style={{ fontWeight: 600, color: 'var(--navy)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
