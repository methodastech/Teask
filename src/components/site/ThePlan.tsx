import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { EASE, SectionHeading } from './Section'
import { chamferClip } from '../ChamferBorder'

/**
 * The Plan — the customer's journey, not the product's.
 *
 * The site already explains how the *unit* deploys (arrive, set down, power on,
 * scale). What it never showed is what the *buyer* does, which is the question
 * someone reaches for once they're convinced: "fine — what happens if I get in
 * touch?" Four steps, written from their side of the table.
 */
const STEPS: { n: string; title: string; body: string; image: string; alt: string }[] = [
  {
    n: '01',
    title: 'Tell us the site',
    body: 'Send us the location and what you need it to do. A mall forecourt, a campus, a depot, a plantation, with or without a grid connection.',
    image: '/images/plan/01-the-site.webp',
    alt: 'An empty marked car park at a modern Malaysian campus, the kind of site a T Station is deployed into.',
  },
  {
    n: '02',
    title: 'We map the fit',
    body: 'We come back on whether the T Station suits the site, how many units it would take, and how the energy would be billed. No civil works survey, because there are no civil works.',
    image: '/images/plan/02-map-the-fit.webp',
    alt: 'An aerial view of a car park layout, showing the bays and access routes assessed when sizing a deployment.',
  },
  {
    n: '03',
    title: 'The station arrives charged',
    body: 'Delivered into two standard parking bays and operating in under 30 minutes. No trenching, no substation, no closing the car park for a construction programme.',
    image: '/images/plan/03-arrives.webp',
    alt: 'Teask technicians in branded white shirts commissioning a newly set-down T Station across two marked parking bays.',
  },
  {
    n: '04',
    title: 'You start charging',
    body: 'Six simultaneous charge points from day one. If demand moves, the station moves with it, and nothing is stranded in the ground.',
    image: '/images/solutions/light-ev-charging.webp',
    alt: 'Electric motorcycles charging beneath the solar canopy of a T Station.',
  },
]

export default function ThePlan() {
  return (
    <section id="plan" className="relative w-full bg-paper py-16 md:py-32" aria-label="How to get started">
      <div className="shell">
        <SectionHeading
          eyebrow="Getting started"
          title={
            <>
              Four steps from
              <br />
              <span className="text-teal-brand">enquiry to charging.</span>
            </>
          }
          intro="No procurement maze and no construction programme. Here is the whole process from your side."
        />

        {/* discrete cards rather than one divided block: each step is its own
            object, so the sequence reads as four moves instead of a table.
            Phone swipes them like the other card sections — stacked, this ran to
            2.6 screens, the longest block on the page. The step number stays on
            every image so the order survives being swiped rather than scanned. */}
        <ol className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-16 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              className="group flex w-[76%] shrink-0 snap-start flex-col overflow-hidden border border-navy-950/12 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-12px_rgba(16,24,40,0.18)] sm:w-auto sm:border-navy-950/10"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {/* the step number sits on the image so the sequence stays
                    readable when the row is scanned quickly */}
                <span className="absolute top-3 left-3 grid h-8 w-8 place-items-center bg-white/95 font-mono text-[11px] font-bold tracking-[0.1em] text-teal-brand backdrop-blur-sm">
                  {s.n}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-lg font-medium tracking-normal text-navy-950">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <div className="mt-10">
          <Link
            to="/contact"
            style={{ clipPath: chamferClip(14) }}
            className="group inline-flex items-center bg-blue-brand px-8 py-4 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand"
          >
            Start with step one
            <ArrowRight
              size={16}
              className="ml-3 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
