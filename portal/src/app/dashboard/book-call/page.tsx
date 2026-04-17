'use client';

import { useState } from 'react';
import { IconCheck } from '@/components/Icons';

const TOPICS = ['Review my current coverage', 'Get a new quote', 'Bundle my policies', 'File or follow up on a claim', 'Policy renewal questions', 'Billing or payment issue', 'Other'];

export default function BookCallPage() {
  const [topic, setTopic] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/book-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, preferredDate, preferredTime, phone, notes }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed.'); return; }
      setSuccess(true);
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', padding: '64px 0' }}>
      <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(46,154,85,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IconCheck style={{ color: 'var(--green)', width: 40, height: 40 }} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>Call Booked!</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>A licensed advisor will call you at your preferred time.</p>
      <button onClick={() => { setSuccess(false); setTopic(''); setPreferredDate(''); setPreferredTime(''); setPhone(''); setNotes(''); }} className="btn btn-navy" style={{ marginTop: 24 }}>Book Another</button>
    </div>
  );

  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Book a Call</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Schedule a call with a licensed OnePoint advisor.</p>
      <div style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit} className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ marginBottom: 20 }}>
            <label className="label">What do you need help with?</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} required className="input">
              <option value="">Select a topic</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div><label className="label">Preferred date</label><input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} required min={minDate.toISOString().split('T')[0]} className="input" /></div>
            <div><label className="label">Preferred time</label>
              <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} required className="input">
                <option value="">Select time</option>
                {['9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}><label className="label">Phone number</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(555) 555-5555" className="input" /></div>
          <div style={{ marginBottom: 24 }}><label className="label">Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Anything specific?" className="input" style={{ resize: 'vertical', minHeight: 80 }} /></div>
          <button type="submit" disabled={loading} className="btn btn-navy btn-full">{loading ? 'Booking...' : 'Book My Call'}</button>
        </form>
        <div style={{ marginTop: 24, background: 'rgba(13,148,136,0.06)', border: '1px solid var(--line)', padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Need help right now?</p>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Call <a href="tel:888-899-8117" style={{ fontWeight: 700, color: 'var(--navy)' }}>888-899-8117</a> — Mon-Fri 9AM-5PM ET.</p>
        </div>
      </div>
    </div>
  );
}
