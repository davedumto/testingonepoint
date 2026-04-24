'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';

const BEST_OF_OPTIONS = [1, 3, 5, 7] as const;

export default function TicTacToeLobbyPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [bestOf, setBestOf] = useState<typeof BEST_OF_OPTIONS[number]>(3);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  async function createRoom() {
    setError('');
    setCreating(true);
    try {
      const res = await secureFetch('/employee/api/games/tictactoe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bestOf }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not create room.'); return; }
      router.push(`/employee/dashboard/games/tictactoe/${data.roomCode}`);
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setError('Enter a valid room code.'); return; }
    setJoining(true);
    try {
      const res = await secureFetch('/employee/api/games/tictactoe/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not join.'); return; }
      router.push(`/employee/dashboard/games/tictactoe/${data.room.roomCode}`);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/games" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to Games</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginTop: 12, marginBottom: 20 }}>Tic Tac Toe</h1>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Start a new match</p>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
          Create a room and share the code or link with a teammate. Best-of-N match; whoever wins the majority takes the point.
        </p>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 8 }}>Match length</p>
        <div role="radiogroup" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {BEST_OF_OPTIONS.map(opt => {
            const active = bestOf === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setBestOf(opt)}
                style={{
                  padding: '8px 16px',
                  border: `2px solid ${active ? 'var(--blue)' : 'var(--line)'}`,
                  background: active ? 'rgba(10,61,107,0.08)' : '#fff',
                  color: 'var(--navy)',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 999,
                  cursor: 'pointer',
                  transition: '.15s',
                }}
              >
                {opt === 1 ? 'Single round' : `Best of ${opt}`}
              </button>
            );
          })}
        </div>

        <button onClick={createRoom} disabled={creating} className="btn btn-navy" style={{ padding: '12px 24px' }}>
          {creating ? 'Creating…' : `Create ${bestOf === 1 ? 'game' : `best-of-${bestOf} match`}`}
        </button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--subtle)', marginBottom: 10 }}>Join with a code</p>
        <form onSubmit={joinRoom} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room code (e.g. A7F3K2)"
            maxLength={10}
            className="input"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}
          />
          <button type="submit" disabled={joining || joinCode.length < 4} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {joining ? '…' : 'Join'}
          </button>
        </form>
      </div>

      {error && <p style={{ color: '#9a2f2f', fontSize: 13, marginTop: 14 }}>{error}</p>}
    </div>
  );
}
