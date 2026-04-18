'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Signup failed.'); return; }
      router.push('/dashboard');
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 16px 48px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 16 }}>
          <a href="https://www.onepointinsuranceagency.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to website
          </a>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 44, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Create your account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Access your client portal and manage your coverage</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ marginBottom: 20 }}>
            <label className="label">Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="input" placeholder="John Doe" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" className="input" placeholder="At least 8 characters" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="label">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="input" placeholder="Repeat your password" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-navy btn-full">{loading ? 'Creating account...' : 'Create Account'}</button>
          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 16, lineHeight: 1.6 }}>By creating an account, you agree to our terms of service and privacy policy.</p>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted)' }}>
          Already have an account?{' '}<Link href="/login" style={{ fontWeight: 600, color: 'var(--navy)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
