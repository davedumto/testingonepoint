'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); return; }
      router.push('/admin/dashboard');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.webp" alt="OnePoint Insurance Agency" style={{ height: 44, width: 'auto', marginBottom: 16 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>Admin Portal</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>OnePoint Insurance Agency</p>
        </div>

        <form onSubmit={handleSubmit} className="card">
          {error && <div className="alert alert-error">{error}</div>}

          <div style={{ marginBottom: 20 }}>
            <label className="label">Admin Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@onepointinsuranceagency.com" className="input" />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter admin password" className="input" />
          </div>

          <button type="submit" disabled={loading} className="btn btn-navy btn-full">
            {loading ? 'Authenticating...' : 'Sign In to Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
