'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

export default function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match.', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ message: 'Password must be at least 8 characters.', type: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await secureFetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error, type: 'error' }); return; }
      setToast({ message: 'Password changed successfully.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading...</p>;

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Account Settings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Update your personal information and password.</p>

      {/* Profile Section */}
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
            onChange={e => setEmail(e.target.value)}
            required
            className="input"
            placeholder="you@example.com"
          />
          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
            Changing your email will update your login credentials.
          </p>
        </div>

        <button type="submit" disabled={savingProfile} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Password Section */}
      <form onSubmit={handlePasswordChange} className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Change Password</h2>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            className="input"
            placeholder="Enter current password"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="label">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            className="input"
            placeholder="Repeat new password"
          />
        </div>

        <button type="submit" disabled={savingPassword} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {savingPassword ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
