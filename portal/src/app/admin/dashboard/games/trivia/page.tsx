'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Q {
  _id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: 'insurance' | 'general' | 'company' | 'pop';
  active: boolean;
  addedBy: string;
  createdAt: string;
}

const CATEGORIES: Q['category'][] = ['insurance', 'general', 'company', 'pop'];

export default function AdminTriviaPage() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [category, setCategory] = useState<Q['category']>('insurance');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/games/trivia');
      const data = await res.json();
      setQuestions(data.questions || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = options.map(o => o.trim());
    if (!question.trim() || trimmed.some(o => !o)) { setError('Fill every field.'); return; }
    setSaving(true);
    try {
      const res = await secureFetch('/api/admin/games/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), options: trimmed, correctIndex, category }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Save failed.'); return; }
      setQuestion('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setShowForm(false);
      await load();
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this question?')) return;
    const res = await secureFetch(`/api/admin/games/trivia/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Delete failed.'); return; }
    await load();
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/dashboard/games" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to Games admin</Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', marginTop: 10 }}>Trivia bank</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          {questions.length} question{questions.length === 1 ? '' : 's'}.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-navy"
        style={{ padding: '10px 22px', marginBottom: 18 }}
      >
        {showForm ? 'Cancel' : '+ Add question'}
      </button>

      {showForm && (
        <form onSubmit={save} className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Question</label>
            <textarea
              className="input"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              maxLength={500}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {options.map((opt, i) => (
              <div key={i}>
                <label className="label">
                  Option {i + 1}{' '}
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    style={{ marginLeft: 6 }}
                  /> <span style={{ color: 'var(--muted)', fontSize: 11 }}>(mark correct)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={opt}
                  onChange={e => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  maxLength={200}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Category</label>
            <select
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value as Q['category'])}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn btn-navy" style={{ padding: '10px 22px' }}>
            {saving ? 'Saving…' : 'Save question'}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                <Th>Question</Th>
                <Th>Category</Th>
                <Th>Correct</Th>
                <Th>{' '}</Th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No questions yet. Seed the starter pack from the Games admin.</td></tr>
              ) : questions.map(q => (
                <tr key={q._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--navy)', maxWidth: 440 }}>{q.question}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', textTransform: 'capitalize' }}>{q.category}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.options[q.correctIndex]}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button onClick={() => remove(q._id)} style={{ background: 'none', border: 'none', color: '#9a2f2f', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', textAlign: 'left' }}>
      {children}
    </th>
  );
}
