'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setName(d.user.name);
          setEmail(d.user.email);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await secureFetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error, type: 'error' }); return; }
      setToast({ message: 'Profile updated successfully.', type: 'success' });
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Account Settings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Update your name. Your email is on file with your advisor, contact us to change it.</p>

      <form onSubmit={handleProfileUpdate} className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Personal Information</h2>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="input"
            placeholder="Your full name"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Email Address</label>
          <input
            type="email"
            value={email}
            disabled
            className="input"
            style={{ opacity: 0.7, cursor: 'not-allowed' }}
          />
          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
            Your email is your account identifier. To change it, call us at <a href="tel:888-899-8117" style={{ color: 'var(--teal)', fontWeight: 600 }}>888-899-8117</a>.
          </p>
        </div>

        <button type="submit" disabled={savingProfile} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Sign-in</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Your portal uses email sign-in codes, no password to remember. Each time you sign in, we email you a new 6-digit code.
        </p>
      </div>
    </div>
  );
}
