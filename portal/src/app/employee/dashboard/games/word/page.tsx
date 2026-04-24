'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

type LetterState = 'correct' | 'present' | 'absent';
interface ScoredGuess { guess: string; states: LetterState[] }

interface TodayState {
  dateKey: string;
  wordLength: number;
  maxGuesses: number;
  guesses: ScoredGuess[];
  solved: boolean;
  done: boolean;
  score: number | null;
}

export default function WordPage() {
  const [state, setState] = useState<TodayState | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState<string | undefined>();

  useEffect(() => {
    fetch('/employee/api/games/word/today')
      .then(r => r.json())
      .then(setState);
  }, []);

  async function submit() {
    if (!state || state.done) return;
    if (input.length !== state.wordLength) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await secureFetch('/employee/api/games/word/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: input.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Guess rejected.'); return; }
      setInput('');
      setState({
        ...state,
        guesses: data.guesses,
        solved: data.solved,
        done: data.done,
        score: data.done ? data.score : state.score,
      });
      if (data.reveal) setReveal(data.reveal);
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 80 }}>Loading…</p>;

  const blankRows = Math.max(0, state.maxGuesses - state.guesses.length - (state.done ? 0 : 1));

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/games" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to Games</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginTop: 12, marginBottom: 4 }}>Daily Word</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>Today&rsquo;s puzzle · {state.dateKey}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
        {state.guesses.map((g, rowIdx) => (
          <GuessRow key={rowIdx} guess={g} />
        ))}
        {!state.done && <EditableRow value={input} length={state.wordLength} />}
        {Array.from({ length: blankRows }).map((_, i) => <EmptyRow key={`blank-${i}`} length={state.wordLength} />)}
      </div>

      {!state.done && (
        <form
          onSubmit={e => { e.preventDefault(); submit(); }}
          style={{ display: 'flex', gap: 10 }}
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, state.wordLength))}
            placeholder={`Enter ${state.wordLength}-letter word`}
            maxLength={state.wordLength}
            className="input"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}
            autoFocus
          />
          <button type="submit" disabled={submitting || input.length !== state.wordLength} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {submitting ? '…' : 'Guess'}
          </button>
        </form>
      )}

      {error && <p style={{ color: '#9a2f2f', fontSize: 13, marginTop: 12 }}>{error}</p>}

      {state.done && (
        <div className="card" style={{ padding: 20, marginTop: 20, textAlign: 'center' }}>
          {state.solved ? (
            <>
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a7d4a' }}>Solved!</p>
              <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>+{state.score} pts</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9a2f2f' }}>Out of guesses</p>
              {reveal && <p style={{ fontSize: 18, color: 'var(--navy)', marginTop: 10 }}>The word was <strong>{reveal}</strong></p>}
            </>
          )}
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14 }}>Come back tomorrow for a new puzzle.</p>
        </div>
      )}
    </div>
  );
}

function GuessRow({ guess }: { guess: ScoredGuess }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${guess.guess.length}, 1fr)`, gap: 6 }}>
      {guess.guess.split('').map((ch, i) => {
        const state = guess.states[i];
        const bg = state === 'correct' ? '#0a7d4a' : state === 'present' ? '#e8c74e' : '#6b7b8c';
        const color = state === 'present' ? '#3d2c00' : '#fff';
        return (
          <div key={i} style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, color, fontSize: 26, fontWeight: 800, borderRadius: 6, textTransform: 'uppercase' }}>
            {ch}
          </div>
        );
      })}
    </div>
  );
}

function EditableRow({ value, length }: { value: string; length: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${length}, 1fr)`, gap: 6 }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: 'var(--navy)', fontSize: 26, fontWeight: 800, borderRadius: 6, border: `2px solid ${value[i] ? 'var(--blue)' : 'var(--line)'}`, textTransform: 'uppercase' }}>
          {value[i] || ''}
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ length }: { length: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${length}, 1fr)`, gap: 6 }}>
      {Array.from({ length }).map((_, i) => (
        <div key={i} style={{ aspectRatio: '1/1', background: '#fff', borderRadius: 6, border: '2px solid var(--line)' }} />
      ))}
    </div>
  );
}
