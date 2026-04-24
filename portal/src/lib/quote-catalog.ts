// Quote Center catalog — organized by the 3 top-level groups the spec calls
// for (Personal / Commercial / Specialty). Each product points at a form on
// the marketing site; the portal redirects with ?firstName=&email=&phone=
// pre-filled so the client doesn't retype their info.
//
// Keep this list in sync with the forms actually published on
// onepointinsuranceagency.com — missing URLs here just point at the /book-call
// fallback so we never send a dead link.

export type QuoteGroup = 'personal' | 'commercial' | 'specialty';

export interface QuoteProduct {
  key: string;            // stable id used for tracking/analytics
  name: string;
  group: QuoteGroup;
  description: string;
  icon: string;
  formUrl: string;        // marketing-site target
}

const MARKETING_BASE = 'https://www.onepointinsuranceagency.com';
const BOOK_CALL = `${MARKETING_BASE}/book-call`;

export const QUOTE_GROUP_LABEL: Record<QuoteGroup, string> = {
  personal: 'Personal Insurance',
  commercial: 'Commercial Insurance',
  specialty: 'Specialty Coverage',
};

export const QUOTE_GROUP_HINT: Record<QuoteGroup, string> = {
  personal: 'Protect you, your family, and what you own.',
  commercial: 'Protect your business operations and employees.',
  specialty: 'Niche coverage for specific exposures.',
};

export const QUOTE_CATALOG: QuoteProduct[] = [
  // Personal — spec §Q1
  { key: 'auto',        name: 'Auto Insurance',      group: 'personal', icon: '🚗', description: 'Liability, collision, comprehensive, UM/UIM.',          formUrl: `${MARKETING_BASE}/auto-quote` },
  { key: 'home',        name: 'Homeowners',          group: 'personal', icon: '🏠', description: 'Dwelling, personal property, liability, loss of use.', formUrl: `${MARKETING_BASE}/home-quote` },
  { key: 'renters',     name: 'Renters / Condo',     group: 'personal', icon: '🏢', description: 'Personal property + liability while you rent.',         formUrl: `${MARKETING_BASE}/home-quote` },
  { key: 'health',      name: 'Health Insurance',    group: 'personal', icon: '❤️', description: 'ACA plans plus ancillary medical coverage.',            formUrl: `${MARKETING_BASE}/health-quote` },
  { key: 'life',        name: 'Life Insurance',      group: 'personal', icon: '🛡️', description: 'Term, whole, and final expense.',                       formUrl: `${MARKETING_BASE}/life-quote` },
  { key: 'disability',  name: 'Disability & Accident', group: 'personal', icon: '💼', description: 'Income replacement, accident, and critical illness.', formUrl: `${MARKETING_BASE}/disability-quote` },

  // Commercial — spec §Q1
  { key: 'gl',          name: 'General Liability',   group: 'commercial', icon: '⚖️', description: 'Third-party bodily injury and property damage.',     formUrl: BOOK_CALL },
  { key: 'wc',          name: 'Workers Compensation', group: 'commercial', icon: '🏗️', description: 'Medical + wage replacement for on-the-job injuries.', formUrl: BOOK_CALL },
  { key: 'comm-auto',   name: 'Commercial Auto',     group: 'commercial', icon: '🚛', description: 'Vehicles used for business purposes.',              formUrl: BOOK_CALL },
  { key: 'bop',         name: 'Business Owner Policy (BOP)', group: 'commercial', icon: '📦', description: 'Property + GL bundled for small businesses.', formUrl: BOOK_CALL },
  { key: 'professional',name: 'Professional Liability', group: 'commercial', icon: '🧑‍⚕️', description: 'Errors & omissions for service providers.',      formUrl: BOOK_CALL },
  { key: 'comm-prop',   name: 'Commercial Property', group: 'commercial', icon: '🏢', description: 'Building, equipment, inventory protection.',         formUrl: BOOK_CALL },

  // Specialty — spec §Q1 (deferred to V2 in the plan but listed so the UI
  // never hides a category; all route to a call until the forms exist)
  { key: 'event',       name: 'Event Insurance',     group: 'specialty', icon: '🎟️', description: 'One-time liability for events and gatherings.',       formUrl: BOOK_CALL },
  { key: 'liquor',      name: 'Liquor Liability',    group: 'specialty', icon: '🍷', description: 'Dram-shop coverage for establishments serving alcohol.', formUrl: BOOK_CALL },
  { key: 'cyber',       name: 'Cyber Insurance',     group: 'specialty', icon: '🧠', description: 'Data breach response, ransomware, cyber liability.',  formUrl: BOOK_CALL },
  { key: 'garage',      name: 'Garage Insurance',    group: 'specialty', icon: '🚗', description: 'Auto shops, dealers, and garage operations.',        formUrl: BOOK_CALL },
  { key: 'trucking',    name: 'Trucking Insurance',  group: 'specialty', icon: '🚛', description: 'Motor carrier, cargo, and occupational accident.',   formUrl: BOOK_CALL },
];

export function productByKey(key: string): QuoteProduct | undefined {
  return QUOTE_CATALOG.find(p => p.key === key);
}
