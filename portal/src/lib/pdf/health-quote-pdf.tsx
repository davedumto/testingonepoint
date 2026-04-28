/* eslint-disable jsx-a11y/alt-text */
// Health-quote PDF (ACA). Built on the server in /api/leads/health.
// The marketing form sends a flat payload (first_name, postal_code, etc.)
// plus a `full_submission` text blob that carries household members,
// income sources, eligibility, signatures — everything the staff needs.
// We render the flat fields as a KV grid + drop full_submission into a
// monospace block so nothing is lost.

import { Document, View, Text } from '@react-pdf/renderer';
import {
  Page,
  Cover,
  Footer,
  Section,
  KV,
  styles,
  pick,
  fmtDate,
  type Payload,
  MUTED,
  BORDER,
  BAND,
} from './components';

function ApplicantSection({ p }: { p: Payload }) {
  const fullName = `${pick(p, 'first_name')} ${pick(p, 'last_name')}`.trim();
  return (
    <Section title="Applicant">
      <View style={styles.kvGrid}>
        <KV label="Name" value={fullName} />
        <KV label="DOB" value={fmtDate(pick(p, 'date_of_birth'))} />
        <KV label="Email" value={pick(p, 'email')} />
        <KV label="Phone" value={pick(p, 'phone')} />
        <KV
          label="Address"
          value={[pick(p, 'address1'), pick(p, 'city'), pick(p, 'state'), pick(p, 'postal_code')]
            .filter(Boolean)
            .join(', ')}
          full
        />
      </View>
    </Section>
  );
}

// The health form pre-builds a rich text dump in `full_submission` (household
// members, citizenship, income, eligibility, plan prefs, signature). Render
// it verbatim in a code block so staff has every field even though the
// structured payload is intentionally flat.
function FullSubmissionSection({ p }: { p: Payload }) {
  const text = pick(p, 'full_submission', 'email_body');
  if (!text) return null;
  return (
    <Section title="Full Submission">
      <View
        style={{
          backgroundColor: BAND,
          borderWidth: 1,
          borderColor: BORDER,
          borderStyle: 'solid',
          borderRadius: 3,
          padding: 10,
        }}
      >
        <Text style={{ fontFamily: 'Courier', fontSize: 8, color: '#1A2E42', lineHeight: 1.4 }}>
          {text}
        </Text>
      </View>
    </Section>
  );
}

function MetaSection({ p }: { p: Payload }) {
  const ref = pick(p, 'reference', 'reference_number');
  const source = pick(p, 'source');
  const submitted = pick(p, 'submitted_at');
  if (!ref && !source) return null;
  return (
    <Section title="Submission Details">
      <View style={styles.kvGrid}>
        <KV label="Reference" value={ref} />
        <KV label="Source" value={source} />
        <KV label="Submitted at" value={fmtDate(submitted) || submitted} />
      </View>
      <Text style={{ fontSize: 8, color: MUTED, marginTop: 6 }}>
        Detailed household, eligibility, plan-preference, and signature data is included in the
        Full Submission section below.
      </Text>
    </Section>
  );
}

export interface HealthQuotePdfProps {
  payload: Payload;
  logoSrc?: string | Buffer;
}

export function HealthQuotePdf({ payload, logoSrc }: HealthQuotePdfProps) {
  const ref = pick(payload, 'reference', 'reference_number');
  const fullName =
    `${pick(payload, 'first_name')} ${pick(payload, 'last_name')}`.trim() || 'New health quote';
  return (
    <Document title={`OnePoint Health Quote ${ref || ''}`.trim()}>
      <Page size="LETTER" style={styles.page} wrap>
        <Cover
          payload={payload}
          logoSrc={logoSrc}
          eyebrow="NEW HEALTH QUOTE REQUEST"
          fullName={fullName}
          metaThird={{ label: 'State', value: pick(payload, 'state') }}
        />
        <View style={styles.body}>
          <ApplicantSection p={payload} />
          <MetaSection p={payload} />
          <FullSubmissionSection p={payload} />
        </View>
        <Footer refCode={ref} />
      </Page>
    </Document>
  );
}
