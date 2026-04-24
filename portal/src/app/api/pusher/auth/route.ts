import { NextRequest } from 'next/server';
import { getEmployeeUser } from '@/lib/employee-auth';
import { getAuthUser } from '@/lib/auth';
import { authorizeChannel, ALLOWED_CHANNELS } from '@/lib/pusher/server';

// Pusher private channels require the client to POST socket_id + channel_name
// here; we verify the session and sign the response. Without this step anyone
// on the internet could subscribe to a private- channel with the public key alone.
//
// Supports BOTH session types:
//   - employees / admins via op_employee cookie (for hub, conversations, bell)
//   - clients via op_session cookie (for their own private-user channel — messaging)
// Never let any user subscribe to someone else's private-user channel.
export async function POST(req: NextRequest) {
  const [employee, client] = await Promise.all([getEmployeeUser(), getAuthUser()]);
  if (!employee && !client) return new Response('Unauthorized', { status: 401 });

  const form = await req.formData();
  const socketId = form.get('socket_id');
  const channelName = form.get('channel_name');

  if (typeof socketId !== 'string' || typeof channelName !== 'string') {
    return new Response('Bad Request', { status: 400 });
  }

  const isSharedChannel = ALLOWED_CHANNELS.has(channelName);
  // Each identity can only authorize its own private-user channel. Employees
  // have access to shared channels (hub, conversations); clients do not.
  const isEmployeeOwnChannel = !!employee && channelName === `private-user-${employee.employeeId}`;
  const isClientOwnChannel = !!client && channelName === `private-user-${client.userId}`;

  if (isClientOwnChannel) {
    // Clients get only their own channel — never shared ones.
    const auth = authorizeChannel(socketId, channelName);
    if (!auth) return new Response('Realtime not configured', { status: 503 });
    return Response.json(auth);
  }

  if (employee && (isSharedChannel || isEmployeeOwnChannel)) {
    const auth = authorizeChannel(socketId, channelName);
    if (!auth) return new Response('Realtime not configured', { status: 503 });
    return Response.json(auth);
  }

  return new Response('Forbidden', { status: 403 });
}
