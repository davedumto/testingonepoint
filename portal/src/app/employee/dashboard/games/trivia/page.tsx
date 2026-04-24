'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Q { _id: string; question: string; options: string[]; category: string }
type Phase = 'idle' | 'playing' | 'done' | 'error';

interface AnswerLog { questionId: string; answerIndex: number; timeMs: number }
interface Result { score: number; correct: number; total: number }

// Shape we persist to localStorage between reloads. Stamped with seasonId
// so if the admin ends the season mid-round we can detect + discard on the
// next load.
interface PersistedRound {
  seasonId: string;
  questions: Q[];
  answers: AnswerLog[];
  startedAt: number;
}

const STORAGE_KEY = 'games:trivia:round';

export default function TriviaPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const questionStartRef = useRef<number>(0);

  // Rehydrate any in-flight round on mount. If the stored round references a
  // season that's no longer active, we discard it so the employee starts fresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as PersistedRound;
      if (!stored?.seasonId || !Array.isArray(stored.questions)) return;

      // Validate the season still matches the active one before resuming.
      // We fire the check async; until it resolves we keep the user on
      // the idle screen (no accidental resume into a dead season).
      (async () => {
        const res = await fetch('/employee/api/games/season');
        if (!res.ok) return;
        const data = await res.json();
        if (data.season?._id !== stored.seasonId) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setSeasonId(stored.seasonId);
        setQuestions(stored.questions);
        setAnswers(stored.answers || []);
        setIndex(stored.answers?.length || 0);
        setSelected(null);
        setPhase('playing');
        questionStartRef.current = Date.now();
      })();
    } catch {
      // Corrupt entry — blow it away.
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persist(next: PersistedRound | null) {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage full or disabled — silently continue */ }
  }

  async function startGame() {
    setError('');
    setLoading(true);
    try {
      const res = await secureFetch('/employee/api/games/trivia/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not start.'); setPhase('error'); return; }
      const round: PersistedRound = {
        seasonId: data.seasonId,
        questions: data.questions,
        answers: [],
        startedAt: Date.now(),
      };
      persist(round);
      setSeasonId(round.seasonId);
      setQuestions(round.questions);
      setIndex(0);
      setAnswers([]);
      setSelected(null);
      setPhase('playing');
      questionStartRef.current = Date.now();
    } finally {
      setLoading(false);
    }
  }

  async function submitRound(finalAnswers: AnswerLog[]) {
    setLoading(true);
    try {
      const res = await secureFetch('/employee/api/games/trivia/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Season ended mid-round — wipe the stored round so the user can
        // restart fresh against the new (or forthcoming) season.
        if (data.seasonEnded) persist(null);
        setError(data.error || 'Submit failed.');
        setPhase('error');
        return;
      }
      persist(null);
      setResult({ score: data.score, correct: data.correct, total: data.total });
      setPhase('done');
    } finally {
      setLoading(false);
    }
  }

  function pickAnswer(answerIndex: number) {
    if (selected !== null) return;
    setSelected(answerIndex);
    const timeMs = Date.now() - questionStartRef.current;
    const log: AnswerLog = { questionId: questions[index]._id, answerIndex, timeMs };
    const next = [...answers, log];
    setAnswers(next);
    // Persist the updated round state so a reload picks up at the next q.
    if (seasonId) {
      persist({ seasonId, questions, answers: next, startedAt: questionStartRef.current });
    }
    // Small reveal delay, then advance or submit
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        submitRound(next);
      } else {
        setIndex(index + 1);
        setSelected(null);
        questionStartRef.current = Date.now();
      }
    }, 550);
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/games" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to Games</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginTop: 12, marginBottom: 20 }}>Insurance Trivia</h1>

      {phase === 'idle' && (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 20px' }}>
            Ten questions. Each correct answer earns points, with a bonus for answering quickly. One round per attempt — your best score counts.
          </p>
          <button onClick={startGame} disabled={loading} className="btn btn-navy" style={{ padding: '12px 28px' }}>
            {loading ? 'Starting…' : 'Start round'}
          </button>
          {error && <p style={{ color: '#9a2f2f', marginTop: 14, fontSize: 13 }}>{error}</p>}
        </div>
      )}

      {phase === 'playing' && questions[index] && (
        <div className="card" style={{ padding: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)' }}>
            Question {index + 1} of {questions.length}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginTop: 10, marginBottom: 20, lineHeight: 1.3 }}>
            {questions[index].question}
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {questions[index].options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickAnswer(i)}
                  disabled={selected !== null}
                  style={{
                    padding: '14px 18px',
                    textAlign: 'left',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--navy)',
                    background: isSelected ? 'rgba(10,61,107,0.1)' : '#fff',
                    border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--line)'}`,
                    borderRadius: 10,
                    cursor: selected === null ? 'pointer' : 'default',
                    transition: '0.15s',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a7d4a' }}>Round complete</p>
          <p style={{ fontSize: 48, fontWeight: 800, color: 'var(--navy)', marginTop: 10 }}>{result.score}</p>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {result.correct} of {result.total} correct
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={startGame} disabled={loading} className="btn btn-navy" style={{ padding: '10px 22px' }}>
              {loading ? 'Starting…' : 'Play again'}
            </button>
            <Link href="/employee/dashboard/games" className="btn" style={{ padding: '10px 22px', background: 'transparent', color: 'var(--muted)' }}>
              Back to games
            </Link>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ color: '#9a2f2f', marginBottom: 14 }}>{error}</p>
          <button onClick={startGame} className="btn btn-navy">Try again</button>
        </div>
      )}
    </div>
  );
}
