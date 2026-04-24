'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

interface Season { _id: string; name: string; startedBy: string; startedAt: string; endedAt: string | null; endedBy?: string }
interface LeaderRow { userId: string; name: string; photoUrl?: string; score: number }
type GameKey = 'trivia' | 'typing' | 'word' | 'tictactoe';
const GAME_LABELS: Record<GameKey, string> = { trivia: 'Trivia', typing: 'Typing', word: 'Word', tictactoe: 'Tic Tac Toe' };

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminGamesPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [boards, setBoards] = useState<Record<GameKey, LeaderRow[]>>({ trivia: [], typing: [], word: [], tictactoe: [] });
  const [newSeasonName, setNewSeasonName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [triviaCount, setTriviaCount] = useState<number | null>(null);
  const [seedStatus, setSeedStatus] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [seasonsRes, boardRes, trivRes] = await Promise.all([
        fetch('/api/admin/games/seasons').then(r => r.json()),
        fetch('/api/admin/games/leaderboard').then(r => r.json()),
        fetch('/api/admin/games/trivia').then(r => r.json()),
      ]);
      setSeasons(seasonsRes.seasons || []);
      if (boardRes.season) setActiveSeasonId(boardRes.season._id);
      setBoards(boardRes.boards || { trivia: [], typing: [], word: [], tictactoe: [] });
      setTriviaCount((trivRes.questions || []).length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function startSeason(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await secureFetch('/api/admin/games/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSeasonName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not start season.'); return; }
      setNewSeasonName('');
      await load();
    } finally { setBusy(false); }
  }

  async function endSeason(seasonId: string) {
    if (!window.confirm('End this season? The leaderboard freezes immediately.')) return;
    setBusy(true);
    try {
      const res = await secureFetch(`/api/admin/games/seasons/${seasonId}/end`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not end season.'); return; }
      await load();
    } finally { setBusy(false); }
  }

  async function seedTrivia() {
    setSeedStatus('Seeding…');
    try {
      const res = await secureFetch('/api/admin/games/trivia', { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) { setSeedStatus(data.error || 'Seed failed.'); return; }
      if (data.skipped) setSeedStatus(`Already seeded (${data.count} questions).`);
      else setSeedStatus(`Seeded ${data.count} questions.`);
      await load();
    } catch { setSeedStatus('Seed failed.'); }
  }

  const activeSeason = seasons.find(s => !s.endedAt) || null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>Games</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Manage seasons, review leaderboards, and seed the trivia bank.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Active season card */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Active season</p>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
        ) : activeSeason ? (
          <div className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{activeSeason.name}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Started {fmt(activeSeason.startedAt)} by {activeSeason.startedBy}</p>
            </div>
            <button onClick={() => endSeason(activeSeason._id)} disabled={busy} className="btn" style={{ background: 'rgba(220,38,38,0.08)', color: '#9a2f2f', border: '1px solid rgba(220,38,38,0.2)', padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
              End season
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 20, color: 'var(--muted)', fontSize: 14 }}>
            No active season. Start one below so scores start counting.
          </div>
        )}
      </div>

      {/* Start new season */}
      <form onSubmit={startSeason} className="card" style={{ padding: 24, marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Start a new season</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Starting a new season automatically ends the active one (if any). Past season leaderboards stay viewable.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={newSeasonName}
            onChange={e => setNewSeasonName(e.target.value)}
            placeholder="e.g. Spring 2026"
            className="input"
            maxLength={120}
            required
          />
          <button type="submit" disabled={busy || !newSeasonName.trim()} className="btn btn-navy" style={{ padding: '10px 22px' }}>
            {busy ? '…' : 'Start'}
          </button>
        </div>
      </form>

      {/* Leaderboards */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Current leaderboards</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {(Object.keys(GAME_LABELS) as GameKey[]).map(game => (
            <div key={game} className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 10 }}>{GAME_LABELS[game]}</p>
              {boards[game].length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No scores yet.</p>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {boards[game].map((r, i) => (
                    <li key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 22, fontSize: 12, color: 'var(--subtle)', fontWeight: 700 }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{r.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trivia bank */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Trivia bank</p>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--navy)' }}>
              {triviaCount === null ? 'Loading…' : `${triviaCount} question${triviaCount === 1 ? '' : 's'} in the bank.`}
            </p>
            {triviaCount === 0 && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Seed the starter 60 to make trivia playable right away.</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={seedTrivia} className="btn btn-navy" style={{ padding: '9px 18px', fontSize: 13 }}>Seed starter 60</button>
            <Link href="/admin/dashboard/games/trivia" className="btn" style={{ padding: '9px 18px', fontSize: 13, background: 'transparent', color: 'var(--navy)', border: '1px solid var(--line)' }}>
              Manage questions →
            </Link>
          </div>
        </div>
        {seedStatus && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{seedStatus}</p>}
      </div>

      {/* Season history */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>All seasons</p>
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
                <Th>Name</Th>
                <Th>Started</Th>
                <Th>Ended</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {seasons.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 16, color: 'var(--muted)', textAlign: 'center' }}>No seasons yet.</td></tr>
              ) : seasons.map(s => (
                <tr key={s._id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--navy)' }}>{s.name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(s.startedAt)}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{fmt(s.endedAt)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {s.endedAt ? (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--surface)', color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>Ended</span>
                    ) : (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(10,125,74,0.14)', color: '#0a7d4a', fontSize: 11, fontWeight: 700 }}>Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
