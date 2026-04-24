'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatDate, formatMonthDay } from '@/lib/client/format-time';

interface ProfileData {
  _id: string;
  email: string;
  name?: string;
  jobTitle?: string;
  department?: string;
  bio?: string;
  photoUrl?: string;
  phone?: string;
  birthday?: string;
  hireDate?: string;
  timezone?: string;
  addedAt?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  shareEmergencyContactWithTeam: boolean;
  isSelf: boolean;
}

function tenureLabel(hireDate?: string, addedAt?: string): string | null {
  const start = hireDate ? new Date(hireDate) : addedAt ? new Date(addedAt) : null;
  if (!start) return null;
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years < 1) {
    const months = Math.floor((Date.now() - start.getTime()) / (30 * 24 * 60 * 60 * 1000));
    if (months <= 0) return 'Just joined';
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${years} year${years > 1 ? 's' : ''}`;
}

function initials(name?: string, email?: string) {
  const source = name || email || '';
  return source.split(' ').map(s => s[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '•';
}

export default function ProfileViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEotm, setIsEotm] = useState(false);

  useEffect(() => {
    fetch(`/employee/api/directory?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setProfile(d.employee);
      })
      .finally(() => setLoading(false));

    fetch('/employee/api/recognition/active')
      .then(r => (r.ok ? r.json() : { active: null }))
      .then(({ active }) => { if (active?.employeeId === id) setIsEotm(true); })
      .catch(() => {});
  }, [id]);

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;
  if (error || !profile) return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 20, textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>{error || 'Employee not found.'}</p>
      <Link href="/employee/dashboard/directory" style={{ color: 'var(--blue)', fontWeight: 600 }}>← Back to directory</Link>
    </div>
  );

  const tenure = tenureLabel(profile.hireDate, profile.addedAt);
  const showEC = profile.emergencyContactName || profile.emergencyContactPhone;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/directory" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>← Back to directory</Link>

      <div className="card" style={{ padding: 28, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name || ''} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
                {initials(profile.name, profile.email)}
              </div>
            )}
            {isEotm && (
              <span
                title="Employee of the Month"
                aria-label="Employee of the Month"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f5d76e 0%, #e8c74e 60%, #b8901e 100%)',
                  border: '3px solid #fff',
                  boxShadow: '0 3px 10px rgba(232,199,78,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                🏆
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{profile.name || profile.email}</h1>
            {profile.jobTitle && <p style={{ fontSize: 15, color: 'var(--ink)', marginTop: 4 }}>{profile.jobTitle}</p>}
            {profile.department && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{profile.department}</p>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {isEotm && (
                <span
                  className="badge"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,215,110,0.25) 0%, rgba(232,199,78,0.25) 100%)',
                    color: '#8a5a00',
                    border: '1px solid rgba(184,144,30,0.4)',
                    fontWeight: 700,
                  }}
                >
                  🏆 Employee of the Month
                </span>
              )}
              {tenure && <span className="badge badge-blue">🏅 {tenure}</span>}
              {profile.timezone && <span className="badge badge-navy">{profile.timezone}</span>}
              {profile.isSelf && <span className="badge badge-blue">You</span>}
            </div>
          </div>
          {profile.isSelf && (
            <Link href="/employee/dashboard/profile" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>
              Edit profile
            </Link>
          )}
        </div>

        {profile.bio && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 6 }}>About</p>
            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid-2">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Email</p>
            <p style={{ fontSize: 13, color: 'var(--ink)' }}>{profile.email}</p>
          </div>
          {profile.phone && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Phone</p>
              <p style={{ fontSize: 13, color: 'var(--ink)' }}>{profile.phone}</p>
            </div>
          )}
          {profile.hireDate && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Hire date</p>
              <p style={{ fontSize: 13, color: 'var(--ink)' }}>{formatDate(profile.hireDate)}</p>
            </div>
          )}
          {profile.birthday && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 4 }}>Birthday</p>
              <p style={{ fontSize: 13, color: 'var(--ink)' }}>{formatMonthDay(profile.birthday)}</p>
            </div>
          )}
        </div>

        {showEC && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>
              Emergency Contact {profile.isSelf && '(visible to you + admins only)'}
            </p>
            {profile.emergencyContactName && <p style={{ fontSize: 13, color: 'var(--ink)' }}>{profile.emergencyContactName}{profile.emergencyContactRelation ? ` (${profile.emergencyContactRelation})` : ''}</p>}
            {profile.emergencyContactPhone && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{profile.emergencyContactPhone}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
