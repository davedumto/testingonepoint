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

export const TIER_CONFIG = {
  bronze: { min: 1, max: 1, label: 'Bronze', color: '#cd7f32', next: 'Silver' },
  silver: { min: 2, max: 2, label: 'Silver', color: '#c0c0c0', next: 'Platinum' },
  platinum: { min: 3, max: 3, label: 'Platinum', color: '#6f88a0', next: 'Emerald' },
  emerald: { min: 4, max: Infinity, label: 'Emerald', color: '#047857', next: null },
};

export function getTier(policyCount: number) {
  if (policyCount >= 4) return TIER_CONFIG.emerald;
  if (policyCount === 3) return TIER_CONFIG.platinum;
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
