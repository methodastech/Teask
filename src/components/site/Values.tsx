import { motion } from 'framer-motion'
import { EASE, SectionHeading } from './Section'
import GlyphMark, { type MarkName } from './GlyphMark'

/**
 * Mission, vision and the four commitments — lifted from Teask's own published
 * positioning on teask.asia rather than invented here, so the two sites say the
 * same thing in the same words.
 */
const MISSION =
  'We provide clean energy solutions, focusing on light mobility and microgrids, to create a sustainable, interconnected future.'
const VISION =
  'To embrace a green, affordable and sustainable lifestyle through innovative technologies that bridge the gap to a brighter, interconnected future.'

const VALUES: { mark: MarkName; title: string; body: string }[] = [
  {
    mark: 'exchange',
    title: 'Energy as a shared resource',
    body: 'Movable stations put clean power where it is needed and move it when the need moves, rather than locking it to whoever happened to be near the grid.',
  },
  {
    mark: 'network',
    title: 'Technology bridges people and planet',
    body: 'Smart microgrids balance supply against real demand, so the efficient answer and the sustainable one stop being different answers.',
  },
  {
    mark: 'move',
    title: 'Sustainable mobility',
    body: 'Renewable-powered charging for light EVs, the vehicles most people in this region actually ride, not just the ones on brochures.',
  },
  {
    mark: 'solar',
    title: 'A path to a greener economy',
    body: 'Green jobs and local capability alongside the hardware. The goal is an energy ecosystem across ASEAN, not a set of imported boxes.',
  },
]

export default function Values() {
  return (
    <section id="values" className="relative w-full bg-paper py-16 md:py-32" aria-label="Mission and values">
      <div className="shell">
        <SectionHeading
          eyebrow="What we stand for"
          title={
            <>
              Energy of our
              <br />
              <span className="text-teal-brand">environment.</span>
            </>
          }
          intro="Teask stands for Tenaga Alam Sekitar Kita, the energy of our environment. Here is what that commits us to."
        />

        <div className="mt-14 grid gap-px border border-navy-950/10 bg-navy-950/10 md:grid-cols-2">
          {[
            { label: 'Our mission', text: MISSION },
            { label: 'Our vision', text: VISION },
          ].map((b) => (
            <div key={b.label} className="bg-white p-8 md:p-10">
              <div className="font-mono text-[10px] tracking-[0.25em] text-teal-brand uppercase">
                {b.label}
              </div>
              <p className="mt-4 font-display text-xl leading-relaxed font-light tracking-normal text-navy-950 md:text-2xl">
                {b.text}
              </p>
            </div>
          ))}
        </div>

        {/* phone swipes these like the other card sections; 76% leaves the next
            card visibly peeking so the row reads as scrollable */}
        <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pt-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
              className="w-[76%] shrink-0 snap-start border border-navy-950/12 bg-white p-6 md:w-auto md:border-navy-950/10 md:p-7"
            >
              <GlyphMark name={v.mark} size={38} className="text-blue-brand" />
              <h3 className="mt-5 font-display text-lg font-medium tracking-normal text-navy-950">
                {v.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{v.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
