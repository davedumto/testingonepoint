// Server-side PDF rendering. Wraps @react-pdf/renderer and reads the brand
// logo once per process (file is bundled in /public).
//
// Used by the public lead-intake API to produce a polished PDF the staff
// inbox links to and the lead can download from the success screen.

import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { AutoQuotePdf } from './auto-quote-pdf';
import { HomeQuotePdf } from './home-quote-pdf';
import { LifeQuotePdf } from './life-quote-pdf';
import { HealthQuotePdf } from './health-quote-pdf';
import { BusinessQuotePdf } from './business-quote-pdf';
import type { LeadType } from '../email';

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

// Per-type PDF dispatch. AutoQuotePdf etc. all return a <Document> rooted
// element; we cast through the renderer's expected type because each
// product's wrapper has a different inferred React type.
type RendererProps = { payload: Record<string, unknown>; logoSrc?: string };
type Renderer = (props: RendererProps) => React.ReactElement;

const RENDERERS: Record<LeadType, Renderer> = {
  auto: AutoQuotePdf as unknown as Renderer,
  home: HomeQuotePdf as unknown as Renderer,
  life: LifeQuotePdf as unknown as Renderer,
  health: HealthQuotePdf as unknown as Renderer,
  business: BusinessQuotePdf as unknown as Renderer,
};

// Render the right PDF for the given lead type. Throws on unknown types,
// which the route catches.
export async function renderQuotePdf(
  type: LeadType,
  payload: Record<string, unknown>,
): Promise<Buffer> {
  const Component = RENDERERS[type];
  if (!Component) throw new Error(`No PDF renderer for lead type "${type}"`);
  const logoSrc = getLogoDataUrl();
  const element = React.createElement(Component, { payload, logoSrc }) as unknown as React.ReactElement<DocumentProps>;
  return renderToBuffer(element);
}

// Back-compat alias so older imports don't break.
export async function renderAutoQuotePdf(payload: Record<string, unknown>): Promise<Buffer> {
  return renderQuotePdf('auto', payload);
}
