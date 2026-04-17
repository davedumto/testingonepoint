import { NextRequest } from 'next/server';
import { handleCallback } from '@/lib/oauth-handlers/canva-handler';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const base = process.env.NEXT_PUBLIC_APP_URL;

  if (error) return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=canva&error=${error}`);
  if (!code || !state) return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=canva&error=missing_params`);

  try {
    const result = await handleCallback(code, state);
    return Response.redirect(`${base}/employee/dashboard?auth=${result.success ? 'success' : 'failed'}&provider=canva`);
  } catch (err) {
    console.error('Canva callback error:', err);
    return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=canva&error=server_error`);
  }
}
