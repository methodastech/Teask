import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Wrench, Timer, Sun, type LucideIcon } from 'lucide-react'
import HouseIcon from './site/HouseIcon'

/**
 * Cycling benefit callout that floats beside the wireframe unit in the intro.
 * Shows one of three at a time and swaps with a 3D "twisted flip", the card
 * tips in on its X axis with a slight Y twist, so each benefit reads like a
 * card being flipped over. Small but legible; sits on the blueprint side.
 */

const ITEMS: { icon: LucideIcon; lines: [string, string] }[] = [
  { icon: Wrench, lines: ['Hassle-free', 'installation'] },
  { icon: Timer, lines: ['Ready to use', 'in 30 minutes'] },
  { icon: Sun, lines: ['Zero downtime,', 'always on'] },
]

const EASE = [0.16, 1, 0.3, 1] as const

export default function ProductCallouts({ className = '' }: { className?: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % ITEMS.length), 3200)
    return () => window.clearInterval(id)
  }, [])

  const Item = ITEMS[i]
  const Icon = Item.icon

  return (
    <div className={className} style={{ perspective: 800 }} aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ rotateX: 92, rotateY: 14, opacity: 0 }}
          animate={{ rotateX: 0, rotateY: 0, opacity: 1 }}
          exit={{ rotateX: -92, rotateY: -14, opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ transformStyle: 'preserve-3d', transformOrigin: 'left center' }}
          className="flex w-56 items-center gap-3"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-brand/40 bg-blue-brand/10 backdrop-blur-sm">
            <HouseIcon icon={Icon} size={19} />
          </span>
          {/* Heading face, white — and a shadow that is doing real work, not
              styling. These callouts float over the 3D scene, which is mostly
              pale paving, so white type on its own would disappear; the shadow
              is what gives it an edge to sit against wherever it lands. */}
          <span className="flex-1 font-display text-[15px] leading-tight font-medium tracking-normal text-white [text-shadow:0_1px_2px_rgba(5,7,14,0.45),0_2px_14px_rgba(5,7,14,0.55)]">
            {Item.lines[0]}
            <br />
            {Item.lines[1]}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
