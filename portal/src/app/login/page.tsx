'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }

      if (data.requires2FA) {
        setRequires2FA(true);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTOTP(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed.'); return; }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 16 }}>
          <a href="https://www.onepointinsuranceagency.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to website
          </a>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 74, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>
            {requires2FA ? 'Two-Factor Verification' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            {requires2FA ? 'Enter the 6-digit code from your authenticator app' : 'Sign in to your client portal'}
          </p>
        </div>

        {!requires2FA ? (
          <form onSubmit={handleSubmit} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="input" placeholder="Enter your password" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <Link href="/forgot-password" style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="btn btn-navy btn-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTOTP} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ padding: '12px 16px', background: 'rgba(13,148,136,0.06)', marginBottom: 20, fontSize: 13, color: 'var(--navy)', lineHeight: 1.5 }}>
              Signing in as <strong>{email}</strong>. Open your authenticator app and enter the current code.
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="totp" className="label">Authentication Code</label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="input"
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em', fontWeight: 700 }}
              />
            </div>

            <button type="submit" disabled={loading || totpCode.length !== 6} className="btn btn-navy btn-full">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button type="button" onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              ← Back to login
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ fontWeight: 600, color: 'var(--navy)' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
