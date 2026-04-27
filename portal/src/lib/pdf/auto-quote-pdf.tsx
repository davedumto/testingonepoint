/* eslint-disable jsx-a11y/alt-text */
// Auto-quote PDF rendered with @react-pdf/renderer. Built on the server in
// the /api/leads/auto handler; the marketing site never imports this file.
//
// Design notes:
//   • One brand palette (navy, accent blue, muted gray) reused everywhere
//   • Top "cover band" with logo, applicant name, reference, submission time
//   • Rounded section "cards" with a colored sidebar accent
//   • Two-column key/value rows for compact applicant/coverage data
//   • Per-vehicle / per-driver mini-cards so multi-unit quotes scan cleanly
//   • Page number + reference footer on every page
//
// The payload is intentionally loosely-typed (`Record<string, unknown>`) so
// the same renderer copes with the auto form's flat shape today and any
// future shape tweaks without breaking the contract.

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

const NAVY = '#052847';        // section titles, footer brand text
const COVER_BLUE = '#0A3D6B';  // cover band — lighter brand blue (--blue on the marketing site)
const ACCENT = '#4A90D9';
const MUTED = '#5A6C7E';
const BORDER = '#DDE4ED';
const BAND = '#F4F7FB';
const TEXT = '#1A2E42';

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    backgroundColor: '#FFFFFF',
  },
  // ── Cover band (page 1 only) ──
  cover: {
    backgroundColor: COVER_BLUE,
    paddingHorizontal: 36,
    paddingVertical: 28,
    color: '#FFFFFF',
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 110,
    height: 36,
    objectFit: 'contain',
  },
  coverEyebrow: {
    fontSize: 9,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
  },
  coverMetaRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderTopStyle: 'solid',
  },
  coverMetaCell: {
    flex: 1,
  },
  coverMetaLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.1,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  coverMetaValue: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
  },
  // ── Body wrapper / sections ──
  body: {
    paddingHorizontal: 36,
    paddingTop: 24,
  },
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
  sectionAccent: {
    width: 3,
    height: 12,
    backgroundColor: ACCENT,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionBody: {
    padding: 12,
  },
  // ── Two-column key/value rows ──
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kvCell: {
    width: '50%',
    paddingRight: 8,
    paddingBottom: 8,
  },
  kvCellFull: {
    width: '100%',
    paddingBottom: 8,
  },
  kvLabel: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kvValue: {
    fontSize: 10,
    color: TEXT,
  },
  // ── Mini-cards for items in arrays (vehicles, drivers, etc) ──
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
  itemTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
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
  itemSub: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 9,
    color: TEXT,
    marginTop: 2,
  },
  itemDetailLabel: {
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
  },
  // ── Footer (every page) ──
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
  footerText: {
    fontSize: 8,
    color: MUTED,
  },
  footerBrand: {
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  pageNum: {
    fontSize: 8,
    color: MUTED,
  },
});

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

type Payload = Record<string, unknown>;

function s(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.filter((x) => x !== '').join(', ');
  return String(v);
}

function pick(p: Payload, ...keys: string[]): string {
  for (const k of keys) {
    const v = p[k];
    if (v !== undefined && v !== null && v !== '') return s(v);
  }
  return '';
}

// True if any of the listed top-level keys has a non-empty value. Used by
// each section to skip rendering its card frame when the lead provided
// nothing for that section (otherwise we'd show an empty heading).
function anyValue(p: Payload, ...keys: string[]): boolean {
  return keys.some((k) => pick(p, k) !== '');
}

function fmtDate(v: unknown): string {
  const str = s(v);
  if (!str) return '';
  // ISO yyyy-mm-dd → mm/dd/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${m}/${d}/${y}`;
  }
  return str;
}

function arr<T = Record<string, unknown>>(p: Payload, key: string): T[] {
  const v = p[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

// ─────────────────────────────────────────────────────────────────────
// Reusable layout primitives
// ─────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  // Section is wrappable so a long Vehicles/Drivers list can flow across
  // pages instead of overflowing or leaving a half-empty page behind it.
  // ItemCards inside still use wrap={false} so individual rows stay intact.
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

function KV({ label, value, full }: { label: string; value: string; full?: boolean }) {
  if (!value) return null;
  return (
    <View style={full ? styles.kvCellFull : styles.kvCell}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <Text style={styles.itemDetail}>
      <Text style={styles.itemDetailLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

function ItemCard({
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

// ─────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────

function ApplicantSection({ p }: { p: Payload }) {
  const fullName =
    pick(p, 'full_name') ||
    `${pick(p, 'first_name')} ${pick(p, 'last_name')}`.trim();
  const addr = [
    pick(p, 'street'),
    pick(p, 'apt') ? `Apt ${pick(p, 'apt')}` : '',
  ].filter(Boolean).join(' ');
  const cityState = [pick(p, 'city'), pick(p, 'state'), pick(p, 'zip')]
    .filter(Boolean)
    .join(', ')
    .replace(', ' + pick(p, 'zip'), ' ' + pick(p, 'zip'));
  return (
    <Section title="Applicant">
      <View style={styles.kvGrid}>
        <KV label="Name" value={fullName} />
        <KV label="DOB" value={fmtDate(p.dob)} />
        <KV label="Email" value={pick(p, 'email')} />
        <KV label="Phone" value={pick(p, 'phone')} />
        <KV label="Gender" value={pick(p, 'gender')} />
        <KV label="Marital" value={pick(p, 'marital_status')} />
        <KV label="Address" value={[addr, cityState].filter(Boolean).join(', ')} full />
        <KV label="Mailing same as garage" value={pick(p, 'mailing_same')} />
        <KV label="Residence state" value={pick(p, 'residence_state')} />
      </View>
    </Section>
  );
}

function LeadQualifiersSection({ p }: { p: Payload }) {
  const products = arr<string>(p, 'products_selected')
    .map((x) => {
      if (x === 'auto') return 'Standard Auto';
      if (x === 'motorcycle') return 'Motorcycle / Scooter / ATV / Snowmobile';
      if (x === 'rv') return 'RV / Travel Trailer';
      if (x === 'boat') return 'Boat / Watercraft';
      return x;
    })
    .join(', ');
  return (
    <Section title="Lead Qualifiers">
      <View style={styles.kvGrid}>
        <KV label="Products selected" value={products} full />
        <KV label="Total units" value={pick(p, 'total_unit_count')} />
        <KV label="Currently insured" value={pick(p, 'lead_currently_insured')} />
        <KV label="Purchase timing" value={pick(p, 'lead_purchase_timing')} />
        <KV label="Homeowner" value={pick(p, 'lead_homeowner')} />
        <KV label="Vehicles to insure" value={pick(p, 'lead_vehicle_count')} />
      </View>
    </Section>
  );
}

function VehiclesSection({ p }: { p: Payload }) {
  const vehicles = arr(p, 'vehicles');
  if (!vehicles.length) return null;
  return (
    <Section title={`Vehicles (${vehicles.length})`}>
      {vehicles.map((v, i) => {
        const title = `${s(v.year)} ${s(v.make)} ${s(v.model)}${v.trim ? ' ' + s(v.trim) : ''}`.trim();
        const sub = [s(v.body), s(v.use), s(v.daily_miles) ? s(v.daily_miles) + ' mi/day' : '']
          .filter(Boolean)
          .join(' · ');
        const garaging =
          v.garaging_same === 'No' && v.garaging_address
            ? s(v.garaging_address)
            : v.garaging_same === 'Yes'
            ? 'Same as home address'
            : '';
        return (
          <ItemCard
            key={i}
            title={title || `Vehicle ${i + 1}`}
            tag={v.primary ? 'Primary' : undefined}
            sub={sub}
          >
            <Detail label="Ownership" value={s(v.ownership)} />
            <Detail label="Full coverage" value={s(v.full_coverage)} />
            <Detail label="Owned/leased for" value={s(v.ownership_duration)} />
            <Detail label="Garaging" value={garaging} />
            <Detail label="Anti-theft" value={s(v.anti_theft)} />
            <Detail label="Safety features" value={s(v.safety_features)} />
            <Detail label="Custom parts" value={s(v.custom_parts)} />
            <Detail label="VIN" value={s(v.vin)} />
          </ItemCard>
        );
      })}
    </Section>
  );
}

function MotorcyclesSection({ p }: { p: Payload }) {
  const items = arr(p, 'motorcycles');
  if (!items.length) return null;
  return (
    <Section title={`Motorcycles / Scooters / ATVs / Snowmobiles (${items.length})`}>
      {items.map((m, i) => {
        const title = `${s(m.year)} ${s(m.make)} ${s(m.model)}${m.motorcycle_type ? ' — ' + s(m.motorcycle_type) : ''}`.trim();
        const sub = [s(m.engine_cc) ? s(m.engine_cc) + 'cc' : '', s(m.primary_use), s(m.storage)]
          .filter(Boolean)
          .join(' · ');
        return (
          <ItemCard key={i} title={title || `Unit ${i + 1}`} sub={sub}>
            <Detail label="Ownership" value={s(m.ownership)} />
            <Detail label="VIN" value={s(m.vin)} />
            <Detail label="Annual mileage" value={s(m.annual_mileage)} />
            <Detail label="Anti-theft" value={s(m.anti_theft)} />
            <Detail label="Modifications" value={s(m.modifications)} />
          </ItemCard>
        );
      })}
    </Section>
  );
}

function RvsSection({ p }: { p: Payload }) {
  const items = arr(p, 'rvs');
  if (!items.length) return null;
  return (
    <Section title={`RVs / Travel Trailers (${items.length})`}>
      {items.map((r, i) => {
        const title = `${s(r.year)} ${s(r.make)} ${s(r.model)}${r.rv_type ? ' [' + s(r.rv_type) + ']' : ''}`.trim();
        const sub = [
          s(r.length_ft) ? s(r.length_ft) + ' ft' : '',
          s(r.slide_outs) ? s(r.slide_outs) + ' slide-outs' : '',
          s(r.usage),
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ItemCard key={i} title={title || `RV ${i + 1}`} sub={sub}>
            <Detail label="Ownership" value={s(r.ownership)} />
            <Detail label="Storage" value={s(r.storage)} />
            <Detail label="VIN" value={s(r.vin)} />
            <Detail label="Mileage" value={s(r.mileage)} />
            <Detail label="Safety features" value={s(r.safety_features)} />
            <Detail label="Attached structures" value={s(r.attached_structures)} />
          </ItemCard>
        );
      })}
    </Section>
  );
}

function BoatsSection({ p }: { p: Payload }) {
  const items = arr(p, 'boats');
  if (!items.length) return null;
  return (
    <Section title={`Boats / Watercraft (${items.length})`}>
      {items.map((b, i) => {
        const title = `${s(b.year)} ${s(b.make)} ${s(b.model)}${b.boat_type ? ' [' + s(b.boat_type) + ']' : ''}`.trim();
        const sub = [
          s(b.length_ft) ? s(b.length_ft) + ' ft' : '',
          s(b.horsepower) ? s(b.horsepower) + ' hp' : '',
          s(b.engines) ? s(b.engines) + ' engine(s)' : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ItemCard key={i} title={title || `Boat ${i + 1}`} sub={sub}>
            <Detail label="HIN" value={s(b.hin)} />
            <Detail label="Ownership" value={s(b.ownership)} />
            <Detail label="Mooring" value={s(b.mooring)} />
            <Detail label="Navigation" value={s(b.navigation)} />
            <Detail label="Use" value={s(b.usage)} />
            <Detail label="Operator experience" value={s(b.experience_years) ? s(b.experience_years) + ' years' : ''} />
            <Detail label="Safety equipment" value={s(b.safety_equipment)} />
          </ItemCard>
        );
      })}
    </Section>
  );
}

function DriversSection({ p }: { p: Payload }) {
  const drivers = arr(p, 'drivers');
  if (!drivers.length) return null;
  return (
    <Section title={`Drivers (${drivers.length})`}>
      {drivers.map((d, i) => {
        const name = `${s(d.first_name)} ${s(d.last_name)}`.trim() || `Driver ${i + 1}`;
        const sub = [
          fmtDate(d.dob) ? 'DOB ' + fmtDate(d.dob) : '',
          s(d.gender),
          s(d.relation || 'Self'),
        ]
          .filter(Boolean)
          .join(' · ');
        const license = [s(d.license_state), s(d.license_number) ? '#' + s(d.license_number) : '', s(d.license_type) ? '(' + s(d.license_type) + ')' : '']
          .filter(Boolean)
          .join(' ');
        const incidents = arr<{ code?: string; date?: string; desc?: string }>(d as Payload, 'incidents');
        return (
          <ItemCard key={i} title={name} tag={d.primary ? 'Primary' : undefined} sub={sub}>
            <Detail label="License" value={license} />
            <Detail label="Marital" value={s(d.marital_status)} />
            <Detail label="Age licensed" value={s(d.age_licensed)} />
            <Detail label="Education" value={s(d.education)} />
            <Detail label="Driver status" value={s(d.driver_status)} />
            {incidents.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ ...styles.itemDetail, ...styles.itemDetailLabel }}>Incidents:</Text>
                {incidents.map((inc, ix) => (
                  <Text key={ix} style={{ ...styles.itemDetail, marginLeft: 8 }}>
                    • {s(inc.code)} on {fmtDate(inc.date)} {inc.desc ? '— ' + s(inc.desc) : ''}
                  </Text>
                ))}
              </View>
            )}
          </ItemCard>
        );
      })}
    </Section>
  );
}

function DriverProfileSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'credit', 'education', 'military', 'age_licensed', 'at_fault', 'speeding', 'claims', 'dui', 'sr22', 'motorcycle_endorsement', 'boating_experience')) {
    return null;
  }
  return (
    <Section title="Driver Profile & Record">
      <View style={styles.kvGrid}>
        <KV label="Credit" value={pick(p, 'credit')} />
        <KV label="Education" value={pick(p, 'education')} />
        <KV label="Military" value={pick(p, 'military')} />
        <KV label="Age first licensed" value={pick(p, 'age_licensed')} />
        <KV label="At-fault accidents (3y)" value={pick(p, 'at_fault')} />
        <KV label="Speeding tickets (3y)" value={pick(p, 'speeding')} />
        <KV label="Other claims" value={pick(p, 'claims')} />
        <KV label="DUI/DWI" value={pick(p, 'dui')} />
        <KV label="SR-22 required" value={pick(p, 'sr22')} />
        <KV label="Motorcycle endorsement" value={pick(p, 'motorcycle_endorsement')} />
        <KV label="Boating experience" value={pick(p, 'boating_experience')} />
      </View>
    </Section>
  );
}

function CurrentInsuranceSection({ p }: { p: Payload }) {
  const has = pick(p, 'has_insurance');
  if (!has) return null;
  return (
    <Section title="Current Insurance">
      <View style={styles.kvGrid}>
        <KV label="Has insurance" value={has} />
        {has === 'Yes' && (
          <>
            <KV label="Carrier" value={pick(p, 'current_carrier')} />
            <KV label="Time with carrier" value={pick(p, 'time_with_carrier')} />
            <KV label="Current BI limits" value={pick(p, 'current_bi')} />
            <KV label="Lapse" value={pick(p, 'lapse')} />
            <KV label="Current premium" value={pick(p, 'current_premium')} />
            <KV label="Policy number" value={pick(p, 'current_policy_number')} />
            <KV label="Policy effective" value={fmtDate(p.current_effective_date)} />
            <KV label="Policy expires" value={fmtDate(p.current_expiration_date)} />
          </>
        )}
        {has === 'No' && (
          <>
            <KV label="Reason" value={pick(p, 'no_ins_reason')} />
            <KV label="Last insured" value={pick(p, 'last_insured')} />
          </>
        )}
      </View>
    </Section>
  );
}

function CoverageSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'effective_date', 'payment_plan', 'bi_limits', 'pd_limit', 'umuim', 'medpay', 'comp_deductible', 'coll_deductible', 'rental', 'roadside', 'cov_accessories', 'cov_total_loss_replacement', 'cov_vacation_liability', 'cov_trip_interruption', 'notes')) {
    return null;
  }
  return (
    <Section title="Coverage Preferences">
      <View style={styles.kvGrid}>
        <KV label="Effective date" value={fmtDate(p.effective_date)} />
        <KV label="Payment plan" value={pick(p, 'payment_plan')} />
        <KV label="BI limits" value={pick(p, 'bi_limits')} />
        <KV label="PD limit" value={pick(p, 'pd_limit')} />
        <KV label="UM/UIM" value={pick(p, 'umuim')} />
        <KV label="Med/PIP" value={pick(p, 'medpay')} />
        <KV label="Comp deductible" value={pick(p, 'comp_deductible')} />
        <KV label="Coll deductible" value={pick(p, 'coll_deductible')} />
        <KV label="Rental reimbursement" value={pick(p, 'rental')} />
        <KV label="Roadside" value={pick(p, 'roadside')} />
        <KV label="Accessory / custom parts" value={pick(p, 'cov_accessories')} />
        <KV label="Total loss replacement" value={pick(p, 'cov_total_loss_replacement')} />
        <KV label="Vacation liability" value={pick(p, 'cov_vacation_liability')} />
        <KV label="Trip interruption" value={pick(p, 'cov_trip_interruption')} />
        <KV label="Notes" value={pick(p, 'notes')} full />
      </View>
    </Section>
  );
}

function DiscountsSection({ p }: { p: Payload }) {
  const discounts = arr<string>(p, 'discounts');
  return (
    <Section title="Discounts">
      <Text style={styles.kvValue}>
        {discounts.length ? discounts.join(', ') : 'None selected'}
      </Text>
      {pick(p, 'training_date') ? (
        <Text style={{ ...styles.kvValue, marginTop: 4, color: MUTED }}>
          Training completed: {fmtDate(p.training_date)}
        </Text>
      ) : null}
    </Section>
  );
}

function CertificationsSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'phone_cert', 'uw_ack', 'uw_no_business_use', 'uw_mods_disclosed', 'uw_garaging_confirmed', 'esignature')) {
    return null;
  }
  return (
    <Section title="Certifications">
      <View style={styles.kvGrid}>
        <KV label="Phone authorization" value={pick(p, 'phone_cert')} />
        <KV label="UW acknowledgment" value={pick(p, 'uw_ack')} />
        <KV label="No business/commercial use" value={pick(p, 'uw_no_business_use')} />
        <KV label="Modifications disclosed" value={pick(p, 'uw_mods_disclosed')} />
        <KV label="Garaging accurate" value={pick(p, 'uw_garaging_confirmed')} />
        <KV label="E-signed by" value={pick(p, 'esignature')} full />
      </View>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Cover band + footer
// ─────────────────────────────────────────────────────────────────────

function Cover({ p, logoSrc }: { p: Payload; logoSrc?: string | Buffer }) {
  const fullName =
    pick(p, 'full_name') ||
    `${pick(p, 'first_name')} ${pick(p, 'last_name')}`.trim() ||
    'New auto quote';
  const ref = pick(p, 'reference', 'reference_number');
  const submitted = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const products = arr<string>(p, 'products_selected')
    .map((x) => x.toUpperCase())
    .join(' / ');
  return (
    <View style={styles.cover}>
      <View style={styles.coverRow}>
        {logoSrc ? <Image src={logoSrc as string} style={styles.logo} /> : null}
      </View>
      <Text style={styles.coverEyebrow}>NEW {products || 'AUTO'} QUOTE REQUEST</Text>
      <Text style={styles.coverTitle}>{fullName}</Text>
      <Text style={styles.coverSubtitle}>
        {pick(p, 'email')} {pick(p, 'phone') ? '· ' + pick(p, 'phone') : ''}
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
        <View style={styles.coverMetaCell}>
          <Text style={styles.coverMetaLabel}>STATE</Text>
          <Text style={styles.coverMetaValue}>{pick(p, 'state') || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function Footer({ refCode }: { refCode?: string }) {
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

// ─────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────

export interface AutoQuotePdfProps {
  payload: Payload;
  // Pass either a logo path/URL or a Buffer (server-side reads file).
  logoSrc?: string | Buffer;
}

export function AutoQuotePdf({ payload, logoSrc }: AutoQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  return (
    <Document title={`OnePoint Auto Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover p={payload} logoSrc={logoSrc} />
        <View style={styles.body}>
          <LeadQualifiersSection p={payload} />
          <ApplicantSection p={payload} />
          <VehiclesSection p={payload} />
          <MotorcyclesSection p={payload} />
          <RvsSection p={payload} />
          <BoatsSection p={payload} />
          <DriversSection p={payload} />
          <DriverProfileSection p={payload} />
          <CurrentInsuranceSection p={payload} />
          <CoverageSection p={payload} />
          <DiscountsSection p={payload} />
          <CertificationsSection p={payload} />
        </View>
        <Footer refCode={ref} />
      </Page>
    </Document>
  );
}
