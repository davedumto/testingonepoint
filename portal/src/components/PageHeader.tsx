// Shared page-header block for every dashboard destination page.
// Keeps the typographic scale consistent: uppercase eyebrow, large tight
// headline, supportive description. An optional trailing slot holds actions
// (filters, "new" buttons) aligned to the right on desktop.

import type { ReactNode } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 28,
    }}>
      <div style={{ maxWidth: 640 }}>
        {eyebrow && (
          <p style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--blue)',
            marginBottom: 8,
          }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--navy)',
          letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>
          {title}
        </h1>
        {description && (
          <p style={{
            color: 'var(--muted)',
            fontSize: 15,
            marginTop: 8,
            lineHeight: 1.55,
          }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
