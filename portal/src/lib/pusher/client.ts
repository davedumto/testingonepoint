'use client';

import PusherClient, { type Channel } from 'pusher-js';

// Matches CHANNELS in ../pusher/server.ts. Duplicated here intentionally to
// avoid pulling the server-only pusher package into the client bundle.
export const CHANNELS = {
  hub: 'private-hub',
  conversations: 'private-conversations',
} as const;

let instance: PusherClient | null = null;

function getPusher(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  if (!instance) {
    instance = new PusherClient(key, {
      cluster,
      authEndpoint: '/api/pusher/auth',
      forceTLS: true,
    });
  }
  return instance;
}

// Subscribe a component to a channel. Returns a teardown fn safe to call
// from useEffect cleanup — unbinds the handlers and unsubscribes if this
// was the last listener. No-op (returns a noop teardown) when Pusher isn't
// configured, so UI code can unconditionally call this.
export function subscribe(
  channel: string,
  handlers: Record<string, (data: unknown) => void>,
): () => void {
  const p = getPusher();
  if (!p) return () => {};

  let ch: Channel;
  try {
    ch = p.subscribe(channel);
  } catch {
    return () => {};
  }

  for (const [event, fn] of Object.entries(handlers)) {
    ch.bind(event, fn);
  }

  return () => {
    for (const [event, fn] of Object.entries(handlers)) {
      ch.unbind(event, fn);
    }
    // Keep the channel subscribed. Unsubscribing would kick any other
    // component still listening on the same name. An idle channel with
    // no bindings is cheap enough.
  };
}
