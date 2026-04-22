'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  if (years >= 10) return { years, label: `${years} yrs`, color: '#7c3aed' };
  if (years >= 5) return { years, label: `${years} yrs`, color: '#0d9488' };
  if (years >= 3) return { years, label: `${years} yrs`, color: '#2e9a55' };
  if (years >= 1) return { years, label: `${years} yr${years > 1 ? 's' : ''}`, color: '#8a5a00' };
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

  useEffect(() => {
    fetch('/employee/api/directory')
      .then(r => r.json())
      .then(d => setEmployees(d.employees || []))
      .finally(() => setLoading(false));
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Team Directory</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Find your teammates and see their tenure, role, and timezone.</p>

      <input
        type="text"
        placeholder="Search by name, email, title, or department…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input"
        style={{ marginBottom: 20 }}
      />

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No employees match.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(emp => {
            const badge = tenureBadge(emp.hireDate, emp.addedAt);
            return (
              <Link key={emp._id} href={`/employee/dashboard/directory/${emp._id}`} className="card-sm" style={{ padding: 16, textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt={emp.name || ''} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                      {initials(emp.name, emp.email)}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name || emp.email}</p>
                    {emp.jobTitle && <p style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.jobTitle}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {emp.department && <span className="badge badge-teal">{emp.department}</span>}
                  {badge && <span className="badge" style={{ background: `${badge.color}22`, color: badge.color }}>🏅 {badge.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
