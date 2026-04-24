'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const HERO_BG = `${MARKETING_BASE}/our-team.png`;

interface DirEmployee {
  _id: string;
  name?: string;
  email: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
  bio?: string;
  timezone?: string;
  hireDate?: string;
  addedAt: string;
}

function tenureBadge(hireDate?: string, addedAt?: string): { years: number; label: string; color: string } | null {
  const start = hireDate ? new Date(hireDate) : addedAt ? new Date(addedAt) : null;
  if (!start) return null;
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years < 1) return null;
  // All tenure colours in the brand navy/blue family — the label ("10 yrs")
  // already communicates the milestone; we don't need a rainbow.
  if (years >= 10) return { years, label: `${years} yrs`, color: '#052847' };
  if (years >= 5) return { years, label: `${years} yrs`, color: '#0a3d6b' };
  if (years >= 3) return { years, label: `${years} yrs`, color: '#052847' };
  if (years >= 1) return { years, label: `${years} yr${years > 1 ? 's' : ''}`, color: '#0a3d6b' };
  return null;
}

function initials(name?: string, email?: string) {
  const source = name || email || '';
  return source.split(' ').map(s => s[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '•';
}

export default function DirectoryPage() {
  const [employees, setEmployees] = useState<DirEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eotmEmployeeId, setEotmEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/employee/api/directory')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .finally(() => setLoading(false));

    // Pull the active Employee of the Month so the directory card for the
    // winner can carry a trophy badge. Silent-fail: if the fetch errors, we
    // just don't show a badge.
    fetch('/employee/api/recognition/active')
      .then(r => (r.ok ? r.json() : { active: null }))
      .then(({ active }) => { if (active?.employeeId) setEotmEmployeeId(active.employeeId); })
      .catch(() => {});
  }, []);

  const filtered = employees.filter(e => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (e.name || '').toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.jobTitle || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: 32 }}>
      {/* Navy hero — matches the Team Hub header band */}
      <div
        className="card-hero-navy"
        style={{ marginBottom: 28, ['--hero-bg' as string]: `url('${HERO_BG}')` }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Your teammates</p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
              Team Directory
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55 }}>
              Find colleagues, see tenure and role, and click through to any profile.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px 16px', borderRadius: 10, minWidth: 140 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Teammates</p>
              <p style={{ fontSize: 22, color: '#fff', fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>{employees.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 480 }}>
        <svg style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--subtle)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, email, title, or department…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 60 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>No employees match.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(emp => {
            const badge = tenureBadge(emp.hireDate, emp.addedAt);
            return (
              <Link key={emp._id} href={`/employee/dashboard/directory/${emp._id}`} className="card-sm" style={{ padding: 0, textDecoration: 'none', overflow: 'hidden', display: 'block' }}>
                {/* Navy accent strip sized to let the larger avatar overlap
                    onto the white area below — gives the card a grounded feel
                    without overwhelming the photo. */}
                <div style={{ height: 76, background: 'linear-gradient(135deg, #052847 0%, #0a3d6b 100%)' }} />

                <div style={{ padding: '0 20px 22px', textAlign: 'center' }}>
                  <div style={{ marginTop: -56, marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative' }}>
                      {emp.photoUrl ? (
                        <img
                          src={emp.photoUrl}
                          alt={emp.name || ''}
                          style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 14px rgba(5,40,71,0.22)' }}
                        />
                      ) : (
                        <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#0a3d6b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, border: '4px solid #fff', boxShadow: '0 4px 14px rgba(5,40,71,0.22)' }}>
                          {initials(emp.name, emp.email)}
                        </div>
                      )}
                      {eotmEmployeeId === emp._id && (
                        <span
                          title="Employee of the Month"
                          aria-label="Employee of the Month"
                          style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
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
                  </div>

                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {emp.name || emp.email}
                  </p>
                  {emp.jobTitle && (
                    <p style={{ fontSize: 13, color: 'var(--ink)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.jobTitle}
                    </p>
                  )}
                  {emp.department && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.department}
                    </p>
                  )}

                  {badge && (
                    <div style={{ marginTop: 10 }}>
                      <span className="badge" style={{ background: `${badge.color}18`, color: badge.color, fontSize: 10 }}>{badge.label}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>
                    View profile →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
