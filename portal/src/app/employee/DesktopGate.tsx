'use client';

import { useEffect, useState } from 'react';

const DESKTOP_MIN_PX = 1024;

export default function DesktopGate({ children }: { children: React.ReactNode }) {
  // `null` = not yet determined (SSR / pre-hydration). Render children to
  // avoid flashing the gate on desktop before JS runs.
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (isDesktop === false) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--surface, #f4f7fb)',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: '#fff',
            border: '1px solid #dde4ed',
            padding: '40px 28px',
            textAlign: 'center',
          }}
        >
          <img
            src="/logo.webp"
            alt="OnePoint Insurance Agency"
            style={{ height: 40, width: 'auto', margin: '0 auto 20px', display: 'block' }}
          />
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 20px',
              background: 'rgba(13,148,136,0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#052847', marginBottom: 10 }}>
            Desktop required
          </h1>
          <p style={{ fontSize: 14, color: '#5a6c7e', lineHeight: 1.6, marginBottom: 16 }}>
            The OnePoint Employee Portal needs a desktop or laptop computer. Please sign in from a
            device with a screen at least 1024px wide.
          </p>
          <p style={{ fontSize: 13, color: '#8a9baa', lineHeight: 1.5 }}>
            Time tracking, admin approvals, and app authentication all require the full desktop
            experience for accuracy and security.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
