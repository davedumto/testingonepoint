// Server-side PDF generation. Wraps @react-pdf/renderer and reads the brand
// logo once per process (file is bundled in /public).
//
// Used by the public lead-intake API to produce a polished PDF the staff
// inbox links to and the lead can download from the success screen.

import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { AutoQuotePdf } from './auto-quote-pdf';

let cachedLogo: string | undefined;

// react-pdf accepts a base64 data URL or a remote URL. We embed as base64 so
// the renderer never reaches out across the network at request time.
function getLogoDataUrl(): string | undefined {
  if (cachedLogo) return cachedLogo;
  try {
    // White-on-dark variant — the cover band is navy and the standard
    // color logo blends into it. Same file the marketing-site footer
    // uses (ghl/snippet-footer.html).
    const p = path.join(process.cwd(), 'public', 'logo-footer.png');
    const buf = readFileSync(p);
    cachedLogo = `data:image/png;base64,${buf.toString('base64')}`;
    return cachedLogo;
  } catch {
    // Logo missing (e.g. in tests) — render header without it.
    return undefined;
  }
}

export async function renderAutoQuotePdf(payload: Record<string, unknown>): Promise<Buffer> {
  const logoSrc = getLogoDataUrl();
  // AutoQuotePdf renders a <Document>, but TS infers the wrapper component
  // type. Cast through to the renderer's expected element type.
  const element = React.createElement(AutoQuotePdf, { payload, logoSrc }) as unknown as React.ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
