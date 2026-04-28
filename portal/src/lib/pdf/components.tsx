/* eslint-disable jsx-a11y/alt-text */
// Shared PDF building blocks. Every per-product PDF (auto, home, life,
// health, business) imports from here so they look and feel identical:
// same cover band, same section card style, same KV grid, same footer.
// Only the *content* of the sections differs by product.

import { Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// ─── Brand palette ───
export const NAVY = '#052847';
export const COVER_BLUE = '#0A3D6B';
export const ACCENT = '#4A90D9';
export const MUTED = '#5A6C7E';
export const BORDER = '#DDE4ED';
export const BAND = '#F4F7FB';
export const TEXT = '#1A2E42';

export const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  // Cover band (page 1)
  cover: {
    backgroundColor: COVER_BLUE,
    paddingHorizontal: 36,
    paddingVertical: 28,
    color: '#FFFFFF',
  },
  coverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logo: { width: 110, height: 36, objectFit: 'contain' },
  coverEyebrow: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  coverTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 4 },
  coverSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)' },
  coverMetaRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderTopStyle: 'solid',
  },
  coverMetaCell: { flex: 1 },
  coverMetaLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.1,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  coverMetaValue: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  // Body wrapper / sections
  body: { paddingHorizontal: 36, paddingTop: 24 },
  section: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BAND,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  sectionAccent: { width: 3, height: 12, backgroundColor: ACCENT, marginRight: 8 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionBody: { padding: 12 },
  // Two-column KV grid
  kvGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  kvCell: { width: '50%', paddingRight: 8, paddingBottom: 8 },
  kvCellFull: { width: '100%', paddingBottom: 8 },
  kvLabel: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kvValue: { fontSize: 10, color: TEXT },
  // Item cards (vehicles, drivers, beneficiaries, etc.)
  itemCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  itemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  itemTag: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    backgroundColor: '#DCE9F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemSub: { fontSize: 9, color: MUTED, marginBottom: 4 },
  itemDetail: { fontSize: 9, color: TEXT, marginTop: 2 },
  itemDetailLabel: { fontFamily: 'Helvetica-Bold', color: MUTED },
  // Footer (every page)
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  footerText: { fontSize: 8, color: MUTED },
  footerBrand: { fontFamily: 'Helvetica-Bold', color: NAVY },
  pageNum: { fontSize: 8, color: MUTED },
});

// ─── Helpers ───

export type Payload = Record<string, unknown>;

export function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.filter((x) => x !== '').join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

// Walk dot-notation paths so the same primitive reads flat keys (auto,
// health) and nested keys (home: applicant.first; business: contact.email).
export function pick(p: Payload, ...paths: string[]): string {
  for (const path of paths) {
    const segs = path.split('.');
    let cur: unknown = p;
    let ok = true;
    for (const seg of segs) {
      if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        ok = false;
        break;
      }
    }
    if (ok) {
      const v = s(cur);
      if (v !== '') return v;
    }
  }
  return '';
}

export function anyValue(p: Payload, ...paths: string[]): boolean {
  return paths.some((path) => pick(p, path) !== '');
}

export function fmtDate(v: unknown): string {
  const str = s(v);
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${m}/${d}/${y}`;
  }
  return str;
}

export function arr<T = Record<string, unknown>>(p: Payload, key: string): T[] {
  // Accept dot-notation so callers can grab nested arrays.
  const segs = key.split('.');
  let cur: unknown = p;
  for (const seg of segs) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return [];
    }
  }
  return Array.isArray(cur) ? (cur as T[]) : [];
}

// ─── Primitives ───

// Section is wrappable so a long item list flows across pages instead of
// orphaning a half-empty page. ItemCard inside still uses wrap={false} so
// individual rows stay intact.
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// KV cell — rendered only when value is non-empty so empty fields don't
// leave gaps in the grid.
export function KV({ label, value, full }: { label: string; value: string; full?: boolean }) {
  if (!value) return null;
  return (
    <View style={full ? styles.kvCellFull : styles.kvCell}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Text style={styles.itemDetail}>
      <Text style={styles.itemDetailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

export function ItemCard({
  title,
  tag,
  sub,
  children,
}: {
  title: string;
  tag?: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.itemCard} wrap={false}>
      <View style={styles.itemHead}>
        <Text style={styles.itemTitle}>{title}</Text>
        {tag ? <Text style={styles.itemTag}>{tag}</Text> : null}
      </View>
      {sub ? <Text style={styles.itemSub}>{sub}</Text> : null}
      {children}
    </View>
  );
}

// Cover band — every PDF has the same shape: logo, eyebrow ("New X Quote
// Request"), customer name, contact strip, then a 3-cell meta row with
// reference / submitted / state-or-other. eyebrow / state are caller-tunable.
export function Cover({
  payload,
  logoSrc,
  eyebrow,
  fullName,
  metaThird,
}: {
  payload: Payload;
  logoSrc?: string | Buffer;
  eyebrow: string;
  fullName: string;
  // The 3rd meta cell is product-specific (state, ZIP, etc). Pass {label,value}.
  metaThird?: { label: string; value: string };
}) {
  const ref = pick(payload, 'reference', 'reference_number');
  const submitted = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const email = pick(payload, 'email', 'applicant.email', 'contact.email', 'c_email');
  const phone = pick(payload, 'phone', 'applicant.phone', 'contact.phone', 'c_phone');
  return (
    <View style={styles.cover}>
      <View style={styles.coverRow}>
        {logoSrc ? <Image src={logoSrc as string} style={styles.logo} /> : null}
      </View>
      <Text style={styles.coverEyebrow}>{eyebrow}</Text>
      <Text style={styles.coverTitle}>{fullName || 'New lead'}</Text>
      <Text style={styles.coverSubtitle}>
        {email}
        {phone ? ' · ' + phone : ''}
      </Text>
      <View style={styles.coverMetaRow}>
        <View style={styles.coverMetaCell}>
          <Text style={styles.coverMetaLabel}>REFERENCE</Text>
          <Text style={styles.coverMetaValue}>{ref || '—'}</Text>
        </View>
        <View style={styles.coverMetaCell}>
          <Text style={styles.coverMetaLabel}>SUBMITTED</Text>
          <Text style={styles.coverMetaValue}>{submitted} ET</Text>
        </View>
        {metaThird ? (
          <View style={styles.coverMetaCell}>
            <Text style={styles.coverMetaLabel}>{metaThird.label.toUpperCase()}</Text>
            <Text style={styles.coverMetaValue}>{metaThird.value || '—'}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function Footer({ refCode }: { refCode?: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        <Text style={styles.footerBrand}>OnePoint Insurance Agency</Text>
        {' · 888-899-8117 · info@onepointinsuranceagency.com'}
        {refCode ? ` · Ref ${refCode}` : ''}
      </Text>
      <Text
        style={styles.pageNum}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

// Re-export Page for convenience so per-product files only import from here.
export { Page };
