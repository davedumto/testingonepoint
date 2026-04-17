import { getProvider, getCallbackUrl } from '@/lib/oauth-providers';
import { connectDB } from '@/lib/db';
import OAuthEvent from '@/models/EmployeeAuth';

const PROVIDER_KEY = 'microsoft';

export async function initiateAuth(userId: string, userEmail: string): Promise<string> {
  const provider = getProvider(PROVIDER_KEY);
  if (!provider) throw new Error('Microsoft OAuth not configured');

  await connectDB();
  await OAuthEvent.create({ userId, userEmail, provider: PROVIDER_KEY, status: 'initiated' });

  const state = Buffer.from(JSON.stringify({ userId, userEmail, provider: PROVIDER_KEY })).toString('base64');
  const callbackUrl = getCallbackUrl(provider);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: callbackUrl,
    scope: provider.scopes,
    state,
    response_mode: 'query',
  });

  return `${provider.authorizeUrl}?${params.toString()}`;
}

export async function handleCallback(code: string, state: string) {
  const provider = getProvider(PROVIDER_KEY);
  if (!provider) throw new Error('Microsoft OAuth not configured');

  const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  const { userId, userEmail } = stateData;
  const callbackUrl = getCallbackUrl(provider);

  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: callbackUrl,
      scope: provider.scopes,
    }),
  });

  const tokenData = await tokenRes.json();
  await connectDB();

  if (tokenRes.ok && tokenData.access_token) {
    await OAuthEvent.create({
      userId, userEmail, provider: PROVIDER_KEY,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
      authenticatedAt: new Date(), status: 'completed',
      metadata: { scope: tokenData.scope, idToken: tokenData.id_token ? 'present' : 'absent' },
    });
    return { success: true, userId, provider: PROVIDER_KEY, authenticatedAt: new Date() };
  } else {
    await OAuthEvent.create({ userId, userEmail, provider: PROVIDER_KEY, authenticatedAt: new Date(), status: 'failed', metadata: { error: tokenData } });
    return { success: false, error: tokenData };
  }
}
