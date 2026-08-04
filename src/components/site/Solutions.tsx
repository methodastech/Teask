import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Truck, Landmark, LifeBuoy, type LucideIcon } from 'lucide-react'
import { EASE, SectionHeading } from './Section'
import AnimatedGlyph, { type GlyphVariant } from './AnimatedGlyph'
import ChamferBorder from '../ChamferBorder'

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FP46Emobin1BeouoYpzom4YJCr/'
const CHAMFER = 36 // legacy prop for ChamferBorder; the cut itself is gone
const CLIP = 'none' // cards are clean rectangles now

const SEGMENTS: {
  icon: LucideIcon
  variant: GlyphVariant
  title: string
  body: string
  image: string
  alt: string
}[] = [
  {
    icon: Building2,
    variant: 'float',
    title: 'Property & campuses',
    body: 'Add EV charging to car parks, malls and campuses without waiting on a grid upgrade.',
    image: CDN + 'hf_20260719_180717_3ee62f0a-6df1-40db-ba51-4b1c32fde600_min.webp',
    alt: 'A T Station charging electric motorcycles at a shopping mall and campus car park.',
  },
  {
    icon: Truck,
    variant: 'drive',
    title: 'Fleets & logistics',
    body: 'Keep delivery fleets and e-motorcycles moving with fast, on-site charging that relocates with the route.',
    image: CDN + 'hf_20260719_172058_b176f612-69d1-47f0-be22-bb69c384c4cb_min.webp',
    alt: 'A T Station at a logistics depot charging delivery vans and e-motorcycles.',
  },
  {
    icon: Landmark,
    variant: 'breathe',
    title: 'Government & utilities',
    body: 'Rapidly deployable energy infrastructure for pilots, sandboxes and public mobility programmes.',
    image: CDN + 'hf_20260719_172105_22518406-d1ae-4f19-a775-421fd4eb06ec_min.webp',
    alt: 'A T Station on a civic public plaza supporting a public-mobility programme.',
  },
  {
    icon: LifeBuoy,
    variant: 'spin',
    title: 'Rural & disaster response',
    body: 'Power and charging where the grid does not reach, arriving charged and ready on day one.',
    image: CDN + 'hf_20260719_181418_db4366e8-1422-489b-b227-1b7d35ebbdec_min.webp',
    alt: 'A T Station deployed off-grid on open rural ground, charging an electric motorcycle.',
  },
]

export default function Solutions() {
  const [active, setActive] = useState(0)

  return (
    <section id="solutions" className="relative w-full bg-white py-16 md:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow="Solutions"
          title={
            <>
              Built for every
              <br />
              <span className="text-teal-brand">operator.</span>
            </>
          }
          intro="The same unit serves very different sites, mobility, communities and critical infrastructure."
        />

        {/* desktop, expanding-panel accordion */}
        <div className="mt-16 hidden h-[520px] gap-3 md:flex">
          {SEGMENTS.map((s, i) => {
            const isActive = active === i
            return (
              <motion.div
                key={s.title}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                animate={{ flexGrow: isActive ? 5 : 1 }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{ clipPath: CLIP }}
                className="group relative min-w-0 basis-0 cursor-pointer overflow-hidden outline-none ring-teal-brand/50 focus-visible:ring-2"
              >
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
                    isActive ? 'scale-100 opacity-100' : 'scale-105 opacity-95'
                  }`}
                />
                <div
                  className={`absolute inset-0 transition-colors duration-500 ${
                    isActive ? 'bg-transparent' : 'bg-white/10'
                  }`}
                />

                {/* chamfered outline, brighter when the panel is open */}
                <ChamferBorder
                  cut={CHAMFER}
                  className={`transition-colors duration-500 ${isActive ? 'text-teal-brand' : 'text-teal-brand/20'}`}
                />

                {/* the caption sits on a solid brand-teal block rather than a
                    white gradient, so the icon and copy stay legible over any
                    photograph. The title font-size scales smoothly between
                    collapsed and expanded and the body reveals in sync, one
                    element, so nothing crossfades or pops. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-t from-blue-deep from-35% via-blue-deep/90 to-transparent px-6 pt-20 pb-6">
                  <span className="mb-3 block">
                    <AnimatedGlyph icon={s.icon} variant={s.variant} size={30} strokeWidth={1.75} className="text-white" />
                  </span>
                  <h3
                    className="origin-left font-display font-medium leading-tight tracking-normal text-white transition-[font-size] duration-500 ease-out"
                    style={{ fontSize: isActive ? '1.5rem' : '0.9rem' }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="max-w-md overflow-hidden text-sm leading-relaxed text-white/90 transition-all duration-500 ease-out"
                    style={{
                      maxHeight: isActive ? '5rem' : '0rem',
                      opacity: isActive ? 1 : 0,
                      marginTop: isActive ? '0.75rem' : '0rem',
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* mobile, simple stacked cards */}
        <div className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {SEGMENTS.map((s) => (
            <div
              key={s.title}
              style={{ clipPath: CLIP }}
              className="relative w-[76%] shrink-0 snap-start overflow-hidden bg-teal-brand/[0.04]"
            >
              <ChamferBorder cut={CHAMFER} className="text-teal-brand/20" />
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img src={s.image} alt={s.alt} loading="lazy" className="h-full w-full object-cover" />
              </div>
              {/* stacked so the text uses the full card width in the carousel */}
              <div className="bg-blue-deep p-5">
                <span className="block">
                  <AnimatedGlyph icon={s.icon} variant={s.variant} size={28} strokeWidth={1.75} className="text-white" />
                </span>
                <h3 className="mt-3 text-base font-bold leading-snug text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/90">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
