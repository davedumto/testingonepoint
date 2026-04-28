/* eslint-disable jsx-a11y/alt-text */
// Life-quote PDF. Built on the server in /api/leads/life.
// Payload structure: applicant.*, demographics.*, coverage.*, beneficiaries[],
// health.*, lifestyle.*, doctor.*, body.*, license.*, employment.*, etc.

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

function ApplicantSection({ p }: { p: Payload }) {
  const first = pick(p, 'applicant.first', 'first_name');
  const last = pick(p, 'applicant.last', 'last_name');
  const fullName = [first, last].filter(Boolean).join(' ');
  const ssn = pick(p, 'ssn');
  const ssnMasked = ssn ? '***-**-' + ssn.replace(/\D/g, '').slice(-4) : '';
  return (
    <Section title="Applicant">
      <View style={styles.kvGrid}>
        <KV label="Name" value={fullName} />
        <KV label="DOB" value={fmtDate(pick(p, 'demographics.date_of_birth', 'date_of_birth'))} />
        <KV label="Sex at birth" value={pick(p, 'demographics.sex_at_birth')} />
        <KV label="Email" value={pick(p, 'applicant.email', 'email')} />
        <KV label="Phone" value={pick(p, 'applicant.phone', 'phone')} />
        <KV label="ZIP" value={pick(p, 'demographics.zip', 'postal_code')} />
        <KV label="Country of birth" value={pick(p, 'demographics.country_of_birth')} />
        <KV label="State of birth" value={pick(p, 'demographics.state_of_birth')} />
        <KV label="Citizenship" value={pick(p, 'demographics.citizenship')} />
        <KV label="SSN" value={ssnMasked} />
      </View>
    </Section>
  );
}

function GoalsSection({ p }: { p: Payload }) {
  const goals = arr<string>(p, 'goals.all').map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
  const deps = arr<string>(p, 'dependents.all').map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
  const children = pick(p, 'family.children_under_18');
  const timing = pick(p, 'timing.coverage_timing');
  if (!goals && !deps && !timing) return null;
  return (
    <Section title="Goals & Family">
      <View style={styles.kvGrid}>
        <KV label="Goals" value={goals || 'Not specified'} full />
        <KV label="Dependents" value={deps || 'None'} full />
        {children ? <KV label="Children under 18" value={children} /> : null}
        <KV label="Coverage timing" value={timing} />
      </View>
    </Section>
  );
}

function PlanningSection({ p }: { p: Payload }) {
  const plan = pick(p, 'planning.estate_plan');
  const mort = pick(p, 'planning.remaining_mortgage');
  if (!plan && !mort) return null;
  const mortStr = mort ? '$' + Number(mort).toLocaleString() : '';
  return (
    <Section title="Planning">
      <View style={styles.kvGrid}>
        <KV label="Estate plan / will" value={plan} />
        <KV label="Remaining mortgage" value={mortStr} />
      </View>
    </Section>
  );
}

function EmploymentSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'employment.occupation', 'employment.employer', 'employment.annual_income', 'employment.work_risk_level')) return null;
  return (
    <Section title="Employment & Income">
      <View style={styles.kvGrid}>
        <KV label="Occupation" value={pick(p, 'employment.occupation')} />
        <KV label="Employer" value={pick(p, 'employment.employer')} />
        <KV label="Annual income" value={pick(p, 'employment.annual_income')} />
        <KV label="Work risk level" value={pick(p, 'employment.work_risk_level')} />
      </View>
    </Section>
  );
}

function CoverageSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'coverage.insurance_type', 'coverage.amount', 'coverage.term_length')) return null;
  const purposes = arr<string>(p, 'coverage.purposes').join(', ');
  return (
    <Section title="Coverage">
      <View style={styles.kvGrid}>
        <KV label="Insurance type" value={pick(p, 'coverage.insurance_type')} />
        <KV label="Coverage amount" value={pick(p, 'coverage.amount')} />
        <KV label="Term length" value={pick(p, 'coverage.term_length')} />
        <KV label="Purposes" value={purposes} full />
      </View>
    </Section>
  );
}

function ExistingCoverageSection({ p }: { p: Payload }) {
  const has = pick(p, 'existing_coverage.has_existing');
  if (!has) return null;
  const carriers = arr<string>(p, 'existing_coverage.carriers').join(', ');
  return (
    <Section title="Existing Life Coverage">
      <View style={styles.kvGrid}>
        <KV label="Has existing" value={has} />
        {has === 'Yes' && (
          <>
            <KV label="Carriers" value={carriers} full />
            <KV label="Total amount" value={pick(p, 'existing_coverage.total_amount')} />
            <KV label="Replacement?" value={pick(p, 'existing_coverage.is_replacement')} />
          </>
        )}
      </View>
    </Section>
  );
}

function LicenseSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'license.number', 'license.state', 'license.expiration')) return null;
  return (
    <Section title="Driver's License">
      <View style={styles.kvGrid}>
        <KV label="Number" value={pick(p, 'license.number')} />
        <KV label="State" value={pick(p, 'license.state')} />
        <KV label="Expiration" value={fmtDate(pick(p, 'license.expiration'))} />
      </View>
    </Section>
  );
}

function BodyHealthSection({ p }: { p: Payload }) {
  const ft = pick(p, 'body.height_feet');
  const inch = pick(p, 'body.height_inches');
  const lbs = pick(p, 'body.weight_lbs');
  const smoker = pick(p, 'health.smoker');
  const rating = pick(p, 'health.overall_rating');
  if (!ft && !lbs && !smoker && !rating) return null;
  const height = ft || inch ? `${ft || 0}' ${inch || 0}"` : '';
  const weight = lbs ? `${lbs} lbs` : '';
  return (
    <Section title="Body Metrics & Health">
      <View style={styles.kvGrid}>
        <KV label="Height" value={height} />
        <KV label="Weight" value={weight} />
        <KV label="Smoker" value={smoker} />
        <KV label="Overall health" value={rating} />
      </View>
    </Section>
  );
}

function MedicalHistorySection({ p }: { p: Payload }) {
  const conditions = arr<string>(p, 'health.conditions').join(', ');
  const meds = arr<string>(p, 'health.medications').join(' | ');
  const surgeries = pick(p, 'health.surgeries');
  const family = pick(p, 'health.family_history');
  if (!conditions && !meds && !surgeries && !family) return null;
  return (
    <Section title="Medical History">
      <View style={styles.kvGrid}>
        <KV label="Conditions" value={conditions} full />
        <KV label="Medications" value={meds} full />
        <KV label="Surgeries / hospitalizations" value={surgeries} full />
        <KV label="Family history" value={family} full />
      </View>
    </Section>
  );
}

function LifestyleSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'lifestyle.alcohol_use', 'lifestyle.drug_use', 'lifestyle.dui_history', 'lifestyle.criminal_history')) return null;
  const hobbies = arr<string>(p, 'lifestyle.hobbies').join(', ');
  return (
    <Section title="Lifestyle & Legal">
      <View style={styles.kvGrid}>
        <KV label="Alcohol use" value={pick(p, 'lifestyle.alcohol_use')} />
        <KV label="Recreational drugs (5y)" value={pick(p, 'lifestyle.drug_use')} />
        <KV label="DUI/DWI (5y)" value={pick(p, 'lifestyle.dui_history')} />
        <KV label="Felony / major crime" value={pick(p, 'lifestyle.criminal_history')} />
        <KV label="High-risk hobbies" value={hobbies} full />
      </View>
    </Section>
  );
}

function DoctorSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'doctor.name', 'doctor.phone', 'doctor.email', 'doctor.address')) return null;
  return (
    <Section title="Primary Doctor">
      <View style={styles.kvGrid}>
        <KV label="Name" value={pick(p, 'doctor.name')} />
        <KV label="Phone" value={pick(p, 'doctor.phone')} />
        <KV label="Email" value={pick(p, 'doctor.email')} />
        <KV label="Address" value={pick(p, 'doctor.address')} full />
      </View>
    </Section>
  );
}

interface Beneficiary {
  type?: string;
  first?: string;
  last?: string;
  relationship?: string;
  dob?: string;
  ssn?: string;
  share_percent?: number | string;
  phone?: string;
  address?: string;
}

function BeneficiariesSection({ p }: { p: Payload }) {
  const items = arr<Beneficiary>(p, 'beneficiaries');
  if (!items.length) return null;
  return (
    <Section title={`Beneficiaries (${items.length})`}>
      {items.map((b, i) => {
        const name = `${s(b.first)} ${s(b.last)}`.trim() || `Beneficiary ${i + 1}`;
        const ssn = s(b.ssn);
        const ssnMasked = ssn ? '***-**-' + ssn.replace(/\D/g, '').slice(-4) : '';
        const sub = [s(b.relationship), s(b.share_percent) ? s(b.share_percent) + '%' : '']
          .filter(Boolean)
          .join(' · ');
        return (
          <ItemCard key={i} title={name} tag={s(b.type) || 'Primary'} sub={sub}>
            <Detail label="DOB" value={fmtDate(b.dob)} />
            <Detail label="SSN" value={ssnMasked} />
            <Detail label="Phone" value={s(b.phone)} />
            <Detail label="Address" value={s(b.address)} />
          </ItemCard>
        );
      })}
    </Section>
  );
}

function AttestationsSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'attestations.truthful', 'attestations.quote_acknowledged', 'attestations.tcpa_consent', 'signature.name')) return null;
  return (
    <Section title="Attestations & Signature">
      <View style={styles.kvGrid}>
        <KV label="Truthful" value={pick(p, 'attestations.truthful')} />
        <KV label="Quote acknowledged" value={pick(p, 'attestations.quote_acknowledged')} />
        <KV label="TCPA consent" value={pick(p, 'attestations.tcpa_consent')} />
        <KV label="E-signed by" value={pick(p, 'signature.name')} full />
        <KV label="Signed date" value={fmtDate(pick(p, 'signature.date'))} />
      </View>
    </Section>
  );
}

export interface LifeQuotePdfProps {
  payload: Payload;
  logoSrc?: string | Buffer;
}

export function LifeQuotePdf({ payload, logoSrc }: LifeQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  const fullName =
    [pick(payload, 'applicant.first', 'first_name'), pick(payload, 'applicant.last', 'last_name')]
      .filter(Boolean)
      .join(' ') || 'New life quote';
  const cov = pick(payload, 'coverage.amount');
  return (
    <Document title={`OnePoint Life Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover
          payload={payload}
          logoSrc={logoSrc}
          eyebrow="NEW LIFE QUOTE REQUEST"
          fullName={fullName}
          metaThird={{ label: 'Coverage', value: cov }}
        />
        <View style={styles.body}>
          <ApplicantSection p={payload} />
          <GoalsSection p={payload} />
          <PlanningSection p={payload} />
          <EmploymentSection p={payload} />
          <CoverageSection p={payload} />
          <ExistingCoverageSection p={payload} />
          <BodyHealthSection p={payload} />
          <MedicalHistorySection p={payload} />
          <LifestyleSection p={payload} />
          <LicenseSection p={payload} />
          <DoctorSection p={payload} />
          <BeneficiariesSection p={payload} />
          <AttestationsSection p={payload} />
        </View>
        <Footer refCode={ref} />
      </Page>
    </Document>
  );
}
