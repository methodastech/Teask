import type { LucideIcon } from 'lucide-react'

/**
 * HouseIcon — the site-wide presentation for any pictographic icon that isn't
 * one of the bespoke GlyphMark marks. Keeps every icon on the same system:
 * brand-blue, thin, round-capped strokes (overriding the global square caps),
 * a consistent size scale, and a subtle idle breathe. Concepts that map to a
 * GlyphMark (solar, battery, network, exchange, bolt, stack, pulse, plug, move,
 * target) should use GlyphMark instead; HouseIcon covers everything else.
 */
export default function HouseIcon({
  icon: Icon,
  size = 40,
  className = 'text-blue-brand',
}: {
  icon: LucideIcon
  size?: number
  className?: string
}) {
  return (
    <Icon
      size={size}
      strokeWidth={1.6}
      aria-hidden="true"
      className={`house-icon ${className}`}
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    />
  )
}
