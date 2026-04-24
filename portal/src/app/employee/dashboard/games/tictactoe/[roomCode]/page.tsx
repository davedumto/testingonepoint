'use client';

import { useEffect, useMemo, useRef, useState, use } from 'react';
import Link from 'next/link';
import { secureFetch } from '@/lib/client/secure-fetch';
import { subscribe, onReconnect } from '@/lib/pusher/client';

type Cell = '' | 'X' | 'O';
type Turn = 'X' | 'O';
type Status = 'waiting' | 'in_progress' | 'round_ended' | 'finished';
type Winner = 'X' | 'O' | 'draw';

interface Player { userId: string; name: string; photoUrl?: string }
interface Room {
  roomCode: string;
  playerX: Player;
  playerO: Player | null;
  board: Cell[];
  turn: Turn;
  status: Status;
  winner?: Winner;
  winningLine?: number[];
  bestOf: number;
  roundNumber: number;
  matchScoreX: number;
  matchScoreO: number;
  matchWinner?: 'X' | 'O';
}

export default function TicTacToeRoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  // Track whether we've already attempted the auto-join so a second render
  // caused by Pusher or state changes doesn't loop against the join endpoint.
  const autoJoinAttempted = useRef(false);

  // Pull the employee's id — /api/employee/auth/me returns { employee: {...} }
  // (not { user }), so read that shape.
  useEffect(() => {
    fetch('/api/employee/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMe(d?.employee?.employeeId || d?.employee?.userId || null))
      .catch(() => {});
  }, []);

  // Initial room load. We wait until `me` is known before fetching so the
  // auto-join effect below has both pieces of info on first render.
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/employee/api/games/tictactoe/${roomCode}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) { setError(data.error || 'Could not load room.'); return; }
      setRoom(data.room);
    }
    load();
    return () => { cancelled = true; };
  }, [roomCode, me]);

  // Auto-join: if the viewer landed here via an invite link, they're not
  // playerX and the room is still waiting — automatically call /join so the
  // room flips to in_progress without requiring a second click.
  useEffect(() => {
    if (!room || !me || autoJoinAttempted.current) return;
    if (room.status !== 'waiting') return;
    const isPlayerX = room.playerX.userId === me;
    const isPlayerO = room.playerO?.userId === me;
    if (isPlayerX || isPlayerO) return;

    autoJoinAttempted.current = true;
    (async () => {
      const res = await secureFetch('/employee/api/games/tictactoe/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not join room.'); return; }
      setRoom(data.room);
    })();
  }, [room, me, roomCode]);

  // Live updates via Pusher. Both 'ttt:joined' and 'ttt:move' push the full
  // serialized room, so we replace the state wholesale.
  useEffect(() => {
    if (!roomCode) return;
    const teardown = subscribe(`private-tictactoe-${roomCode}`, {
      'ttt:joined': (data) => setRoom(data as Room),
      'ttt:move': (data) => setRoom(data as Room),
    });
    return teardown;
  }, [roomCode]);

  // Resync after a WebSocket reconnect. Pusher doesn't replay events that
  // were published while the client was offline, so any moves made during
  // the drop would leave the UI stale. Refetching the room doc from the
  // server pulls us back to the authoritative state.
  useEffect(() => {
    if (!roomCode) return;
    const teardown = onReconnect(async () => {
      try {
        const res = await fetch(`/employee/api/games/tictactoe/${roomCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.room) setRoom(data.room);
      } catch {
        // Swallow — the next move or reload will recover.
      }
    });
    return teardown;
  }, [roomCode]);

  const myMark: Turn | null = useMemo(() => {
    if (!room || !me) return null;
    if (room.playerX.userId === me) return 'X';
    if (room.playerO?.userId === me) return 'O';
    return null;
  }, [room, me]);

  const isMyTurn = room && myMark && room.turn === myMark && room.status === 'in_progress';

  async function makeMove(cellIndex: number) {
    if (!room || !isMyTurn || room.board[cellIndex] !== '') return;
    try {
      const res = await secureFetch('/employee/api/games/tictactoe/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, cellIndex }),
      });
      // Parse defensively: a 500 from the server may come back with an empty
      // body, which would make res.json() throw. Fall back to text + generic
      // error message so the UI stays usable.
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (!res.ok) { setError(data.error || `Move rejected (${res.status}).`); return; }
      if (data.room) setRoom(data.room);
    } catch (err) {
      setError('Could not reach the server. Please try again.');
      // eslint-disable-next-line no-console
      console.error('makeMove failed', err);
    }
  }

  // Either player can advance to the next round. The endpoint is idempotent
  // so two clicks from both sides don't double-advance.
  async function startNextRound() {
    if (!room || room.status !== 'round_ended') return;
    setAdvancing(true);
    try {
      const res = await secureFetch('/employee/api/games/tictactoe/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Could not start next round.'); return; }
      setRoom(data.room);
    } finally {
      setAdvancing(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/employee/dashboard/games/tictactoe/${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error) {
    return (
      <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: 20 }}>
        <p style={{ color: 'var(--muted)' }}>{error}</p>
        <Link href="/employee/dashboard/games/tictactoe" style={{ color: 'var(--blue)', fontWeight: 600 }}>← Back to lobby</Link>
      </div>
    );
  }

  if (!room) return <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 80 }}>Loading…</p>;

  const isSpectatorLock = room.status === 'in_progress' && !myMark;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: 32 }}>
      <Link href="/employee/dashboard/games/tictactoe" style={{ fontSize: 13, color: 'var(--muted)' }}>← Back to lobby</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)', marginTop: 12 }}>Tic Tac Toe</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Room <strong style={{ color: 'var(--navy)', letterSpacing: '0.14em' }}>{room.roomCode}</strong>
      </p>

      {room.status === 'waiting' && (
        <div className="card" style={{ padding: 20, marginBottom: 18, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 10 }}>
            Waiting for a teammate to join. Share this room code or link with them.
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--navy)', marginBottom: 12 }}>{room.roomCode}</p>
          <button onClick={copyLink} className="btn btn-navy" style={{ padding: '10px 20px' }}>
            {copied ? 'Link copied!' : 'Copy invite link'}
          </button>
        </div>
      )}

      {/* Match score header + round indicator. Shown once the match is underway. */}
      {(room.status !== 'waiting') && (
        <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--subtle)' }}>
            {room.status === 'finished' ? 'Match complete' : `Round ${room.roundNumber} of ${room.bestOf}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--navy)' }}>
            <span style={{ fontWeight: 700 }}>{room.playerX.name.split(' ')[0]}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em' }}>
              {room.matchScoreX}&nbsp;–&nbsp;{room.matchScoreO}
            </span>
            <span style={{ fontWeight: 700 }}>{room.playerO?.name.split(' ')[0] || '—'}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <PlayerCard player={room.playerX} mark="X" active={room.turn === 'X' && room.status === 'in_progress'} isMe={room.playerX.userId === me} />
        <PlayerCard player={room.playerO} mark="O" active={room.turn === 'O' && room.status === 'in_progress'} isMe={room.playerO?.userId === me} />
      </div>

      <Board board={room.board} winningLine={room.winningLine} onCellClick={makeMove} locked={!isMyTurn || isSpectatorLock} />

      {/* Between rounds: show who won the round. Only the player who goes
          first next round sees the start button (loser of the previous round,
          or X on a draw — matches the server logic in /next-round). The
          other player gets a "Waiting for …" line so they know what's up. */}
      {room.status === 'round_ended' && (() => {
        const nextStarter: Turn = room.winner === 'X' ? 'O' : room.winner === 'O' ? 'X' : 'X';
        const iStartNext = myMark === nextStarter;
        const starterName = nextStarter === 'X' ? room.playerX.name : room.playerO?.name;
        return (
          <div className="card" style={{ padding: 20, marginTop: 18, textAlign: 'center' }}>
            {room.winner === 'draw' ? (
              <p style={{ fontSize: 15, color: 'var(--navy)', fontWeight: 700 }}>Round {room.roundNumber} was a draw.</p>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--navy)', fontWeight: 700 }}>
                <strong>{room.winner === 'X' ? room.playerX.name : room.playerO?.name}</strong> took round {room.roundNumber}.
              </p>
            )}
            {iStartNext ? (
              <button onClick={startNextRound} disabled={advancing} className="btn btn-navy" style={{ padding: '10px 22px', marginTop: 12 }}>
                {advancing ? 'Starting…' : `Start round ${room.roundNumber + 1}`}
              </button>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                Waiting for <strong style={{ color: 'var(--navy)' }}>{starterName}</strong> to start round {room.roundNumber + 1}…
              </p>
            )}
          </div>
        );
      })()}

      {/* Match complete: final score + leaderboard note. */}
      {room.status === 'finished' && (
        <div className="card" style={{ padding: 20, marginTop: 18, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a7d4a', marginBottom: 6 }}>Match winner</p>
          <p style={{ fontSize: 18, color: 'var(--navy)', fontWeight: 800 }}>
            {room.matchWinner === 'X' ? room.playerX.name : room.playerO?.name}
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            Final score {room.matchScoreX}&ndash;{room.matchScoreO} &middot; +1 point to their season tally.
          </p>
          <Link href="/employee/dashboard/games/tictactoe" className="btn btn-navy" style={{ padding: '10px 22px', marginTop: 14, display: 'inline-block' }}>
            New match
          </Link>
        </div>
      )}

      {room.status === 'in_progress' && (
        <p style={{ marginTop: 14, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          {isMyTurn ? 'Your turn.' : myMark ? `Waiting for ${room.turn === 'X' ? room.playerX.name : room.playerO?.name}…` : 'Spectating.'}
        </p>
      )}
    </div>
  );
}

function PlayerCard({ player, mark, active, isMe }: { player: Player | null; mark: Turn; active: boolean; isMe?: boolean }) {
  return (
    <div style={{
      padding: 14, border: `2px solid ${active ? 'var(--blue)' : 'var(--line)'}`, borderRadius: 10,
      background: active ? 'rgba(10,61,107,0.06)' : '#fff', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', background: mark === 'X' ? '#0a3d6b' : '#9a2f2f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
        {mark}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player?.name || 'Waiting…'} {isMe && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(you)</span>}
        </p>
      </div>
    </div>
  );
}

function Board({ board, winningLine, onCellClick, locked }: { board: Cell[]; winningLine?: number[]; onCellClick: (i: number) => void; locked: boolean }) {
  const winSet = new Set(winningLine || []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: 'var(--navy)', padding: 6, borderRadius: 12 }}>
      {board.map((cell, i) => {
        const isWinCell = winSet.has(i);
        const color = cell === 'X' ? '#0a3d6b' : cell === 'O' ? '#9a2f2f' : 'var(--subtle)';
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCellClick(i)}
            disabled={locked || cell !== ''}
            style={{
              aspectRatio: '1/1', background: isWinCell ? '#e8c74e' : '#fff', border: 'none', borderRadius: 8,
              fontSize: 56, fontWeight: 800, color, cursor: (locked || cell !== '') ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s',
            }}
          >
            {cell}
          </button>
        );
      })}
    </div>
  );
}
