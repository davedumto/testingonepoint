/* eslint-disable jsx-a11y/alt-text */
// Homeowners-quote PDF. Built on the server in /api/leads/home.
// Payload is nested: property.address.*, property.dwelling.*, applicant.*,
// coverage.*, policy.*. Top-level flat fields (first_name, etc.) are also
// present from the marketing form's GHL-mapping helper.

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

function QuickQuoteSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'quick_quote.zip', 'quick_quote.property_type', 'quick_quote.current_insurer', 'quick_quote.personal_property_value', 'quick_quote.gender', 'quick_quote.marital_status', 'quick_quote.military', 'quick_quote.rental_type')) return null;
  return (
    <Section title="Quick Quote">
      <View style={styles.kvGrid}>
        <KV label="ZIP" value={pick(p, 'quick_quote.zip', 'postal_code')} />
        <KV label="Property type" value={pick(p, 'quick_quote.property_type')} />
        <KV label="Rental type" value={pick(p, 'quick_quote.rental_type')} />
        <KV label="Current insurer" value={pick(p, 'quick_quote.current_insurer')} />
        <KV label="Personal property value" value={pick(p, 'quick_quote.personal_property_value')} />
        <KV label="Gender" value={pick(p, 'quick_quote.gender')} />
        <KV label="Marital status" value={pick(p, 'quick_quote.marital_status')} />
        <KV label="Military" value={pick(p, 'quick_quote.military')} />
      </View>
    </Section>
  );
}

function ApplicantSection({ p }: { p: Payload }) {
  const first = pick(p, 'applicant.first', 'first_name');
  const middle = pick(p, 'applicant.middle');
  const last = pick(p, 'applicant.last', 'last_name');
  const fullName = [first, middle, last].filter(Boolean).join(' ');
  const ssnMasked = (() => {
    const has = pick(p, 'applicant.has_ssn');
    if (has !== 'Yes') return 'Not provided';
    const ssn = pick(p, 'applicant.ssn');
    return ssn ? '***-**-' + ssn.replace(/\D/g, '').slice(-4) : '—';
  })();
  return (
    <Section title="Applicant">
      <View style={styles.kvGrid}>
        <KV label="Name" value={fullName} />
        <KV label="DOB" value={fmtDate(pick(p, 'applicant.dob', 'date_of_birth'))} />
        <KV label="SSN" value={ssnMasked} />
        <KV label="Phone" value={pick(p, 'applicant.phone', 'phone')} />
        <KV label="Email" value={pick(p, 'applicant.email', 'email')} />
        <KV label="Occupation" value={pick(p, 'applicant.occupation')} />
        <KV label="Employer" value={pick(p, 'applicant.employer')} />
      </View>
    </Section>
  );
}

function PropertyAddressSection({ p }: { p: Payload }) {
  const street = pick(p, 'property.address.street', 'address1');
  const apt = pick(p, 'property.address.apt');
  const city = pick(p, 'property.address.city', 'city');
  const state = pick(p, 'property.address.state', 'state');
  const zip = pick(p, 'property.address.zip', 'postal_code');
  const county = pick(p, 'property.address.county');
  const fullStreet = apt ? `${street} Apt ${apt}` : street;
  const cityStateZip = [city, state].filter(Boolean).join(', ') + (zip ? ' ' + zip : '');
  const mailSame = pick(p, 'property.address.mailing_same');
  const mStreet = pick(p, 'property.address.mailing.street');
  const mApt = pick(p, 'property.address.mailing.apt');
  const mCity = pick(p, 'property.address.mailing.city');
  const mState = pick(p, 'property.address.mailing.state');
  const mZip = pick(p, 'property.address.mailing.zip');
  const mFull = mStreet
    ? `${mApt ? mStreet + ' Apt ' + mApt : mStreet}, ${[mCity, mState].filter(Boolean).join(', ')}${mZip ? ' ' + mZip : ''}`
    : '';
  return (
    <Section title="Property Address">
      <View style={styles.kvGrid}>
        <KV label="Street" value={fullStreet} full />
        <KV label="City / State / ZIP" value={cityStateZip} />
        <KV label="County" value={county} />
        <KV label="Mailing same as property" value={mailSame} />
        {mailSame === 'No' && <KV label="Mailing address" value={mFull} full />}
      </View>
    </Section>
  );
}

function DwellingSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'property.dwelling.year_built', 'property.dwelling.sqft', 'property.dwelling.stories', 'property.dwelling.construction', 'property.dwelling.roof_material')) return null;
  const roofUpdated = pick(p, 'property.dwelling.roof_updated');
  const roofYear = pick(p, 'property.dwelling.roof_year');
  return (
    <Section title="Dwelling Details">
      <View style={styles.kvGrid}>
        <KV label="Year built" value={pick(p, 'property.dwelling.year_built')} />
        <KV label="Square footage" value={pick(p, 'property.dwelling.sqft')} />
        <KV label="Stories" value={pick(p, 'property.dwelling.stories')} />
        <KV label="Construction" value={pick(p, 'property.dwelling.construction')} />
        <KV label="Foundation" value={pick(p, 'property.dwelling.foundation')} />
        <KV label="Roof material" value={pick(p, 'property.dwelling.roof_material')} />
        <KV label="Roof updated" value={roofUpdated === 'Yes' && roofYear ? `Yes (${roofYear})` : roofUpdated} />
        <KV label="Heat source" value={pick(p, 'property.dwelling.heat_source')} />
        <KV label="Fuel" value={pick(p, 'property.dwelling.fuel')} />
        <KV label="Use" value={pick(p, 'property.dwelling.use')} />
      </View>
    </Section>
  );
}

function EligibilitySection({ p }: { p: Payload }) {
  if (!anyValue(p, 'property.dwelling.pool', 'property.dwelling.trampoline', 'property.dwelling.dogs', 'property.dwelling.business', 'property.dwelling.damage', 'property.dwelling.renovation')) return null;
  return (
    <Section title="Eligibility">
      <View style={styles.kvGrid}>
        <KV label="Swimming pool" value={pick(p, 'property.dwelling.pool')} />
        <KV label="Trampoline" value={pick(p, 'property.dwelling.trampoline')} />
        <KV label="Dog bite history / restricted breeds" value={pick(p, 'property.dwelling.dogs')} full />
        <KV label="Business on premises" value={pick(p, 'property.dwelling.business')} />
        <KV label="Existing damage" value={pick(p, 'property.dwelling.damage')} />
        <KV label="Under renovation" value={pick(p, 'property.dwelling.renovation')} />
      </View>
    </Section>
  );
}

function SecurityCoastSection({ p }: { p: Payload }) {
  const security = arr<string>(p, 'property.security').map((k) => k.replace(/_/g, ' ')).join(', ');
  const coastline = pick(p, 'property.coastline_distance');
  if (!security && !coastline) return null;
  return (
    <Section title="Security & Location">
      <View style={styles.kvGrid}>
        <KV label="Security devices" value={security || 'None listed'} full />
        <KV label="Distance to coastline" value={coastline} />
      </View>
    </Section>
  );
}

function HistorySection({ p }: { p: Payload }) {
  const claims = pick(p, 'history.claims_5yr');
  const claimInfo = pick(p, 'history.claim_info');
  const cancelled = pick(p, 'history.canceled_5yr');
  if (!claims && !cancelled) return null;
  return (
    <Section title="Loss History">
      <View style={styles.kvGrid}>
        <KV label="Claims in past 5 yrs" value={claims} />
        <KV label="Cancelled / non-renewed (5y)" value={cancelled} />
        <KV label="Claim details" value={claimInfo} full />
      </View>
    </Section>
  );
}

function CoverageSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'coverage.dwelling_amount', 'coverage.deductible', 'coverage.liability', 'coverage.loss_of_use', 'coverage.replacement_cost')) return null;
  const addons = arr<string>(p, 'coverage.addons').map((k) => k.replace(/_/g, ' ')).join(', ');
  return (
    <Section title="Coverage Preferences">
      <View style={styles.kvGrid}>
        <KV label="Dwelling amount" value={pick(p, 'coverage.dwelling_amount')} />
        <KV label="Deductible" value={pick(p, 'coverage.deductible')} />
        <KV label="Liability limit" value={pick(p, 'coverage.liability')} />
        <KV label="Loss of Use (Cov D)" value={pick(p, 'coverage.loss_of_use')} />
        <KV label="Replacement cost coverage" value={pick(p, 'coverage.replacement_cost')} />
        <KV label="Add-ons" value={addons || 'None'} full />
      </View>
    </Section>
  );
}

function PolicySection({ p }: { p: Payload }) {
  const ai = pick(p, 'policy.additional_insured');
  const hasMort = pick(p, 'policy.has_mortgage');
  if (!anyValue(p, 'policy.additional_insured', 'policy.has_mortgage', 'policy.effective_date', 'policy.payment_mode')) return null;
  const aiName = pick(p, 'policy.ai_name');
  const aiRel = pick(p, 'policy.ai_rel');
  const aiCompany = pick(p, 'policy.ai_company');
  const aiAddress = pick(p, 'policy.ai_address');
  return (
    <Section title="Policy">
      <View style={styles.kvGrid}>
        <KV label="Additional insured" value={ai} />
        <KV label="Has mortgage" value={hasMort} />
        <KV label="Effective date" value={fmtDate(pick(p, 'policy.effective_date'))} />
        <KV label="Payment mode" value={pick(p, 'policy.payment_mode')} />
      </View>
      {ai === 'Yes' && (aiName || aiRel) && (
        <ItemCard title={aiName || 'Additional insured'} sub={aiRel}>
          <Detail label="Company" value={aiCompany} />
          <Detail label="Address" value={aiAddress} />
        </ItemCard>
      )}
      {hasMort === 'Yes' && (
        <ItemCard title={pick(p, 'policy.mort_company') || 'Mortgagee'}>
          <Detail label="Loan #" value={pick(p, 'policy.mort_loan')} />
          <Detail label="Address" value={pick(p, 'policy.mort_address')} />
        </ItemCard>
      )}
    </Section>
  );
}

function AttachmentsSection({ p }: { p: Payload }) {
  const doc = (p['policy'] as Payload | undefined)?.['current_policy_document'] as
    | { name?: string; url?: string }
    | null
    | undefined;
  if (!doc?.name) return null;
  return (
    <Section title="Attached Documents">
      <View style={styles.kvGrid}>
        <KV label="Current policy" value={String(doc.name)} />
        <KV label="URL" value={String(doc.url || '')} full />
      </View>
    </Section>
  );
}

function AttestationsSection({ p }: { p: Payload }) {
  if (!anyValue(p, 'attestations.truthful', 'attestations.quote_unbound_acknowledged', 'attestations.tcpa_consent', 'signature.name')) return null;
  return (
    <Section title="Attestations & Signature">
      <View style={styles.kvGrid}>
        <KV label="Truthful" value={pick(p, 'attestations.truthful')} />
        <KV label="Quote unbound acknowledged" value={pick(p, 'attestations.quote_unbound_acknowledged')} />
        <KV label="TCPA consent" value={pick(p, 'attestations.tcpa_consent')} />
        <KV label="E-signed by" value={pick(p, 'signature.name')} full />
        <KV label="Signed date" value={fmtDate(pick(p, 'signature.date'))} />
      </View>
    </Section>
  );
}

export interface HomeQuotePdfProps {
  payload: Payload;
  logoSrc?: string | Buffer;
}

export function HomeQuotePdf({ payload, logoSrc }: HomeQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  const fullName = [
    pick(payload, 'applicant.first', 'first_name'),
    pick(payload, 'applicant.last', 'last_name'),
  ]
    .filter(Boolean)
    .join(' ') || 'New homeowners quote';
  const propType = pick(payload, 'quick_quote.property_type');
  return (
    <Document title={`OnePoint Homeowners Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover
          payload={payload}
          logoSrc={logoSrc}
          eyebrow="NEW HOMEOWNERS QUOTE REQUEST"
          fullName={fullName}
          metaThird={{ label: 'Property type', value: propType }}
        />
        <View style={styles.body}>
          <QuickQuoteSection p={payload} />
          <ApplicantSection p={payload} />
          <PropertyAddressSection p={payload} />
          <DwellingSection p={payload} />
          <EligibilitySection p={payload} />
          <SecurityCoastSection p={payload} />
          <HistorySection p={payload} />
          <CoverageSection p={payload} />
          <PolicySection p={payload} />
          <AttachmentsSection p={payload} />
          <AttestationsSection p={payload} />
        </View>
        <Footer refCode={ref} />
      </Page>
    </Document>
  );
}
