import { TIER_META, type ClientTier } from '@/lib/tier-meta';

interface Props {
  tier?: ClientTier | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Reusable tier chip. Renders nothing if tier is unset (a client with 0
// active policies — they shouldn't see a "Bronze" badge by mistake).
export default function TierBadge({ tier, size = 'md', showLabel = true }: Props) {
  if (!tier) return null;
  const meta = TIER_META[tier];

  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  const padding = size === 'sm' ? '3px 8px' : size === 'lg' ? '6px 14px' : '4px 10px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding,
      borderRadius: 999,
      background: meta.bg,
      color: meta.color,
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.04em',
      lineHeight: 1.2,
    }}>
      <span aria-hidden style={{ fontSize: fontSize + 1 }}>{meta.emoji}</span>
      {showLabel && meta.label}
    </span>
  );
}
