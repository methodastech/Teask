import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ImageIcon } from 'lucide-react'

/** Shared design primitives so every home-page band shares one visual language. */

export const EASE = [0.16, 1, 0.3, 1] as const

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center text-eyebrow font-semibold tracking-[0.28em] text-teal-brand uppercase">
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'left',
  as: Tag = 'h2',
  className = '',
}: {
  eyebrow: ReactNode
  title: ReactNode
  intro?: ReactNode
  align?: 'left' | 'center'
  /** heading level, pages pass "h1" so every route has exactly one h1 (SEO) */
  as?: 'h1' | 'h2'
  /** extra width classes, for headings that need more room than the default cap
   *  (a later breakpoint here wins, so `2xl:max-w-4xl` widens only the top step) */
  className?: string
}) {
  const center = align === 'center'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.75, ease: EASE }}
      className={`${center ? 'mx-auto max-w-2xl text-center xl:max-w-3xl' : 'max-w-2xl xl:max-w-3xl'} ${className}`}
    >
      <div className={center ? 'flex justify-center' : ''}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      {/* Light weight + open tracking: the display face reads far more premium
          thin than bold. Size is the fluid --text-heading scale, which runs
          28px on a phone to 68px at 2560 and holds from there. */}
      <Tag className="mt-3 font-display text-heading font-light tracking-normal text-navy-950 md:mt-4">
        {title}
      </Tag>
      {intro && (
        <p className="mt-3.5 text-intro text-gray-600 md:mt-5">
          {intro}
        </p>
      )}
    </motion.div>
  )
}

const CORNERS = [
  'top-0 left-0 border-t border-l',
  'top-0 right-0 border-t border-r',
  'bottom-0 left-0 border-b border-l',
  'bottom-0 right-0 border-b border-r',
] as const

/** A blueprint-framed placeholder for imagery to be supplied later. */
export function Placeholder({ label = 'Image', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      className={`relative grid place-items-center overflow-hidden border border-navy-950/10 bg-navy-950/[0.02] ${className}`}
    >
      {CORNERS.map((c) => (
        <span
          key={c}
          className={`pointer-events-none absolute h-3 w-3 border-teal-brand/40 ${c}`}
          aria-hidden="true"
        />
      ))}
      <div className="flex flex-col items-center gap-2 text-gray-600">
        <ImageIcon size={26} strokeWidth={1.4} aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase">{label}</span>
      </div>
    </div>
  )
}
