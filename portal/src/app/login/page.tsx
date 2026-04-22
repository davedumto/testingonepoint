'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Phase = 'identity' | 'code' | 'not-found';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inactiveReason = searchParams.get('reason') === 'inactive';

  const [phase, setPhase] = useState<Phase>('identity');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleIdentity(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      if (data.matched) {
        setPhase('code');
      } else {
        setPhase('not-found');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
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

  async function resendCode() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      if (!data.matched) { setPhase('not-found'); return; }
      setCode('');
      setError('New code sent. Check your email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 16 }}>
          <a href="https://www.onepointinsuranceagency.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to website
          </a>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 74, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>
            {phase === 'code' ? 'Enter your sign-in code' : phase === 'not-found' ? 'We couldn’t find your account' : 'Are you a client?'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
            {phase === 'identity' && 'Enter your name and email and we’ll look up your details.'}
            {phase === 'code' && `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
            {phase === 'not-found' && 'Your details aren’t in our system yet.'}
          </p>
        </div>

        {inactiveReason && phase === 'identity' && (
          <div className="alert" style={{ background: 'rgba(13,148,136,0.08)', color: 'var(--navy)', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
            You were signed out after 20 minutes of inactivity. Sign in again to continue.
          </div>
        )}

        {phase === 'identity' && (
          <form onSubmit={handleIdentity} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="name" className="label">Full name</label>
              <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="input" placeholder="First Last" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="email" className="label">Email address</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-navy btn-full">
              {loading ? 'Looking up…' : 'Continue'}
            </button>

            <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
              We’ll email you a one-time code to sign in. No password needed.
            </p>
          </form>
        )}

        {phase === 'code' && (
          <form onSubmit={handleVerify} className="card">
            {error && (
              <div className={error.toLowerCase().includes('new code') ? 'alert alert-success' : 'alert alert-error'}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="code" className="label">6-digit code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                autoComplete="one-time-code"
                className="input"
                placeholder="000000"
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.3em', fontWeight: 700 }}
              />
            </div>

            <button type="submit" disabled={loading || code.length !== 6} className="btn btn-navy btn-full">
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button type="button" onClick={() => { setPhase('identity'); setCode(''); setError(''); }} style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ← Use different details
              </button>
              <button type="button" onClick={resendCode} disabled={loading} style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Resend code
              </button>
            </div>
          </form>
        )}

        {phase === 'not-found' && (
          <div className="card">
            <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 16 }}>
              We couldn’t match that name and email to a client account. The portal is for current OnePoint clients only.
            </p>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
              Ready to become a client? Book a call with a licensed advisor, we’ll build your coverage and set up your portal.
            </p>
            <a href="https://www.onepointinsuranceagency.com/book" className="btn btn-navy btn-full" style={{ marginBottom: 10 }}>
              Book a call
            </a>
            <a href="tel:888-899-8117" className="btn btn-outline btn-full">
              Call 888-899-8117
            </a>
            <button type="button" onClick={() => { setPhase('identity'); setError(''); }} style={{ width: '100%', marginTop: 16, padding: 8, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              Try a different name or email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
