'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Phase = 'email' | 'setup' | 'login' | 'totp';

function EyeIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: 18, height: 18, ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ width: 18, height: 18, ...style }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className="input"
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{ paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          padding: 4, display: 'flex', alignItems: 'center',
        }}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function checkEmail(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/employee/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phase: 'check' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Email not recognized.');
        return;
      }

      if (data.status === 'needs_setup') {
        setPhase('setup');
      } else if (data.status === 'has_password') {
        setPhase('login');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function setupPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/employee/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Setup failed.'); return; }
      router.push('/employee/dashboard');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/employee/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Login failed.'); return; }

      if (data.requires2FA) {
        setPhase('totp');
        setPassword('');
        return;
      }

      router.push('/employee/dashboard');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/employee/auth/2fa/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed.'); return; }
      router.push('/employee/dashboard');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 44, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>
            {phase === 'totp' ? 'Two-Factor Verification' : 'Employee Portal'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            {phase === 'email' && 'Enter your work email to get started'}
            {phase === 'setup' && 'Set up your password to activate your account'}
            {phase === 'login' && 'Enter your password to sign in'}
            {phase === 'totp' && 'Enter the 6-digit code from your authenticator or a backup code'}
          </p>
        </div>

        {/* Phase 1: Email check */}
        {phase === 'email' && (
          <form onSubmit={checkEmail} className="card">
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ marginBottom: 24 }}>
              <label className="label">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input"
                placeholder="you@onepointinsuranceagency.com"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-navy btn-full">
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Phase 2: Password setup (first time) */}
        {phase === 'setup' && (
          <form onSubmit={setupPassword} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ padding: '12px 16px', background: 'rgba(13,148,136,0.06)', marginBottom: 20, fontSize: 13, color: 'var(--navy)', lineHeight: 1.5 }}>
              Welcome! Your admin has added <strong>{email}</strong>. Set up your password to activate your account.
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Your Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input" placeholder="Your full name" autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Create Password</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="At least 8 characters" />
              {password.length > 0 && password.length < 8 && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>Password must be at least 8 characters</p>
              )}
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Confirm Password</label>
              <PasswordInput value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" />
              {passwordsMatch && (
                <p style={{ fontSize: 12, color: '#2e9a55', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Passwords match
                </p>
              )}
              {passwordsMismatch && (
                <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Passwords do not match
                </p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn btn-navy btn-full">
              {loading ? 'Setting up...' : 'Activate Account'}
            </button>
            <button type="button" onClick={() => { setPhase('email'); setError(''); }} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              ← Use a different email
            </button>
          </form>
        )}

        {/* Phase 3: Login (returning employee) */}
        {phase === 'login' && (
          <form onSubmit={login} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ padding: '12px 16px', background: 'var(--surface)', marginBottom: 20, fontSize: 13, color: 'var(--navy)' }}>
              Signing in as <strong>{email}</strong>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Password</label>
              <PasswordInput value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" autoFocus />
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <Link href="/employee/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal)' }}>Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-navy btn-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => { setPhase('email'); setError(''); setPassword(''); }} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              ← Use a different email
            </button>
          </form>
        )}

        {/* Phase 4: TOTP verification */}
        {phase === 'totp' && (
          <form onSubmit={verifyTotp} className="card">
            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ padding: '12px 16px', background: 'rgba(13,148,136,0.06)', marginBottom: 20, fontSize: 13, color: 'var(--navy)', lineHeight: 1.5 }}>
              Signing in as <strong>{email}</strong>. Open your authenticator app and enter the current code, or use one of your backup codes.
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label">Authentication Code</label>
              <input
                type="text"
                inputMode="text"
                maxLength={12}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                required
                autoFocus
                className="input"
                placeholder="000000 or XXXX-XXXX"
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.2em', fontWeight: 700 }}
                autoComplete="one-time-code"
              />
            </div>

            <button type="submit" disabled={loading || totpCode.trim().length < 6} className="btn btn-navy btn-full">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button type="button" onClick={() => { setPhase('email'); setError(''); setTotpCode(''); }} style={{ width: '100%', marginTop: 12, padding: 10, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
