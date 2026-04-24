// SERVER-ONLY helpers that operate on the Policy + User Mongoose models.
// Anything client-safe (types, display metadata, pure functions) lives in
// lib/tier-meta.ts so client components can import without dragging Mongoose
// + async_hooks into the browser bundle.

import mongoose from 'mongoose';
import Policy from '@/models/Policy';
import User from '@/models/User';
import { tierFromPolicyCount, type ClientTier } from '@/lib/tier-meta';

// Re-export for call sites that previously imported from here.
export { TIER_META, tierFromPolicyCount } from '@/lib/tier-meta';
export type { ClientTier } from '@/lib/tier-meta';

// Recompute the tier for a single user based on their active policies and
// persist it. Called from the Policy post-save / post-delete hooks so the
// User document stays consistent without read-time aggregation.
export async function recomputeTierForUser(userId: mongoose.Types.ObjectId | string): Promise<ClientTier | undefined> {
  const count = await Policy.countDocuments({ userId, status: 'active' });
  const tier = tierFromPolicyCount(count);
  await User.findByIdAndUpdate(userId, { tier, tierUpdatedAt: new Date() });
  return tier;
}
