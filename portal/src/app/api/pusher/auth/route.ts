import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { authorizeChannel, ALLOWED_CHANNELS } from '@/lib/pusher/server';

// Pusher private channels require the client to POST socket_id + channel_name
// here; we verify the employee session and sign the response. Without this
// step anyone on the internet could subscribe to a private- channel with the
// public key alone.
export async function POST(req: NextRequest) {
  const user = await getEmployeeUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const socketId = form.get('socket_id');
  const channelName = form.get('channel_name');

  if (typeof socketId !== 'string' || typeof channelName !== 'string') {
    return new Response('Bad Request', { status: 400 });
  }

  if (!ALLOWED_CHANNELS.has(channelName)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = authorizeChannel(socketId, channelName);
  if (!auth) return new Response('Realtime not configured', { status: 503 });

  return Response.json(auth);
}
