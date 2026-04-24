import Pusher from 'pusher';
import { logger } from '@/lib/logger';

// All channel names flow through these helpers — keeps naming consistent and
// makes the auth-endpoint allowlist easy to maintain.
export const CHANNELS = {
  hub: 'private-hub',
  conversations: 'private-conversations',
} as const;

export const ALLOWED_CHANNELS: ReadonlySet<string> = new Set(Object.values(CHANNELS));

let client: Pusher | null = null;

function isConfigured(): boolean {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

function getClient(): Pusher | null {
  if (!isConfigured()) return null;
  if (!client) {
    client = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return client;
}

// Fire-and-forget publish. Never throws — a Pusher outage must not break
// the user-facing write that triggered it. Logs but swallows errors.
export async function publish(channel: string, event: string, data: unknown): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.trigger(channel, event, data);
  } catch (err) {
    logger.error('Pusher publish failed', { channel, event, error: String(err) });
  }
}

export function authorizeChannel(socketId: string, channel: string): { auth: string } | null {
  const c = getClient();
  if (!c) return null;
  return c.authorizeChannel(socketId, channel);
}

// Invalidation signal for hub surfaces. Clients subscribed to CHANNELS.hub
// refetch /employee/api/hub on receipt. Cheap on-write, avoids per-surface
// payload syncing when a single refetch already returns everything.
export type HubSurface = 'announcements' | 'meetings' | 'events' | 'documents' | 'suggestions' | 'recognition';
export async function publishHubChanged(surface: HubSurface): Promise<void> {
  return publish(CHANNELS.hub, 'hub:changed', { surface });
}
