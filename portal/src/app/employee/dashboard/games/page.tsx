'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LeaderRow { userId: string; name: string; photoUrl?: string; score: number }
type GameKey = 'trivia' | 'typing' | 'word' | 'tictactoe';
type Boards = Record<GameKey, LeaderRow[]>;

const GAMES: { key: GameKey; title: string; blurb: string; href: string; accent: string }[] = [
  { key: 'trivia',    title: 'Insurance Trivia', blurb: '10 questions. Speed counts.', href: '/employee/dashboard/games/trivia',    accent: '#0a7d4a' },
  { key: 'typing',    title: 'Typing Speed',     blurb: 'One minute. How fast can you type?', href: '/employee/dashboard/games/typing',    accent: '#0a3d6b' },
  { key: 'word',      title: 'Daily Word',       blurb: 'One puzzle a day, six guesses.', href: '/employee/dashboard/games/word',      accent: '#8a5a00' },
  { key: 'tictactoe', title: 'Tic Tac Toe',      blurb: 'Challenge a teammate. Winner takes a point.', href: '/employee/dashboard/games/tictactoe', accent: '#9a2f2f' },
];

export default function GamesHubPage() {
  const [season, setSeason] = useState<{ name: string; startedAt: string } | null>(null);
  const [boards, setBoards] = useState<Boards>({ trivia: [], typing: [], word: [], tictactoe: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/employee/api/games/leaderboard');
        if (!r.ok) return;
        const d = await r.json();
        if (d.season) setSeason({ name: d.season.name, startedAt: d.season.startedAt });
        setBoards(d.boards || { trivia: [], typing: [], word: [], tictactoe: [] });
      } catch {
        // fall through to empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
      <div className="card-hero-navy" style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700, marginBottom: 10 }}>Team Games</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>Play, climb, win.</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.55, maxWidth: 640 }}>
          Four quick games. Top 3 in each at the end of the season take home a prize.
          {season && <> You&rsquo;re playing in <strong>{season.name}</strong>.</>}
        </p>
      </div>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Pick a game</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {GAMES.map(g => (
            <Link key={g.key} href={g.href} className="card-sm" style={{ padding: 0, textDecoration: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: 6, background: g.accent }} />
              <div style={{ padding: 20 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{g.title}</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{g.blurb}</p>
                <p style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: g.accent, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Play now →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Leaderboards</h2>
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {GAMES.map(g => (
              <div key={g.key} className="card-sm" style={{ padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: g.accent, marginBottom: 10 }}>{g.title}</p>
                {boards[g.key].length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>No scores yet. Be the first.</p>
                ) : (
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {boards[g.key].map((row, i) => (
                      <li key={row.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 22, fontSize: 12, fontWeight: 700, color: 'var(--subtle)' }}>{i + 1}.</span>
                        {row.photoUrl ? (
                          <img src={row.photoUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                            {row.name.split(' ').map(s => s.charAt(0)).slice(0, 2).join('')}
                          </span>
                        )}
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--navy)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        <span style={{ fontSize: 13, color: g.accent, fontWeight: 700 }}>{row.score}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
