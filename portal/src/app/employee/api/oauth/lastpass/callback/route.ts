import { NextRequest } from 'next/server';
import { handleCallback } from '@/lib/oauth-handlers/lastpass-handler';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const base = process.env.NEXT_PUBLIC_APP_URL;

  if (error) return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=lastpass&error=${error}`);
  if (!code || !state) return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=lastpass&error=missing_params`);

  try {
    const result = await handleCallback(code, state);
    return Response.redirect(`${base}/employee/dashboard?auth=${result.success ? 'success' : 'failed'}&provider=lastpass`);
  } catch (err) {
    logger.error('LastPass callback error', { error: String(err) });
    return Response.redirect(`${base}/employee/dashboard?auth=failed&provider=lastpass&error=server_error`);
  }
}
