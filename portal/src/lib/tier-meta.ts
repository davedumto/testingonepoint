// Pure display metadata + tier-from-count mapping for the client-portal
// tier ladder. Kept Mongoose-free so client components (TierBadge,
// DashboardShell, admin list pages) can import from here without pulling the
// server-only `async_hooks` dependency into the browser bundle.
//
// Anything that needs to read/write the User/Policy models lives in
// lib/client-tier.ts (server only). Anything UI-only lives here.

export type ClientTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'emerald' | 'crown';
// These live here (not in models/User.ts) so client components don't import
// the User Mongoose model transitively and drag async_hooks into the browser bundle.
export type AssignedAgent = 'alex' | 'vera' | 'team';
export type PreferredContact = 'call' | 'text' | 'email';

export const TIER_META: Record<ClientTier, { label: string; color: string; bg: string; emoji: string }> = {
  bronze:   { label: 'Bronze',   color: '#7a4a1f', bg: 'rgba(180,118,52,0.15)',  emoji: '🥉' },
  silver:   { label: 'Silver',   color: '#5a6c7e', bg: 'rgba(140,150,165,0.18)', emoji: '🥈' },
  gold:     { label: 'Gold',     color: '#8a6a00', bg: 'rgba(232,199,78,0.22)',  emoji: '🥇' },
  platinum: { label: 'Platinum', color: '#0a3d6b', bg: 'rgba(10,61,107,0.12)',   emoji: '💎' },
  emerald:  { label: 'Emerald',  color: '#0a7d4a', bg: 'rgba(10,125,74,0.14)',   emoji: '🟢' },
  crown:    { label: 'Crown',    color: '#052847', bg: 'rgba(232,199,78,0.30)',  emoji: '👑' },
};

// Tier ladder per the client portal spec:
//   Bronze   = 1 active policy
//   Silver   = 2
//   Gold     = 3
//   Platinum = 4
//   Emerald  = 5
//   Crown    = 6+
// 0 active policies -> tier is unset (badge just doesn't render).
export function tierFromPolicyCount(count: number): ClientTier | undefined {
  if (count <= 0) return undefined;
  if (count === 1) return 'bronze';
  if (count === 2) return 'silver';
  if (count === 3) return 'gold';
  if (count === 4) return 'platinum';
  if (count === 5) return 'emerald';
  return 'crown';
}
