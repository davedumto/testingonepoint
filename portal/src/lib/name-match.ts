/**
 * Fuzzy match two full names for the client login gate.
 * - Case-insensitive, whitespace-normalized
 * - Compares first and last tokens only (so middle names/initials don't break it)
 * - Returns false on empty input or empty stored name
 */
export function namesFuzzyMatch(input: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  const tokens = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s'-]/gu, '').trim().split(/\s+/).filter(Boolean);
  const a = tokens(input);
  const b = tokens(stored);
  if (!a.length || !b.length) return false;
  const aFirst = a[0];
  const aLast = a[a.length - 1];
  const bFirst = b[0];
  const bLast = b[b.length - 1];
  return aFirst === bFirst && aLast === bLast;
}
