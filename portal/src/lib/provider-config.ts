import ProviderConfig, { ProviderSlug } from '@/models/ProviderConfig';
import { connectDB } from '@/lib/db';

export const ALL_PROVIDERS: ProviderSlug[] = ['ghl', 'canva', 'lastpass', 'microsoft'];

// Default config: only GHL enabled. Canva/LastPass/Microsoft still have
// unfinished OAuth scaffolding, so admin opts them in when ready.
const DEFAULTS: Record<ProviderSlug, boolean> = {
  ghl: true,
  canva: false,
  lastpass: false,
  microsoft: false,
};

// Returns a map of provider → enabled. Seeds missing rows with defaults on first call.
export async function getProviderEnabledMap(): Promise<Record<ProviderSlug, boolean>> {
  await connectDB();
  const rows = await ProviderConfig.find({ provider: { $in: ALL_PROVIDERS } });
  const byKey = new Map(rows.map(r => [r.provider as ProviderSlug, !!r.enabled]));
  const missing = ALL_PROVIDERS.filter(p => !byKey.has(p));
  if (missing.length) {
    await ProviderConfig.insertMany(
      missing.map(p => ({ provider: p, enabled: DEFAULTS[p] })),
      { ordered: false },
    ).catch(() => { /* race-safe: another request may have seeded */ });
    for (const p of missing) byKey.set(p, DEFAULTS[p]);
  }
  return ALL_PROVIDERS.reduce((acc, p) => {
    acc[p] = byKey.get(p) ?? DEFAULTS[p];
    return acc;
  }, {} as Record<ProviderSlug, boolean>);
}

export async function isProviderEnabled(provider: ProviderSlug): Promise<boolean> {
  const map = await getProviderEnabledMap();
  return !!map[provider];
}
