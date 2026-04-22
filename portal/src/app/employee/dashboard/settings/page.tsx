'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';

const ALLOWED_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Africa/Lagos',
  'Europe/London',
  'UTC',
];

type SetupFlow = 'idle' | 'scanning' | 'showing-codes';

export default function EmployeeSettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 2FA state
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [setupFlow, setSetupFlow] = useState<SetupFlow>('idle');
  const [qrCode, setQrCode] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [disableToken, setDisableToken] = useState('');

  function refreshMe() {
    return fetch('/api/employee/auth/me').then(r => r.json()).then(d => {
      if (d.employee) {
        setName(d.employee.name || '');
        setEmail(d.employee.email || '');
        if (d.employee.timezone) setTimezone(d.employee.timezone);
        setTwoFaEnabled(!!d.employee.twoFactorEnabled);
        setBackupCodesRemaining(d.employee.backupCodesRemaining || 0);
      }
    });
  }

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, []);

  async function startTwoFaSetup() {
    setTwoFaBusy(true);
    try {
      const res = await secureFetch('/api/employee/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Setup failed.', type: 'error' }); return; }
      setQrCode(data.qrCode);
      setSetupSecret(data.secret);
      setSetupToken('');
      setSetupFlow('scanning');
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function verifyTwoFaSetup() {
    if (setupToken.length !== 6) return;
    setTwoFaBusy(true);
    try {
      const res = await secureFetch('/api/employee/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: setupToken }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Invalid code.', type: 'error' }); return; }
      setBackupCodes(data.backupCodes || []);
      setSetupFlow('showing-codes');
      await refreshMe();
    } finally {
      setTwoFaBusy(false);
    }
  }

  function finishTwoFaSetup() {
    setSetupFlow('idle');
    setQrCode('');
    setSetupSecret('');
    setSetupToken('');
    setBackupCodes([]);
    setToast({ message: 'Two-factor authentication enabled.', type: 'success' });
  }

  async function disableTwoFa(e: React.FormEvent) {
    e.preventDefault();
    setTwoFaBusy(true);
    try {
      const res = await secureFetch('/api/employee/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePwd, token: disableToken }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Failed.', type: 'error' }); return; }
      setShowDisableForm(false);
      setDisablePwd('');
      setDisableToken('');
      setToast({ message: 'Two-factor authentication disabled.', type: 'success' });
      await refreshMe();
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await secureFetch('/api/employee/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, timezone }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error, type: 'error' }); return; }
      setToast({ message: 'Profile updated.', type: 'success' });
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
      const res = await secureFetch('/api/employee/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error, type: 'error' }); return; }
      setToast({ message: 'Password changed.', type: 'success' });
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Account Settings</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Update your name, timezone, and password. Contact your admin to change your email.</p>

      {/* Profile */}
      <form onSubmit={handleProfileUpdate} className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Profile</h2>

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

        <div style={{ marginBottom: 20 }}>
          <label className="label">Work Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="input"
            style={{ opacity: 0.7, cursor: 'not-allowed' }}
          />
          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
            Email is managed by your administrator. Contact them to change it.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="label">Timezone</label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="input"
          >
            {ALLOWED_TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>
            Controls your shift hours and time-tracking windows.
          </p>
        </div>

        <button type="submit" disabled={savingProfile} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Two-Factor Authentication */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Two-Factor Authentication</h2>
          {twoFaEnabled && (
            <span className="badge" style={{ background: 'rgba(46,154,85,0.1)', color: '#2e9a55' }}>Enabled</span>
          )}
        </div>

        {setupFlow === 'idle' && !twoFaEnabled && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Add a second layer of protection. Requires an authenticator app like Google Authenticator, Authy, or 1Password.
            </p>
            <button type="button" onClick={startTwoFaSetup} disabled={twoFaBusy} className="btn btn-navy" style={{ padding: '10px 20px' }}>
              {twoFaBusy ? 'Starting...' : 'Enable Two-Factor'}
            </button>
          </>
        )}

        {setupFlow === 'scanning' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              1. Scan this QR code with your authenticator app.<br />
              2. Enter the 6-digit code it displays to confirm.
            </p>
            {qrCode && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img src={qrCode} alt="2FA QR code" style={{ width: 200, height: 200 }} />
              </div>
            )}
            <div style={{ background: 'var(--surface)', padding: '10px 14px', fontSize: 12, color: 'var(--muted)', marginBottom: 16, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              Can&apos;t scan? Enter this key manually: <strong style={{ color: 'var(--navy)' }}>{setupSecret}</strong>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={setupToken}
              onChange={e => setSetupToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="input"
              style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.3em', fontWeight: 700, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setSetupFlow('idle')} className="btn btn-outline" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="button" onClick={verifyTwoFaSetup} disabled={twoFaBusy || setupToken.length !== 6} className="btn btn-navy" style={{ flex: 1 }}>
                {twoFaBusy ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}

        {setupFlow === 'showing-codes' && (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Two-factor authentication is now active.
            </div>
            <p style={{ fontSize: 13, color: 'var(--navy)', marginBottom: 8, fontWeight: 600 }}>
              Save these backup codes somewhere safe. Each one works once if you lose access to your authenticator app. <strong>They will not be shown again.</strong>
            </p>
            <div style={{ background: 'var(--surface)', padding: 16, marginBottom: 16, fontFamily: 'monospace', fontSize: 14, lineHeight: 1.8 }}>
              {backupCodes.map(c => <div key={c}>{c}</div>)}
            </div>
            <button type="button" onClick={finishTwoFaSetup} className="btn btn-navy btn-full">
              I&apos;ve saved my codes
            </button>
          </div>
        )}

        {setupFlow === 'idle' && twoFaEnabled && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
              You&apos;re protected with two-factor authentication. {backupCodesRemaining} backup code{backupCodesRemaining === 1 ? '' : 's'} remaining.
            </p>
            {!showDisableForm ? (
              <button type="button" onClick={() => setShowDisableForm(true)} className="btn btn-outline" style={{ padding: '10px 20px', color: 'var(--red)', borderColor: 'var(--red)' }}>
                Disable Two-Factor
              </button>
            ) : (
              <form onSubmit={disableTwoFa}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                  Confirm with your password and current authenticator code to disable.
                </p>
                <div style={{ marginBottom: 12 }}>
                  <label className="label">Password</label>
                  <input type="password" value={disablePwd} onChange={e => setDisablePwd(e.target.value)} required className="input" placeholder="Your password" autoComplete="current-password" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="label">Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={disableToken}
                    onChange={e => setDisableToken(e.target.value.replace(/\D/g, ''))}
                    required
                    className="input"
                    style={{ textAlign: 'center', letterSpacing: '0.3em' }}
                    placeholder="000000"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => { setShowDisableForm(false); setDisablePwd(''); setDisableToken(''); }} className="btn btn-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={twoFaBusy || disableToken.length !== 6 || !disablePwd} className="btn" style={{ flex: 1, background: 'var(--red)', color: '#fff' }}>
                    {twoFaBusy ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Change Password</h2>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
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
            autoComplete="new-password"
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
            autoComplete="new-password"
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
