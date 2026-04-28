/* eslint-disable jsx-a11y/alt-text */
// Business / commercial-quote PDF. Built on the server in /api/leads/business.
// Most complex of the five — covers GL, professional, property, WC, and
// commercial auto. Top-level keys: products, industry, business, contact,
// history, gl, commercial_property, commercial_auto, workers_comp.

import { Document, View, Text } from '@react-pdf/renderer';
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

const fmtMoney = (v: unknown) => {
  const n = Number(v) || 0;
  return n ? '$' + n.toLocaleString() : '';
};

function ProductsBusinessSection({ p }: { p: Payload }) {
  const products = arr<string>(p, 'products.selected').join(', ');
  const workTypes = arr<string>(p, 'industry.construction_work_types').join(', ');
  return (
    <Section title="Coverage & Business">
      <View style={styles.kvGrid}>
        <KV label="Products requested" value={products || 'None'} full />
        <KV label="Industry" value={pick(p, 'industry.category')} />
        <KV label="State" value={pick(p, 'business.state')} />
        <KV label="Construction work types" value={workTypes} full />
      </View>
    </Section>
  );
}

function BusinessSection({ p }: { p: Payload }) {
  const a = (p['business'] as Payload | undefined)?.['primary_address'] as Payload | undefined;
  const addr = a
    ? [pick(a, 'street'), pick(a, 'city'), pick(a, 'state'), pick(a, 'zip')]
        .filter(Boolean)
        .join(', ')
    : '';
  const m = (p['business'] as Payload | undefined)?.['mailing_address'] as Payload | undefined;
  const mailing = m
    ? [pick(m, 'street'), pick(m, 'city'), pick(m, 'state'), pick(m, 'zip')]
        .filter(Boolean)
        .join(', ')
    : '';
  const mailSame = pick(p, 'business.mailing_same');
  return (
    <Section title="Business">
      <View style={styles.kvGrid}>
        <KV label="Legal name" value={pick(p, 'business.legal_name')} />
        <KV label="DBA" value={pick(p, 'business.dba')} />
        <KV label="Ownership structure" value={pick(p, 'business.ownership_structure')} />
        <KV label="Year started" value={pick(p, 'business.year_started')} />
        <KV label="NAICS code" value={pick(p, 'business.naics_code')} />
        <KV label="Other locations outside state" value={pick(p, 'business.other_locations_outside_state')} />
        <KV label="Primary address" value={addr} full />
        <KV label="Mailing same" value={mailSame} />
        {mailSame === 'No' && <KV label="Mailing address" value={mailing} full />}
      </View>
    </Section>
  );
}

function PeopleFinancialsSection({ p }: { p: Payload }) {
  if (
    !anyValue(
      p,
      'business.num_owners',
      'business.num_employees',
      'business.num_full_time',
      'business.num_part_time',
      'business.years_experience',
      'business.expected_revenue',
      'business.expected_payroll',
      'business.subcontractor_payroll',
    )
  ) {
    return null;
  }
  return (
    <Section title="People & Financials">
      <View style={styles.kvGrid}>
        <KV label="Owners" value={pick(p, 'business.num_owners')} />
        <KV label="Employees" value={pick(p, 'business.num_employees')} />
        <KV label="Full-time" value={pick(p, 'business.num_full_time')} />
        <KV label="Part-time" value={pick(p, 'business.num_part_time')} />
        <KV label="Years of experience" value={pick(p, 'business.years_experience')} />
        <KV label="Expected revenue (12mo)" value={fmtMoney(pick(p, 'business.expected_revenue'))} />
        <KV label="Expected payroll (12mo)" value={fmtMoney(pick(p, 'business.expected_payroll'))} />
        <KV label="Subcontractor payroll (12mo)" value={fmtMoney(pick(p, 'business.subcontractor_payroll'))} />
      </View>
    </Section>
  );
}

function ContactSection({ p }: { p: Payload }) {
  return (
    <Section title="Contact">
      <View style={styles.kvGrid}>
        <KV label="Name" value={`${pick(p, 'contact.first_name')} ${pick(p, 'contact.last_name')}`.trim()} />
        <KV label="Email" value={pick(p, 'contact.email')} />
        <KV label="Phone" value={pick(p, 'contact.phone')} />
      </View>
    </Section>
  );
}

function HistorySection({ p }: { p: Payload }) {
  if (!anyValue(p, 'history.prior_claims_3yr', 'history.prior_cancelled', 'history.prior_issues', 'history.coverage_start_date')) return null;
  return (
    <Section title="Insurance History">
      <View style={styles.kvGrid}>
        <KV label="Prior claims (3yr)" value={pick(p, 'history.prior_claims_3yr')} />
        <KV label="Prior cancelled / non-renewed" value={pick(p, 'history.prior_cancelled')} />
        <KV label="Other issues (felony, bankruptcy, etc.)" value={pick(p, 'history.prior_issues')} full />
        <KV label="Coverage start date" value={fmtDate(pick(p, 'history.coverage_start_date'))} />
      </View>
    </Section>
  );
}

function GeneralLiabilitySection({ p }: { p: Payload }) {
  if (!p.gl) return null;
  const umbrella = pick(p, 'gl.umbrella');
  const limit = pick(p, 'gl.umbrella_limit');
  return (
    <Section title="General Liability">
      <View style={styles.kvGrid}>
        <KV label="Umbrella" value={umbrella === 'Yes' && limit ? `Yes (${limit})` : umbrella} />
        <KV label="Subcontractor coverage" value={pick(p, 'gl.subcontractor_coverage')} />
        <KV label="Sub activities (blasting / etc.)" value={pick(p, 'gl.subcontractor_activities')} full />
        <KV label="Sub requirements accepted" value={pick(p, 'gl.subcontractor_requirements_accepted')} />
      </View>
    </Section>
  );
}

function CommercialPropertySection({ p }: { p: Payload }) {
  if (!p.commercial_property) return null;
  const b = (p['commercial_property'] as Payload | undefined)?.['building'] as Payload | undefined;
  const protective = b ? arr<string>(b, 'protective_devices').map((k) => k.replace(/_/g, ' ')).join(', ') : '';
  return (
    <Section title="Commercial Property">
      <View style={styles.kvGrid}>
        <KV label="Location type" value={pick(p, 'commercial_property.location_type')} />
        <KV label="Property value" value={fmtMoney(pick(p, 'commercial_property.property_value'))} />
        <KV label="Tools & equipment value" value={fmtMoney(pick(p, 'commercial_property.tools_equipment_value'))} />
      </View>
      {b && (
        <ItemCard title="Building">
          <Detail label="Multi-units" value={pick(b, 'multi_units')} />
          <Detail label="Floors" value={pick(b, 'floors')} />
          <Detail label="Construction" value={pick(b, 'construction')} />
          <Detail label="Year built" value={pick(b, 'year_built')} />
          <Detail label="Square footage" value={pick(b, 'square_footage')} />
          <Detail label="Fire sprinklers" value={pick(b, 'fire_sprinklers')} />
          <Detail label="Aluminum wiring" value={pick(b, 'aluminum_wiring')} />
          <Detail label="Under renovation" value={pick(b, 'under_renovation')} />
          <Detail label="Protective devices" value={protective} />
        </ItemCard>
      )}
      {anyValue(p, 'commercial_property.services.woodworking', 'commercial_property.services.welding_metal_work') && (
        <ItemCard title="On-premise services">
          <Detail label="Woodworking" value={pick(p, 'commercial_property.services.woodworking')} />
          <Detail label="Welding / metal work" value={pick(p, 'commercial_property.services.welding_metal_work')} />
        </ItemCard>
      )}
    </Section>
  );
}

function WorkersCompSection({ p }: { p: Payload }) {
  if (!p.workers_comp) return null;
  return (
    <Section title="Workers' Compensation">
      <View style={styles.kvGrid}>
        <KV label="FEIN" value={pick(p, 'workers_comp.fein')} />
        <KV label="Employer liability limits" value={pick(p, 'workers_comp.employer_liability_limits')} />
        <KV label="Deductible" value={pick(p, 'workers_comp.deductible')} />
        <KV label="Waiver of subrogation" value={pick(p, 'workers_comp.waiver_of_subrogation')} />
        <KV label="Description of operations" value={pick(p, 'workers_comp.description_of_operations')} full />
      </View>
    </Section>
  );
}

interface Vehicle {
  year?: string;
  make?: string;
  model?: string;
  vin?: string;
  type?: string;
  gvw?: number | string;
  garaging_zip?: string;
  radius?: string;
  personal_use?: string;
  towing?: string;
  comp_coll?: string;
  stated_value?: number | string;
  ownership?: string;
}

interface Driver {
  first?: string;
  last?: string;
  role?: string;
  date_of_birth?: string;
  license_state?: string;
  cdl?: string;
  sr22?: string;
}

function CommercialAutoSection({ p }: { p: Payload }) {
  if (!p.commercial_auto) return null;
  const vehicles = arr<Vehicle>(p, 'commercial_auto.vehicles');
  const drivers = arr<Driver>(p, 'commercial_auto.drivers');
  const ownerDob = pick(p, 'commercial_auto.owner.date_of_birth');
  const optLabels: Record<string, string> = {
    rental_reimbursement: 'Rental',
    fire_theft: 'Fire & Theft',
    motor_truck_cargo: 'Cargo',
    hired_auto: 'Hired auto',
    non_owned_auto: 'Non-owned auto',
    trailer_interchange: 'Trailer interchange',
    non_owned_trailer_phys_dmg: 'Non-owned trailer PD',
  };
  const opt = (p['commercial_auto'] as Payload | undefined)?.['optional_coverages'] as Payload | undefined;
  const optList = opt
    ? Object.entries(optLabels)
        .filter(([k]) => opt[k] === true)
        .map(([, v]) => v)
        .join(', ')
    : '';
  return (
    <Section title="Commercial Auto">
      <View style={styles.kvGrid}>
        <KV label="USDOT status" value={pick(p, 'commercial_auto.usdot_status')} />
        <KV label="USDOT number" value={pick(p, 'commercial_auto.usdot_number')} />
        <KV label="Business type" value={pick(p, 'commercial_auto.business_type')} />
        <KV label="Operations" value={pick(p, 'commercial_auto.operations')} full />
        <KV label="Owner DOB" value={fmtDate(ownerDob)} />
        <KV label="Owner marital" value={pick(p, 'commercial_auto.owner.marital_status')} />
        <KV label="Owner is driver" value={pick(p, 'commercial_auto.owner.is_driver')} />
        <KV label="Business phone" value={pick(p, 'commercial_auto.owner.business_phone')} />
        <KV label="Liability" value={`${pick(p, 'commercial_auto.coverage.liability_type')} ${pick(p, 'commercial_auto.coverage.liability_limit')}`.trim()} />
        <KV label="UM/UIM" value={pick(p, 'commercial_auto.coverage.umuim')} />
        <KV label="Comp deductible" value={pick(p, 'commercial_auto.coverage.comp_deductible')} />
        <KV label="Coll deductible" value={pick(p, 'commercial_auto.coverage.coll_deductible')} />
        <KV label="Optional coverages" value={optList || 'None'} full />
      </View>
      {vehicles.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ ...styles.kvLabel, marginBottom: 6 }}>Vehicles ({vehicles.length})</Text>
          {vehicles.map((v, i) => {
            const title = `${s(v.year)} ${s(v.make)} ${s(v.model)}`.trim() || `Vehicle ${i + 1}`;
            const sub = [s(v.type), s(v.radius)].filter(Boolean).join(' · ');
            return (
              <ItemCard key={i} title={title} sub={sub}>
                <Detail label="VIN" value={s(v.vin)} />
                <Detail label="GVW" value={s(v.gvw) ? s(v.gvw) + ' lbs' : ''} />
                <Detail label="Garaging ZIP" value={s(v.garaging_zip)} />
                <Detail label="Personal use" value={s(v.personal_use)} />
                <Detail label="Towing/repo" value={s(v.towing)} />
                <Detail label="Comp/Coll" value={s(v.comp_coll)} />
                <Detail label="Stated value" value={fmtMoney(v.stated_value)} />
                <Detail label="Ownership" value={s(v.ownership)} />
              </ItemCard>
            );
          })}
        </View>
      )}
      {drivers.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ ...styles.kvLabel, marginBottom: 6 }}>Drivers ({drivers.length})</Text>
          {drivers.map((d, i) => {
            const name = `${s(d.first)} ${s(d.last)}`.trim() || `Driver ${i + 1}`;
            const sub = s(d.role);
            return (
              <ItemCard key={i} title={name} sub={sub}>
                <Detail label="DOB" value={fmtDate(d.date_of_birth)} />
                <Detail label="License state" value={s(d.license_state)} />
                <Detail label="CDL" value={s(d.cdl)} />
                <Detail label="SR-22 required" value={s(d.sr22)} />
              </ItemCard>
            );
          })}
        </View>
      )}
      {anyValue(p, 'commercial_auto.driving_history.accidents_3yr', 'commercial_auto.driving_history.traffic_convictions_3yr', 'commercial_auto.driving_history.major_violations_5yr') && (
        <ItemCard title="Driving history (all drivers)">
          <Detail label="At-fault accidents (3y)" value={pick(p, 'commercial_auto.driving_history.accidents_3yr')} />
          <Detail label="Traffic convictions (3y)" value={pick(p, 'commercial_auto.driving_history.traffic_convictions_3yr')} />
          <Detail label="Major violations (5y)" value={pick(p, 'commercial_auto.driving_history.major_violations_5yr')} />
        </ItemCard>
      )}
    </Section>
  );
}

function AttestationsSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'attestations.truthful', 'attestations.quote_acknowledged', 'attestations.tcpa_consent_final', 'signature.name')) return null;
  return (
    <Section title="Attestations & Signature">
      <View style={styles.kvGrid}>
        <KV label="Truthful" value={pick(p, 'attestations.truthful')} />
        <KV label="Quote acknowledged" value={pick(p, 'attestations.quote_acknowledged')} />
        <KV label="TCPA consent" value={pick(p, 'attestations.tcpa_consent_final')} />
        <KV label="E-signed by" value={pick(p, 'signature.name')} full />
        <KV label="Signed date" value={fmtDate(pick(p, 'signature.date'))} />
      </View>
    </Section>
  );
}

export interface BusinessQuotePdfProps {
  payload: Payload;
  logoSrc?: string | Buffer;
}

export function BusinessQuotePdf({ payload, logoSrc }: BusinessQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  const fullName =
    pick(payload, 'business.legal_name') ||
    `${pick(payload, 'contact.first_name')} ${pick(payload, 'contact.last_name')}`.trim() ||
    'New business quote';
  const products = arr<string>(payload, 'products.selected').join(' / ');
  return (
    <Document title={`OnePoint Business Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover
          payload={payload}
          logoSrc={logoSrc}
          eyebrow="NEW BUSINESS QUOTE REQUEST"
          fullName={fullName}
          metaThird={{ label: 'Products', value: products }}
        />
        <View style={styles.body}>
          <ProductsBusinessSection p={payload} />
          <BusinessSection p={payload} />
          <PeopleFinancialsSection p={payload} />
          <ContactSection p={payload} />
          <HistorySection p={payload} />
          <GeneralLiabilitySection p={payload} />
          <CommercialPropertySection p={payload} />
          <WorkersCompSection p={payload} />
          <CommercialAutoSection p={payload} />
          <AttestationsSection p={payload} />
        </View>
        <Footer refCode={ref} />
      </Page>
    </Document>
  );
}
