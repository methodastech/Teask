import type { LucideIcon } from 'lucide-react'

/**
 * AnimatedGlyph — retained for API compatibility, now rendering in the shared
 * house style (brand-blue, thin, round-capped, subtle idle breathe) so it
 * matches GlyphMark / HouseIcon / IconChip across the site. The legacy `variant`
 * and `solid` props are accepted but no longer drive bespoke motion.
 */
export type GlyphVariant = 'breathe' | 'float' | 'spin' | 'pulse' | 'drive'

export default function AnimatedGlyph({
  icon: Icon,
  size = 32,
  strokeWidth = 1.6,
  className = 'text-blue-brand',
}: {
  icon: LucideIcon
  variant?: GlyphVariant
  size?: number
  strokeWidth?: number
  solid?: boolean
  className?: string
}) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      className={`house-icon ${className}`}
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    />
  )
}
