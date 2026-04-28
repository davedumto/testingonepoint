/* eslint-disable jsx-a11y/alt-text */
// Auto-quote PDF rendered with @react-pdf/renderer. Built on the server in
// the /api/leads/auto handler; the marketing site never imports this file.
//
// Layout primitives (Cover, Section, KV, ItemCard, Footer, Page, styles)
// come from ./components — every per-product PDF uses the same shapes so
// staff sees one consistent visual language across all 5 products.

import { Document } from '@react-pdf/renderer';
import {
  Page,
  Cover,
  Footer,
  Section,
  KV,
  Detail,
  ItemCard,
  styles,
  s,
  pick,
  anyValue,
  fmtDate,
  arr,
  type Payload,
} from './components';
import { View, Text } from '@react-pdf/renderer';

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
        <Text style={{ ...styles.kvValue, marginTop: 4, color: '#5A6C7E' }}>
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
// Document
// ─────────────────────────────────────────────────────────────────────

export interface AutoQuotePdfProps {
  payload: Payload;
  logoSrc?: string | Buffer;
}

export function AutoQuotePdf({ payload, logoSrc }: AutoQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  const fullName =
    pick(payload, 'full_name') ||
    `${pick(payload, 'first_name')} ${pick(payload, 'last_name')}`.trim() ||
    'New auto quote';
  const products = arr<string>(payload, 'products_selected')
    .map((x) => x.toUpperCase())
    .join(' / ');
  return (
    <Document title={`OnePoint Auto Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover
          payload={payload}
          logoSrc={logoSrc}
          eyebrow={`NEW ${products || 'AUTO'} QUOTE REQUEST`}
          fullName={fullName}
          metaThird={{ label: 'State', value: pick(payload, 'state') }}
        />
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
