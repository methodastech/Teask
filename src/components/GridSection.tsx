import { motion } from 'framer-motion'
import TiltCard from './site/TiltCard'
import StationAnatomy from './site/StationAnatomy'
import GlyphMark, { type MarkName } from './site/GlyphMark'

/**
 * Section 3 · "Where the grid ends."
 *
 * Blueprint framing carries over from the gated experience: a faint wireframe
 * grid, mono eyebrows, sharp corners, teal ticks. The three deployment reads use
 * the shared site card — a subtle lift with the glass + blue-glow hover the rest
 * of the site's cards share.
 */

const EASE = [0.16, 1, 0.3, 1] as const

type Scenario = {
  id: string
  n: string
  mark: MarkName
  title: string
  body: string
  stat: string
  statLabel: string
  image: string
  alt: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'off-grid',
    n: '01',
    mark: 'target',
    title: 'Off the grid',
    body: 'Sites with no line power: trailheads, plantations, island resorts, disaster zones. The T Station arrives charged and starts serving on day one.',
    stat: '0 m',
    statLabel: 'Trenching required',
    image: '/images/solutions/off-the-grid.webp',
    alt: 'A Teask T Station charging electric scooters at a remote jungle trailhead, far from any power line.',
  },
  {
    id: 'peak',
    n: '02',
    mark: 'bolt',
    title: 'Past the meter',
    body: 'Car parks and forecourts where a grid upgrade means months of permits and civil works. Drop a unit in a bay and skip the queue for capacity.',
    stat: '1 day',
    statLabel: 'To first charge',
    image: '/images/solutions/past-the-meter.webp',
    alt: 'A Teask T Station dropped into a parking bay of an urban car park, charging vehicles without a grid upgrade.',
  },
  {
    id: 'mobile',
    n: '03',
    mark: 'move',
    title: 'On the move',
    body: 'Events, film sets, roadshows, pop-up fleets. The whole station relocates on a flatbed and redeploys wherever the demand goes next.',
    stat: '100%',
    statLabel: 'Relocatable',
    image: '/images/solutions/on-the-move.webp',
    alt: 'A Teask T Station strapped onto a flatbed lorry on the highway, being relocated to its next site.',
  },
]

function DeploymentCard({ s, i }: { s: Scenario; i: number }) {
  return (
    <TiltCard delay={i * 0.12} className="flex h-full flex-col p-0">
      <img
        src={s.image}
        alt={s.alt}
        loading="lazy"
        className="aspect-[16/9] w-full shrink-0 object-cover"
      />
      {/* full height so the stat block sits at the bottom of every card and the
          divider lines align across all three */}
      <div className="flex h-full flex-col p-8 md:p-10">
        {/* prominent animated icon, reads the idea before the words do */}
        <div className="flex items-start justify-between">
          <GlyphMark name={s.mark} size={46} className="text-blue-brand" />
          <span className="font-mono text-xs tracking-[0.3em] text-gray-600">{s.n}</span>
        </div>

        <h3 className="mt-7 text-xl font-bold text-navy-950">{s.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{s.body}</p>

        <div className="mt-auto border-t border-teal-brand/20 pt-5">
          <div className="text-3xl font-bold text-teal-brand">{s.stat}</div>
          <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            {s.statLabel}
          </div>
        </div>
      </div>
    </TiltCard>
  )
}

export default function GridSection() {
  return (
    <section
      id="grid"
      className="relative w-full overflow-hidden bg-white py-20 md:py-36"
      aria-label="Where Station 3 deploys"
    >
      {/* blueprint grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(63,127,196,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(63,127,196,0.09) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 40%, #000 55%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 70% at 50% 40%, #000 55%, transparent 100%)',
        }}
      />
      {/* fade the grid in from the top so it dissolves into the section above */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white to-transparent"
        aria-hidden="true"
      />

      <div className="relative shell">
        {/* heading, same gutter as the navbar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl"
        >
          <span className="flex items-center text-xs font-bold tracking-widest text-teal-brand uppercase">
            Where it deploys
          </span>
          <h2 className="mt-3 font-display text-heading font-light tracking-normal text-navy-950 md:mt-4">
            Where the grid ends,
            <br />
            <span className="text-teal-brand">the T Station begins.</span>
          </h2>
          <p className="mt-3.5 text-intro text-gray-600 md:mt-6">
            Grid extension is slow, costly, and fixed in place. Portable solar isn&apos;t. The
            same unit charges vehicles across three deployment realities: no trench, no
            substation, no waiting.
          </p>
        </motion.div>

        {/* three deployment reads, the shared site card */}
        <div className="mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {SCENARIOS.map((s, i) => (
            <div key={s.id} className="w-[76%] shrink-0 snap-start md:w-auto">
              <DeploymentCard s={s} i={i} />
            </div>
          ))}
        </div>

        {/* the real unit, annotated, static render, labels on hover */}
        <StationAnatomy />
      </div>
    </section>
  )
}
