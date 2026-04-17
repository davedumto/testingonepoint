'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) return (
    <div className="card" style={{ textAlign: 'center' }}>
      <p style={{ color: 'var(--red)', fontWeight: 500 }}>Invalid reset link.</p>
      <Link href="/forgot-password" style={{ display: 'inline-block', marginTop: 16, fontSize: 14, fontWeight: 600, color: 'var(--teal)' }}>Request new link</Link>
    </div>
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Reset failed.'); return; }
      setSuccess(true); setTimeout(() => router.push('/login'), 3000);
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: 'rgba(46,154,85,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ width: 32, height: 32, color: 'var(--green)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Password reset!</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Redirecting to sign in...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="card">
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: 20 }}>
        <label className="label">New password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="At least 8 characters" />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label className="label">Confirm new password</label>
        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="input" placeholder="Repeat your password" />
      </div>
      <button type="submit" disabled={loading} className="btn btn-navy btn-full">{loading ? 'Resetting...' : 'Reset Password'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 44, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Choose a new password</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Make sure it&apos;s at least 8 characters</p>
        </div>
        <Suspense fallback={<div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
