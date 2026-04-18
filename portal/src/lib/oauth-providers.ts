// OAuth provider configurations — all credentials from env vars

export interface OAuthProvider {
  name: string;
  key: 'ghl' | 'canva' | 'lastpass' | 'microsoft';
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  callbackPath: string;
}

export function getProvider(key: string): OAuthProvider | null {
  const providers: Record<string, () => OAuthProvider> = {
    ghl: () => ({
      name: 'GoHighLevel',
      key: 'ghl',
      clientId: process.env.GHL_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GHL_OAUTH_CLIENT_SECRET || '',
      authorizeUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
      tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
      scopes: 'contacts.readonly contacts.write opportunities.readonly',
      callbackPath: '/employee/api/oauth/crm/callback',
    }),
    canva: () => ({
      name: 'Canva',
      key: 'canva',
      clientId: process.env.CANVA_CLIENT_ID || '',
      clientSecret: process.env.CANVA_CLIENT_SECRET || '',
      authorizeUrl: 'https://www.canva.com/api/oauth/authorize',
      tokenUrl: 'https://www.canva.com/api/oauth/token',
      scopes: 'design:content:read design:content:write',
      callbackPath: '/employee/api/oauth/canva/callback',
    }),
    lastpass: () => ({
      name: 'LastPass',
      key: 'lastpass',
      clientId: process.env.LASTPASS_CLIENT_ID || '',
      clientSecret: process.env.LASTPASS_CLIENT_SECRET || '',
      authorizeUrl: 'https://accounts.lastpass.com/oauth2/authorize',
      tokenUrl: 'https://accounts.lastpass.com/oauth2/token',
      scopes: 'openid profile email',
      callbackPath: '/employee/api/oauth/lastpass/callback',
    }),
    microsoft: () => ({
      name: 'Microsoft 365',
      key: 'microsoft',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: 'openid profile email User.Read Files.ReadWrite.All Sites.ReadWrite.All',
      callbackPath: '/employee/api/oauth/microsoft/callback',
    }),
  };

  const factory = providers[key];
  return factory ? factory() : null;
}

export function getCallbackUrl(provider: OAuthProvider): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${provider.callbackPath}`;
}

export function buildAuthorizeUrl(provider: OAuthProvider, state: string): string {
  const callbackUrl = getCallbackUrl(provider);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: callbackUrl,
    scope: provider.scopes,
    state,
  });
  return `${provider.authorizeUrl}?${params.toString()}`;
}
