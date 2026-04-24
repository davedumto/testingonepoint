'use client';

import { useEffect, useState } from 'react';
import Toast from '@/components/Toast';
import { secureFetch } from '@/lib/client/secure-fetch';
import PageHeader from '@/components/PageHeader';
import PhotoCropper from '@/components/PhotoCropper';

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

export default function MyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Basic
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  // Profile
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [hireDate, setHireDate] = useState('');

  // Emergency contact
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRelation, setEcRelation] = useState('');
  const [shareEC, setShareEC] = useState(false);

  useEffect(() => {
    fetch('/api/employee/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.employee) {
          setMyId(d.employee.employeeId);
          setName(d.employee.name || '');
          setEmail(d.employee.email || '');
          if (d.employee.timezone) setTimezone(d.employee.timezone);
        }
      });
  }, []);

  useEffect(() => {
    if (!myId) return;
    fetch(`/employee/api/directory?id=${myId}`)
      .then(r => r.json())
      .then(d => {
        const p = d.employee;
        if (!p) return;
        setJobTitle(p.jobTitle || '');
        setDepartment(p.department || '');
        setBio(p.bio || '');
        setPhotoUrl(p.photoUrl || '');
        setPhone(p.phone || '');
        setBirthday(p.birthday ? new Date(p.birthday).toISOString().slice(0, 10) : '');
        setHireDate(p.hireDate ? new Date(p.hireDate).toISOString().slice(0, 10) : '');
        setEcName(p.emergencyContactName || '');
        setEcPhone(p.emergencyContactPhone || '');
        setEcRelation(p.emergencyContactRelation || '');
        setShareEC(!!p.shareEmergencyContactWithTeam);
      })
      .finally(() => setLoading(false));
  }, [myId]);

  // Picking a file opens the cropper modal, not an immediate upload. We only
  // hit the server once the user has positioned and confirmed the crop, so
  // Cloudinary never has to guess the crop with face detection.
  function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Photo is too large. Max 5 MB.', type: 'error' });
      return;
    }
    setPendingPhotoFile(file);
  }

  async function uploadCroppedBlob(blob: Blob) {
    setPendingPhotoFile(null);
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      const res = await secureFetch('/api/employee/auth/photo-upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Upload failed.', type: 'error' }); return; }
      setPhotoUrl(data.url);
      setToast({ message: 'Photo updated.', type: 'success' });
    } catch {
      setToast({ message: 'Upload failed.', type: 'error' });
    } finally {
      setPhotoUploading(false);
    }
  }

  function initials(): string {
    const src = name || email || '';
    return src.split(' ').map(s => s[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '•';
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await secureFetch('/api/employee/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, timezone,
          jobTitle, department, bio, photoUrl, phone, birthday, hireDate,
          emergencyContactName: ecName,
          emergencyContactPhone: ecPhone,
          emergencyContactRelation: ecRelation,
          shareEmergencyContactWithTeam: shareEC,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ message: data.error || 'Save failed.', type: 'error' }); return; }
      setToast({ message: 'Profile saved.', type: 'success' });
    } catch { setToast({ message: 'Something went wrong.', type: 'error' }); }
    finally { setSaving(false); }
  }

  if (loading) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '80px 0' }}>Loading…</p>;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 32 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {pendingPhotoFile && (
        <PhotoCropper
          file={pendingPhotoFile}
          onCancel={() => setPendingPhotoFile(null)}
          onConfirm={uploadCroppedBlob}
        />
      )}

      <PageHeader
        eyebrow="About you"
        title="My Profile"
        description="Update how you appear in the team directory."
      />

      <form onSubmit={save}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>Basics</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required maxLength={100} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} disabled style={{ opacity: 0.7 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
            <div>
              <label className="label">Job Title</label>
              <input type="text" className="input" value={jobTitle} onChange={e => setJobTitle(e.target.value)} maxLength={120} placeholder="Licensed Agent" />
            </div>
            <div>
              <label className="label">Department</label>
              <input type="text" className="input" value={department} onChange={e => setDepartment(e.target.value)} maxLength={120} placeholder="Sales" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
            <div>
              <label className="label">Timezone</label>
              <select className="input" value={timezone} onChange={e => setTimezone(e.target.value)}>
                {ALLOWED_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" className="input" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} placeholder="(555) 555-5555" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
            <div>
              <label className="label">Birthday</label>
              <input type="date" className="input" value={birthday} onChange={e => setBirthday(e.target.value)} />
            </div>
            <div>
              <label className="label">Hire Date</label>
              <input type="date" className="input" value={hireDate} onChange={e => setHireDate(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Your profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--line)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                  {initials()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <label className="btn btn-outline" style={{ padding: '8px 16px', fontSize: 13, cursor: photoUploading ? 'wait' : 'pointer', opacity: photoUploading ? 0.6 : 1, display: 'inline-flex' }}>
                  {photoUploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={onPhotoSelected} disabled={photoUploading} style={{ display: 'none' }} />
                </label>
                {photoUrl && !photoUploading && (
                  <button type="button" onClick={() => setPhotoUrl('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Remove
                  </button>
                )}
                <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6, lineHeight: 1.4 }}>
                  JPG, PNG, WebP, or HEIC. Max 5 MB. Auto-cropped to your face.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={1000} placeholder="Tell your teammates about yourself" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Emergency Contact</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Who should we reach in an emergency? By default this is visible only to you and admins. Toggle below if you&apos;d like the team to see it too.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="grid-2">
            <div>
              <label className="label">Contact name</label>
              <input type="text" className="input" value={ecName} onChange={e => setEcName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input type="text" className="input" value={ecRelation} onChange={e => setEcRelation(e.target.value)} maxLength={60} placeholder="Spouse, parent, etc." />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Contact phone</label>
            <input type="tel" className="input" value={ecPhone} onChange={e => setEcPhone(e.target.value)} maxLength={40} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)' }}>
            <input type="checkbox" checked={shareEC} onChange={e => setShareEC(e.target.checked)} />
            Share emergency contact with teammates in the directory
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
