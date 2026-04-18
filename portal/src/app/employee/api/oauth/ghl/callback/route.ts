import { NextRequest } from 'next/server';
import { handleCallback } from '@/lib/oauth-handlers/ghl-handler';
import { logger } from '@/lib/logger';

// GET /employee/api/oauth/ghl/callback — handles GHL OAuth callback
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard?auth=failed&provider=ghl&error=${error}`);
  }

  if (!code || !state) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard?auth=failed&provider=ghl&error=missing_params`);
  }

  try {
    const result = await handleCallback(code, state);
    if (result.success) {
      return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard?auth=success&provider=ghl`);
    } else {
      return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard?auth=failed&provider=ghl`);
    }
  } catch (err) {
    logger.error('GHL callback error', { error: String(err) });
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard?auth=failed&provider=ghl&error=server_error`);
  }
}
