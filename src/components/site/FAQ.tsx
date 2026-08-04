import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { EASE, SectionHeading } from './Section'

/**
 * The objections a buyer actually raises, answered without marketing language.
 *
 * Every answer here is grounded in a claim the site already makes elsewhere
 * (the stats band, the technology layers, the station anatomy, the deployments
 * and the published T&Cs) — an FAQ that invents specifications is worse than no
 * FAQ, because it is the page prospects quote back to you.
 *
 * Ordered biggest-objection-first: the two questions that kill infrastructure
 * deals are "what will this cost me in civil works" and "what happens when the
 * sun isn't shining", so they lead.
 */
export const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do we need to trench, dig, or upgrade our electrical supply?',
    a: 'No. The T Station needs no trenching, no substation and no civil works. It stands on a levelling base across two standard parking bays, so there is nothing to excavate and nothing to write off if the site changes.',
  },
  {
    q: 'What happens at night, or on a cloudy day?',
    a: 'An on-board battery buffers what the canopy generates, so the station keeps delivering charge around the clock rather than only while the sun is out. Where a grid connection already exists, the unit can also tie into it.',
  },
  {
    q: 'How long until it is actually working?',
    a: 'Under 30 minutes from arrival to first charge. The unit arrives already charged, so it starts serving on day one instead of waiting on commissioning.',
  },
  {
    q: 'Does it need a grid connection at all?',
    a: 'No. It runs standalone on solar and storage, or tied into the grid where one is present. The station works the same either way, which is what makes it deployable at sites the grid has not reached.',
  },
  {
    q: 'Can we relocate it later?',
    a: 'Yes. The station is fully relocatable: it arrives whole and leaves whole, moves on a flatbed, and redeploys wherever demand goes next. Nothing is stranded if the site changes use.',
  },
  {
    q: 'What can it charge, and how many vehicles at once?',
    a: 'EVs and e-motorcycles, across six simultaneous charge points. E-motorcycle fast charging reaches 80% in about three minutes.',
  },
  {
    q: 'How much space does it take?',
    a: 'Two standard parking bays. The canopy sits above the bays, so the footprint you give up is the parking area itself.',
  },
  {
    q: 'How long does the hardware last?',
    a: 'The unit is designed for a 25+ year service life. It is built as infrastructure, not as a temporary installation.',
  },
  {
    q: 'How is it priced?',
    a: 'Pricing depends on configuration and site: how many units, whether you want it standalone or grid-tied, and how the energy is billed. Energy is charged per kilowatt-hour, with the standard rate published in our terms. Tell us the site and we will map the fit and come back with numbers.',
  },
  {
    q: 'Where is it already running?',
    a: 'The first T Station is live at DPULZE Shopping Centre in Cyberjaya, Malaysia’s first deployment of its kind, alongside an on-site fleet charging pilot in the Klang Valley.',
  },
]

function Item({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`
  return (
    <div className="border-b border-navy-950/10">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full cursor-pointer items-start justify-between gap-6 py-6 text-left"
        >
          <span className="font-display text-lg font-medium tracking-normal text-navy-950 transition-colors group-hover:text-teal-brand md:text-xl">
            {q}
          </span>
          <span
            className={`mt-0.5 shrink-0 text-teal-brand transition-transform duration-300 ${
              open ? 'rotate-45' : ''
            }`}
            aria-hidden="true"
          >
            <Plus size={20} strokeWidth={1.75} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-sm leading-relaxed text-gray-600 md:text-base">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  return (
    <section id="faq" className="relative w-full bg-white py-16 md:py-32" aria-label="Frequently asked questions">
      <div className="shell">
        <SectionHeading
          eyebrow="Questions"
          title={
            <>
              Frequently asked
              <br />
              <span className="text-teal-brand">questions.</span>
            </>
          }
          intro="Straight answers on civil works, uptime, relocation and cost. The details that decide whether a site is a fit."
        />
        <div className="mt-14 border-t border-navy-950/10">
          {FAQS.map((f, i) => (
            <Item key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
