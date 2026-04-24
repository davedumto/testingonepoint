'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import TierBadge from '@/components/TierBadge';
import { secureFetch } from '@/lib/client/secure-fetch';
import type { ClientTier, PreferredContact } from '@/lib/tier-meta';

interface AddressForm { street: string; city: string; state: string; zip: string; }

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  address: AddressForm;
  preferredContact: PreferredContact | '';
  businessName: string;
}

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: { street: '', city: '', state: '', zip: '' },
  preferredContact: '',
  businessName: '',
};

// YYYY-MM-DD slice from an ISO date string. Empty string if no date.
function isoToInputDate(iso?: string | Date): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [tier, setTier] = useState<ClientTier | undefined>();
  const [assignedAgent, setAssignedAgent] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) return;
        const u = d.user;
        // Prefer canonical firstName/lastName; fall back to splitting `name`
        // for legacy records that haven't been updated since the schema split.
        let fn = u.firstName || '';
        let ln = u.lastName || '';
        if (!fn && u.name) {
          const parts = (u.name as string).trim().split(/\s+/);
          fn = parts[0] || '';
          ln = parts.slice(1).join(' ') || '';
        }
        setForm({
          firstName: fn,
          lastName: ln,
          email: u.email || '',
          phone: u.phone || '',
          dateOfBirth: isoToInputDate(u.dateOfBirth),
          address: {
            street: u.address?.street || '',
            city: u.address?.city || '',
            state: u.address?.state || '',
            zip: u.address?.zip || '',
          },
          preferredContact: u.preferredContact || '',
          businessName: u.businessName || '',
        });
        setTier(u.tier);
        setAssignedAgent(u.assignedAgent);
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  function updateAddress<K extends keyof AddressForm>(key: K, value: string) {
    setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await secureFetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          preferredContact: form.preferredContact || undefined,
          businessName: form.businessName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Could not save.', type: 'error' }); return; }
      setToast({ message: 'Profile saved.', type: 'success' });
    } catch {
      setToast({ message: 'Something went wrong.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 720 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginBottom: 6, letterSpacing: '-0.01em' }}>Account Settings</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Keep your profile up to date so we can serve you better.</p>
      </div>

      {(tier || assignedAgent) && (
        <div className="card" style={{ marginBottom: 24, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {tier && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 6 }}>Your Tier</p>
              <TierBadge tier={tier} size="lg" />
            </div>
          )}
          {assignedAgent && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 6 }}>Your Agent</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', textTransform: 'capitalize' }}>{assignedAgent}</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal info */}
        <section className="card" style={{ marginBottom: 20, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 18 }}>Personal Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label className="label">First name</label>
              <input type="text" required className="input" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input type="text" className="input" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Email</label>
            <input type="email" required className="input" value={form.email} onChange={e => update('email', e.target.value)} />
            <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 6 }}>This is your sign-in identifier.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="(555) 123-4567" value={form.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input type="date" className="input" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="card" style={{ marginBottom: 20, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 18 }}>Mailing Address</h2>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Street</label>
            <input type="text" className="input" value={form.address.street} onChange={e => updateAddress('street', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">City</label>
              <input type="text" className="input" value={form.address.city} onChange={e => updateAddress('city', e.target.value)} />
            </div>
            <div>
              <label className="label">State</label>
              <input type="text" className="input" maxLength={2} placeholder="GA" value={form.address.state} onChange={e => updateAddress('state', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">ZIP</label>
              <input type="text" className="input" maxLength={10} value={form.address.zip} onChange={e => updateAddress('zip', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="card" style={{ marginBottom: 20, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 18 }}>Contact Preferences</h2>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Preferred contact method</label>
            <select className="input" value={form.preferredContact} onChange={e => update('preferredContact', e.target.value as ProfileForm['preferredContact'])}>
              <option value="">No preference</option>
              <option value="call">Phone call</option>
              <option value="text">Text message</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="label">Business name (optional)</label>
            <input type="text" className="input" placeholder="If you're a commercial client" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '12px 28px' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="card" style={{ maxWidth: 560, marginTop: 28, padding: 22 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Sign-in</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Your portal uses email sign-in codes — no password to remember. Each time you sign in, we email you a new 6-digit code.
        </p>
      </div>
    </div>
  );
}
