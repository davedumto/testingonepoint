'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { secureFetch } from '@/lib/client/secure-fetch';

// Steps reference DOM elements via data-tour attributes. Using attribute
// selectors over fragile class names means layout changes don't break the tour.
interface Step {
  selector: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="greeting"]',
    title: 'Welcome to the Team Hub',
    body: "This is your home base. Your day's meetings, announcements, and tools all live here. Take 30 seconds and we'll show you around.",
    placement: 'bottom',
  },
  {
    selector: '[data-tour="clocks"]',
    title: 'All times are Eastern',
    body: 'Even if you\'re logging in from elsewhere, the portal shows ET so shifts, meetings, and deadlines read the same for everyone.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="products"]',
    title: 'Coverage & Products',
    body: 'Quick reference for our insurance lines, plus shortcuts to Book a Call, the Training Hub, and Learn articles.',
    placement: 'top',
  },
  {
    selector: '[data-tour="tools"]',
    title: 'Quick Access Tools',
    body: 'One click into CRM, Quote Forms, LastPass, Teams, Outlook, and more. The CRM tile handles OAuth automatically.',
    placement: 'top',
  },
  {
    selector: '[data-tour="bell"]',
    title: 'Your notification bell',
    body: 'Real-time alerts appear here, announcements, admin broadcasts, and mentions when someone tags you.',
    placement: 'left',
  },
  {
    selector: '[data-tour="sidebar"]',
    title: 'Getting around',
    body: 'Jump to Conversations, the Team Directory, Meetings, or your Profile from the sidebar. It stays put while you scroll.',
    placement: 'right',
  },
  {
    selector: '[data-tour="greeting"]',
    title: "You're all set",
    body: 'That\'s the tour. You can always open the bell for updates, or head to Profile to complete your details.',
    placement: 'center',
  },
];

const TOTAL = STEPS.length;

const CARD_WIDTH = 360;

// Per-user localStorage key — if two different employees sign in on the
// same browser, each gets shown the tour exactly once.
export function tourStorageKey(userId: string): string {
  return `op_onboarding_done_${userId}`;
}

export default function OnboardingTour({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Position computed after measuring the card. Null while we're still
  // measuring — the card stays visibility:hidden until we commit a position.
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const [completing, setCompleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Step change invalidates the previous position. Hide card until we re-measure.
  useEffect(() => { setCardPos(null); }, [stepIndex]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === TOTAL - 1;

  // Lock page scroll while the tour is up — user has to pay attention.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Recompute the spotlight rect whenever step changes or the window resizes.
  // Challenge: the element may live inside a scrollable container (the dashboard
  // <main> has its own overflow, not the window), and smooth-scrollIntoView
  // finishes on its own timeline. If we read the rect too early, the mask lands
  // in the wrong place and the card is off-screen. Solution: scroll, then poll
  // the rect via requestAnimationFrame until it stabilizes (same value 3 frames
  // in a row) or we timeout at 1.5s.
  useLayoutEffect(() => {
    let cancelled = false;
    // Blank the mask immediately on step change so we don't flash the previous
    // step's cutout while the new element scrolls into view.
    setRect(null);

    function compute() {
      if (cancelled) return;
      if (step.placement === 'center') { setRect(null); return; }

      const targetEl = document.querySelector<HTMLElement>(step.selector);
      if (!targetEl) { setRect(null); return; }
      const el: HTMLElement = targetEl;

      // Only scroll if the element isn't already reasonably in view — avoids
      // an unnecessary animation when a step highlights something already visible.
      const initial = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const mostlyInView =
        initial.top >= 80 && initial.bottom <= vh - 80 &&
        initial.left >= 0 && initial.right <= vw;

      if (!mostlyInView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }

      // Poll the rect until stable or 1.5s elapses.
      const start = performance.now();
      let lastTop = Number.NEGATIVE_INFINITY;
      let lastLeft = Number.NEGATIVE_INFINITY;
      let stableFrames = 0;

      function tick() {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        const moved = Math.abs(r.top - lastTop) > 0.5 || Math.abs(r.left - lastLeft) > 0.5;
        if (moved) {
          stableFrames = 0;
          lastTop = r.top;
          lastLeft = r.left;
        } else {
          stableFrames++;
        }

        // 3 consecutive stable frames or hit timeout — commit the rect.
        if (stableFrames >= 3 || performance.now() - start > 1500) {
          setRect(r);
          return;
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    compute();
    window.addEventListener('resize', compute);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', compute);
    };
  }, [stepIndex, step.selector, step.placement]);

  async function finish() {
    setCompleting(true);
    // Local storage first — guarantees the tour doesn't re-open on reload
    // even if the network call below fails. Server sync is a secondary gate
    // for cross-device consistency.
    try { localStorage.setItem(tourStorageKey(userId), '1'); } catch { /* quota / privacy mode */ }
    try {
      await secureFetch('/api/employee/auth/complete-onboarding', { method: 'POST' });
    } catch { /* non-blocking — tour still dismisses */ }
    setCompleting(false);
    onComplete();
  }

  function next() {
    if (isLast) { void finish(); return; }
    setStepIndex(i => Math.min(TOTAL - 1, i + 1));
  }

  function back() {
    setStepIndex(i => Math.max(0, i - 1));
  }

  // Measure the card once the rect lands, then compute a clamped position.
  // Transform-based centering (translate -50%) can push the card off-screen if
  // the target is near a viewport edge — measuring lets us clamp precisely.
  useLayoutEffect(() => {
    if (step.placement === 'center') return; // centered styles in cardStyle below
    if (!rect) return;
    const card = cardRef.current;
    if (!card) return;

    const cardH = card.offsetHeight;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const m = 16;   // min distance from viewport edge
    const gap = 16; // distance from target rect

    let top: number, left: number;
    switch (step.placement) {
      case 'top':
        top = rect.top - gap - cardH;
        left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - cardH / 2;
        left = rect.left - gap - CARD_WIDTH;
        break;
      case 'right':
      default:
        top = rect.top + rect.height / 2 - cardH / 2;
        left = rect.right + gap;
        break;
    }

    // Clamp so the fully-rendered card stays within the viewport.
    top = Math.max(m, Math.min(vh - cardH - m, top));
    left = Math.max(m, Math.min(vw - CARD_WIDTH - m, left));

    setCardPos({ top, left });
  }, [rect, step.placement]);

  // Centered steps use a simple translate; positioned steps use the measured
  // cardPos. Pre-measurement, the card is rendered hidden so offsetHeight reads.
  const cardStyle: React.CSSProperties = (() => {
    if (step.placement === 'center') {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: CARD_WIDTH,
        maxWidth: 'calc(100vw - 32px)',
      };
    }
    if (cardPos) {
      return {
        position: 'fixed',
        top: cardPos.top,
        left: cardPos.left,
        width: CARD_WIDTH,
        maxWidth: 'calc(100vw - 32px)',
      };
    }
    // Measurement pass — card is rendered but hidden so we can read its height.
    return {
      position: 'fixed',
      top: 0, left: 0,
      width: CARD_WIDTH,
      visibility: 'hidden',
      pointerEvents: 'none',
    };
  })();

  return (
    <>
      {/* Dimmed backdrop with a rectangular cutout around the target.
          SVG mask gives us a crisp cutout that doesn't block clicks in the cutout,
          while the rest of the page is interaction-blocked. */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'auto' }}>
        {rect ? (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={Math.max(0, rect.left - 6)}
                  y={Math.max(0, rect.top - 6)}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx="12"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(5, 40, 71, 0.6)" mask="url(#tour-mask)" />
            <rect
              x={Math.max(0, rect.left - 6)}
              y={Math.max(0, rect.top - 6)}
              width={rect.width + 12}
              height={rect.height + 12}
              rx="12"
              fill="none"
              stroke="#0a3d6b"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 12px rgba(10,61,107,0.5))' }}
            />
          </svg>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 40, 71, 0.6)' }} />
        )}
      </div>

      {/* Step card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        style={{
          ...cardStyle,
          zIndex: 9999,
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 22,
          boxShadow: '0 24px 64px rgba(5, 40, 71, 0.3)',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 8 }}>
          Step {stepIndex + 1} of {TOTAL}
        </p>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 8, letterSpacing: '-0.01em' }}>{step.title}</h2>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, marginBottom: 18 }}>{step.body}</p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: 3,
              background: i === stepIndex ? 'var(--blue)' : i < stepIndex ? 'var(--navy)' : 'var(--line)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <button
            onClick={back}
            disabled={stepIndex === 0}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: 12, opacity: stepIndex === 0 ? 0.4 : 1 }}
          >
            Back
          </button>
          <button
            onClick={next}
            disabled={completing}
            className="btn btn-navy"
            style={{ padding: '8px 18px', fontSize: 12 }}
          >
            {isLast ? (completing ? 'Finishing…' : 'Got it') : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
