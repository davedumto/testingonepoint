'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

type Phase = 'idle' | 'playing' | 'done';
const DURATION_MS = 60_000;
const STORAGE_KEY = 'games:typing:round';

// Shape persisted to localStorage. We key everything off startedAt so
// reloads resume with real elapsed time rather than a fresh 60s.
interface PersistedRound {
  seasonId: string;
  promptIndex: number;
  prompt: string;
  typed: string;
  startedAt: number;
}

export default function TypingPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [remainingMs, setRemainingMs] = useState(DURATION_MS);
  const [result, setResult] = useState<{ score: number; wpm: number; accuracy: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typedRef = useRef('');
  const indexRef = useRef(0);
  const seasonRef = useRef<string | null>(null);
  useEffect(() => { typedRef.current = typed; }, [typed]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { seasonRef.current = seasonId; }, [seasonId]);

  // Resume any in-flight round. If the stored round references a season
  // that's no longer active (admin ended it), wipe + start fresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: PersistedRound | null = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        stored = raw ? (JSON.parse(raw) as PersistedRound) : null;
      } catch { stored = null; }

      if (!stored?.startedAt || !stored.seasonId || !stored.prompt) return;

      const elapsed = Date.now() - stored.startedAt;
      if (elapsed >= DURATION_MS) {
        // Round timed out while the tab was closed. Fire a final submit with
        // whatever was saved so we still record a score, then clear.
        await finalSubmit(stored.seasonId, stored.promptIndex, stored.typed || '', DURATION_MS);
        persist(null);
        return;
      }

      const res = await fetch('/employee/api/games/season');
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      if (data.season?._id !== stored.seasonId) {
        persist(null);
        return;
      }

      setSeasonId(stored.seasonId);
      setPrompt(stored.prompt);
      setIndex(stored.promptIndex);
      setTyped(stored.typed || '');
      startRef.current = stored.startedAt;
      submittedRef.current = false;
      setRemainingMs(Math.max(0, DURATION_MS - elapsed));
      setPhase('playing');
      beginTick();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep localStorage in sync so a crash mid-typing doesn't lose the round.
  useEffect(() => {
    if (phase !== 'playing' || !seasonId) return;
    persist({ seasonId, promptIndex: index, prompt, typed, startedAt: startRef.current });
  }, [phase, seasonId, index, prompt, typed]);

  function persist(next: PersistedRound | null) {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* storage full or disabled */ }
  }

  function beginTick() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const left = Math.max(0, DURATION_MS - (Date.now() - startRef.current));
      setRemainingMs(left);
      if (left <= 0) submit();
    }, 100);
  }

  async function fetchPrompt() {
    const res = await fetch('/employee/api/games/typing/start');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not start round.');
    }
    const data = await res.json();
    return { seasonId: data.seasonId as string, index: data.index as number, prompt: data.prompt as string };
  }

  async function startRound() {
    setError('');
    setResult(null);
    setTyped('');
    setLoading(true);
    try {
      const { seasonId: sid, index: idx, prompt: p } = await fetchPrompt();
      setSeasonId(sid);
      setIndex(idx);
      setPrompt(p);
      startRef.current = Date.now();
      submittedRef.current = false;
      setRemainingMs(DURATION_MS);
      setPhase('playing');
      persist({ seasonId: sid, promptIndex: idx, prompt: p, typed: '', startedAt: startRef.current });
      beginTick();
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start round.');
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    const elapsedMs = Math.min(DURATION_MS, Date.now() - startRef.current);
    const typedText = typedRef.current;
    const idx = indexRef.current;
    const sid = seasonRef.current;
    if (!sid) { persist(null); return; }
    try {
      const res = await secureFetch('/employee/api/games/typing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: sid, index: idx, typedText, elapsedMs }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) {
        if (data.seasonEnded) persist(null);
        setError(data.error || 'Submit failed.');
        return;
      }
      persist(null);
      setResult({ score: data.score, wpm: data.wpm, accuracy: data.accuracy });
      setPhase('done');
    } catch {
      setError('Submit failed.');
    }
  }

  // Headless variant used when the round timed out while the tab was closed.
  async function finalSubmit(sid: string, idx: number, typedText: string, elapsedMs: number) {
    try {
      const res = await secureFetch('/employee/api/games/typing/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: sid, index: idx, typedText, elapsedMs }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.ok && data.score !== undefined) {
        setResult({ score: data.score, wpm: data.wpm, accuracy: data.accuracy });
        setPhase('done');
      }
    } catch {
      // Non-fatal; user can start a new round.
    }
  }

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/games" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to Games</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginTop: 12, marginBottom: 20 }}>Typing Speed</h1>

      {phase === 'idle' && (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Type the passage as fast and accurately as you can in 60 seconds. Your score is WPM × accuracy.
          </p>
          <button onClick={startRound} disabled={loading} className="btn btn-navy" style={{ padding: '12px 28px' }}>
            {loading ? 'Loading…' : 'Start 60-second round'}
          </button>
          {error && <p style={{ color: '#9a2f2f', fontSize: 13, marginTop: 14 }}>{error}</p>}
        </div>
      )}

      {phase === 'playing' && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Time remaining</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums' }}>{(remainingMs / 1000).toFixed(1)}s</p>
          </div>
          <div style={{
            padding: 16, background: 'var(--surface)', borderRadius: 10, fontSize: 15, color: 'var(--ink)',
            lineHeight: 1.7, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre-wrap', marginBottom: 14,
          }}>
            <HighlightedPrompt prompt={prompt} typed={typed} />
          </div>
          <textarea
            ref={textareaRef}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Start typing…"
            rows={4}
            style={{ width: '100%', padding: 14, fontSize: 15, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', border: '1.5px solid var(--line)', borderRadius: 8, outline: 'none', resize: 'vertical' }}
          />
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={submit} className="btn" style={{ background: 'transparent', color: 'var(--muted)', padding: '8px 16px' }}>
              Give up & submit
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="card" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a3d6b' }}>Round complete</p>
          <p style={{ fontSize: 48, fontWeight: 800, color: 'var(--navy)', marginTop: 10 }}>{result.score}</p>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {result.wpm} WPM · {result.accuracy}% accuracy
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={startRound} disabled={loading} className="btn btn-navy" style={{ padding: '10px 22px' }}>Play again</button>
            <Link href="/employee/dashboard/games" className="btn" style={{ padding: '10px 22px', background: 'transparent', color: 'var(--muted)' }}>Back</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function HighlightedPrompt({ prompt, typed }: { prompt: string; typed: string }) {
  return (
    <>
      {prompt.split('').map((ch, i) => {
        let color = 'var(--muted)';
        if (i < typed.length) color = typed[i] === ch ? '#0a7d4a' : '#9a2f2f';
        return <span key={i} style={{ color, background: i === typed.length ? 'rgba(10,61,107,0.1)' : 'transparent' }}>{ch}</span>;
      })}
    </>
  );
}
