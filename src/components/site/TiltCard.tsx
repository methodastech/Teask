import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * The reusable site card, one hover language for the whole site: SHARP edges, a
 * hairline border and a soft elevation shadow at rest. On hover it simply lifts
 * (no 3D tilt), the surface turns to lightly tinted glass and a soft blue-teal
 * gradient blooms behind it — the glow reads through the translucent face.
 */

const EASE = [0.16, 1, 0.3, 1] as const

export default function TiltCard({
  children,
  className = '',
  href,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  href?: string
  delay?: number
}) {
  const reduce = useReducedMotion()

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      whileHover={{ y: reduce ? 0 : -8 }}
      className="group relative isolate h-full"
    >
      {/* blue-teal glow behind the card, blooms in on hover and, because the face
          turns translucent, also tints the surface itself */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 -z-10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(58% 58% at 50% 42%, rgba(59,177,227,0.50), rgba(0,132,214,0.20) 58%, transparent 78%)',
        }}
      />
      {/* the surface: sharp, hairline-bordered, elevated — becomes tinted glass on hover */}
      <div
        className={`relative h-full overflow-hidden border border-navy-950/12 bg-white md:border-navy-950/[0.06] shadow-[0_1px_3px_rgba(16,24,40,0.04),0_16px_40px_-8px_rgba(16,24,40,0.10)] transition-[background-color,border-color,box-shadow] duration-300 group-hover:border-teal-brand/40 group-hover:bg-white/70 group-hover:shadow-[0_1px_3px_rgba(16,24,40,0.05),0_30px_60px_-12px_rgba(59,177,227,0.28)] ${className}`}
      >
        {children}
      </div>
    </motion.div>
  )

  if (href) {
    return (
      <a href={href} className="block h-full">
        {card}
      </a>
    )
  }
  return card
}
