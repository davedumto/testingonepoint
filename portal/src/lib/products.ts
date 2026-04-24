export interface InsuranceProduct {
  name: string;
  category: string;
  description: string;
  icon: string;
  bundlesWith: string[];
}

export const ALL_PRODUCTS: InsuranceProduct[] = [
  // Auto
  { name: 'Auto Insurance', category: 'auto', description: 'Liability, collision, comprehensive, and uninsured motorist coverage.', icon: '🚗', bundlesWith: ['Homeowners', 'Renters', 'Umbrella'] },
  { name: 'Motorcycle', category: 'auto', description: 'Coverage for cruisers, sport bikes, and touring motorcycles.', icon: '🏍️', bundlesWith: ['Auto Insurance'] },
  { name: 'Boat & Watercraft', category: 'auto', description: 'Hull, motor, and liability for boats and personal watercraft.', icon: '⛵', bundlesWith: ['Auto Insurance', 'Homeowners'] },
  // Home
  { name: 'Homeowners', category: 'home', description: 'Dwelling, personal property, liability, and loss-of-use coverage.', icon: '🏠', bundlesWith: ['Auto Insurance', 'Umbrella', 'Flood'] },
  { name: 'Renters', category: 'home', description: 'Protect belongings, liability, and living expenses when you rent.', icon: '🏢', bundlesWith: ['Auto Insurance'] },
  { name: 'Condo', category: 'home', description: 'HO-6 walls-in coverage plus personal property and liability.', icon: '🏬', bundlesWith: ['Auto Insurance', 'Umbrella'] },
  { name: 'Flood', category: 'home', description: 'Standalone flood protection for structure and contents.', icon: '🌊', bundlesWith: ['Homeowners'] },
  { name: 'Umbrella', category: 'home', description: 'Extra $1M+ liability above your auto and home limits.', icon: '☂️', bundlesWith: ['Auto Insurance', 'Homeowners'] },
  { name: 'Landlord', category: 'home', description: 'Dwelling, liability, and loss-of-rent for rental property owners.', icon: '🔑', bundlesWith: ['Homeowners', 'Umbrella'] },
  // Health
  { name: 'Health (Marketplace)', category: 'health', description: 'ACA Bronze, Silver, Gold, Platinum plans with tax credit eligibility.', icon: '❤️', bundlesWith: ['Dental', 'Vision', 'Accident Coverage'] },
  { name: 'Dental', category: 'health', description: 'Cleanings, fillings, crowns, and orthodontics coverage.', icon: '🦷', bundlesWith: ['Health (Marketplace)', 'Vision'] },
  { name: 'Vision', category: 'health', description: 'Annual exams, lenses, frames, and contacts coverage.', icon: '👁️', bundlesWith: ['Health (Marketplace)', 'Dental'] },
  { name: 'Medicare Advantage', category: 'health', description: 'All-in-one Medicare with extra dental, vision, and hearing benefits.', icon: '🏥', bundlesWith: [] },
  { name: 'Short-Term Medical', category: 'health', description: 'Temporary bridge coverage between jobs or enrollment gaps.', icon: '⏱️', bundlesWith: ['Accident Coverage'] },
  // Life
  { name: 'Term Life', category: 'life', description: 'Fixed-rate coverage for 10/20/30 years — most affordable option.', icon: '🛡️', bundlesWith: ['Whole Life', 'Final Expense', 'Disability Income'] },
  { name: 'Whole Life', category: 'life', description: 'Lifelong coverage with cash value that grows tax-deferred.', icon: '🏦', bundlesWith: ['Term Life'] },
  { name: 'Final Expense', category: 'life', description: 'Small whole life for funeral, burial, and end-of-life costs.', icon: '🕊️', bundlesWith: ['Term Life'] },
  { name: 'Annuity', category: 'life', description: 'Convert savings into guaranteed retirement income.', icon: '📈', bundlesWith: ['Term Life', 'Whole Life'] },
  // Disability
  { name: 'Disability Income', category: 'disability', description: 'Replaces 60-70% of income if illness or injury stops you from working.', icon: '💼', bundlesWith: ['Term Life', 'Health (Marketplace)'] },
  { name: 'Short-Term Disability', category: 'disability', description: 'Benefits within 1-14 days for up to 3-6 months.', icon: '🩹', bundlesWith: ['Long-Term Disability'] },
  { name: 'Long-Term Disability', category: 'disability', description: 'Coverage for serious conditions lasting years to retirement age.', icon: '🏥', bundlesWith: ['Short-Term Disability'] },
  // Business
  { name: 'General Liability', category: 'business', description: 'Third-party bodily injury, property damage, and legal defense.', icon: '🏢', bundlesWith: ['Commercial Property', 'Workers Comp'] },
  { name: 'Commercial Property', category: 'business', description: 'Protect buildings, equipment, inventory from fire, theft, and weather.', icon: '🏗️', bundlesWith: ['General Liability'] },
  { name: 'Workers Comp', category: 'business', description: 'Medical costs and lost wages for employees injured on the job.', icon: '👷', bundlesWith: ['General Liability'] },
  { name: 'Commercial Auto', category: 'business', description: 'Coverage for vehicles used for business purposes.', icon: '🚛', bundlesWith: ['General Liability', 'Commercial Property'] },
  { name: 'Cyber Insurance', category: 'business', description: 'Data breach response, ransomware, and cyber liability.', icon: '🔒', bundlesWith: ['General Liability'] },
  { name: 'Professional Liability', category: 'business', description: 'Errors & omissions coverage for service-based businesses.', icon: '⚖️', bundlesWith: ['General Liability'] },
];

// Tier ladder per client portal spec — 6 levels, keyed to active policy count.
// Colors kept in the brand navy family with accent shifts; the User.tier enum
// in models/User.ts is the canonical data type, this is display config.
export const TIER_CONFIG = {
  bronze:   { min: 1, max: 1,        label: 'Bronze',   color: '#7a4a1f', next: 'Silver' },
  silver:   { min: 2, max: 2,        label: 'Silver',   color: '#5a6c7e', next: 'Gold' },
  gold:     { min: 3, max: 3,        label: 'Gold',     color: '#8a6a00', next: 'Platinum' },
  platinum: { min: 4, max: 4,        label: 'Platinum', color: '#0a3d6b', next: 'Emerald' },
  emerald:  { min: 5, max: 5,        label: 'Emerald',  color: '#0a7d4a', next: 'Crown' },
  crown:    { min: 6, max: Infinity, label: 'Crown',    color: '#052847', next: null },
};

export function getTier(policyCount: number) {
  if (policyCount >= 6) return TIER_CONFIG.crown;
  if (policyCount === 5) return TIER_CONFIG.emerald;
  if (policyCount === 4) return TIER_CONFIG.platinum;
  if (policyCount === 3) return TIER_CONFIG.gold;
  if (policyCount === 2) return TIER_CONFIG.silver;
  if (policyCount === 1) return TIER_CONFIG.bronze;
  return { min: 0, max: 0, label: 'No Tier', color: '#8a9baa', next: 'Bronze' };
}

export function getRecommendations(existingProducts: string[]): InsuranceProduct[] {
  const existingSet = new Set(existingProducts.map(p => p.toLowerCase()));

  // Get products the user doesn't have
  const missing = ALL_PRODUCTS.filter(p => !existingSet.has(p.name.toLowerCase()));

  // Prioritize products that bundle with what they already have
  const scored = missing.map(product => {
    const bundleScore = product.bundlesWith.filter(b =>
      existingSet.has(b.toLowerCase())
    ).length;
    return { product, score: bundleScore };
  });

  // Sort by bundle relevance (highest first), then alphabetically
  scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));

  return scored.map(s => s.product);
}

export interface CrossSellRec {
  productKey: string;     // matches QUOTE_CATALOG key — lets the UI deep-link to the right quote form
  productName: string;
  reason: string;          // why this is being shown, client-friendly
  priority: number;        // higher = more prominent
}

// Rule-based cross-sell engine per spec §14. Takes the client's existing
// policies + a minimal profile flag (has a business? has a home?) and
// returns ordered recommendations with human-readable reasons.
//
// This is intentionally hand-rolled (no ML, no A/B) — the spec enumerates
// concrete bundling scenarios and we implement each as a rule. Easy to
// add/remove rules as the business learns what converts.
export function getCrossSellRecommendations(args: {
  categories: string[];      // Policy.productCategory values the client has active
  hasBusinessName: boolean;  // User.businessName is set
}): CrossSellRec[] {
  const has = (cat: string) => args.categories.includes(cat);
  const recs: CrossSellRec[] = [];

  // Auto-only: push home + life. Spec quote: "Bundle your home and save up to 25%"
  if (has('auto') && !has('home')) {
    recs.push({ productKey: 'home', productName: 'Homeowners', reason: 'Bundle your home with auto and save up to 25%.', priority: 100 });
  }
  if (has('auto') && !has('life')) {
    recs.push({ productKey: 'life', productName: 'Life Insurance', reason: 'Protect your family\'s income with life insurance.', priority: 80 });
  }

  // Auto + Home: push umbrella (major coverage gap) + life.
  if (has('auto') && has('home') && !args.categories.includes('umbrella')) {
    recs.push({ productKey: 'home', productName: 'Umbrella Coverage', reason: 'Add $1M+ liability above your auto and home.', priority: 95 });
  }

  // Business client rules — three heaviest cross-sells
  if (args.hasBusinessName || has('business')) {
    recs.push({ productKey: 'wc', productName: 'Workers Compensation', reason: 'Most states require it once you have employees.', priority: 90 });
    recs.push({ productKey: 'comm-auto', productName: 'Commercial Auto', reason: 'Personal auto won\'t cover business use — close the gap.', priority: 85 });
    recs.push({ productKey: 'cyber', productName: 'Cyber Insurance', reason: 'Ransomware + breach response, essential for modern businesses.', priority: 80 });
  }

  // Health-adjacent: push disability for income protection when client has health but no DI
  if (has('health') && !has('disability')) {
    recs.push({ productKey: 'disability', productName: 'Disability Income', reason: 'Covers 60-70% of income if you can\'t work.', priority: 70 });
  }

  // Dedupe by productKey (keep highest priority) and sort
  const dedup = new Map<string, CrossSellRec>();
  for (const r of recs) {
    const existing = dedup.get(r.productKey);
    if (!existing || r.priority > existing.priority) dedup.set(r.productKey, r);
  }
  return Array.from(dedup.values()).sort((a, b) => b.priority - a.priority);
}
