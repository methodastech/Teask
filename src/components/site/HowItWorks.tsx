import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { EASE, SectionHeading } from './Section'

const STEPS: { n: string; title: string; body: string }[] = [
  { n: '01', title: 'Arrive', body: 'The whole station is delivered on a flatbed, pre-assembled and charged.' },
  { n: '02', title: 'Set down', body: 'It lowers onto any flat ground. No trenching, no substation, no permits queue.' },
  { n: '03', title: 'Power on', body: 'Solar canopy and on-board storage bring it online in under 30 minutes.' },
  { n: '04', title: 'Scale', body: 'Add units to grow capacity, or relocate the whole station as demand shifts.' },
]

/** A diamond node with a teal core. */
function Node() {
  return (
    <span
      className="relative z-10 block h-6 w-6 shrink-0 rotate-45 border border-teal-brand bg-white"
      aria-hidden="true"
    >
      <span className="absolute inset-2 bg-teal-brand/70" />
    </span>
  )
}

export default function HowItWorks() {
  return (
    <section id="how" className="relative w-full overflow-hidden bg-paper py-16 md:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Live in under
              <br />
              <span className="text-teal-brand">30 minutes.</span>
            </>
          }
          intro="Grid extension is slow, costly and fixed in place. A T Station is none of those things."
        />

        {/* ── desktop: horizontal flow, left → right ── */}
        <div className="relative mt-20 hidden md:block">
          {/* connector line, sits exactly on the diamond centres (node h-6 → 12px) */}
          <div className="pointer-events-none absolute top-3 right-0 left-0 h-px" aria-hidden="true">
            <div
              className="absolute inset-0 bg-teal-brand/25"
              style={{ boxShadow: '0 0 6px 0 rgba(59,177,227,0.22)' }}
            />
            {/* a soft teal light that glides from step one to step four, then dissolves */}
            <motion.div
              className="absolute top-1/2 h-3 w-[24%] -translate-y-1/2"
              animate={{ left: ['-24%', '-12%', '72%', '86%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.9, times: [0, 0.14, 0.8, 1] }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse closest-side, rgba(59,177,227,0.34), transparent 70%)' }} />
              <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgba(191,209,255,0.95) 50%, transparent)' }} />
            </motion.div>
            <ChevronRight
              size={18}
              className="absolute top-1/2 -right-1 -translate-y-1/2 text-teal-brand/70"
              style={{ filter: 'drop-shadow(0 0 4px rgba(59,177,227,0.5))' }}
            />
          </div>

          <div className="grid grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-70px' }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.14 }}
              >
                <Node />
                <div className="mt-8">
                  <div className="font-mono text-xs tracking-[0.3em] text-teal-brand">{s.n}</div>
                  <h3 className="mt-2 font-display text-2xl font-medium tracking-normal text-navy-950">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── mobile: vertical timeline, diamonds on the left, a line connecting
            them, and a soft teal pulse gliding downwards through them ── */}
        <div className="relative mt-12 md:hidden">
          {/* the pulse rides the rail (x = 12px, the diamond centres) */}
          <motion.div
            className="pointer-events-none absolute left-3 h-16 w-3 -translate-x-1/2"
            animate={{ top: ['-8%', '0%', '80%', '92%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.9, times: [0, 0.14, 0.8, 1] }}
            aria-hidden="true"
          >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse closest-side, rgba(59,177,227,0.34), transparent 70%)' }} />
            <div className="absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2" style={{ background: 'linear-gradient(180deg, transparent, rgba(191,209,255,0.95) 50%, transparent)' }} />
          </motion.div>

          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex gap-5"
            >
              {/* left rail: diamond + connecting line down to the next diamond */}
              <div className="flex flex-col items-center">
                <Node />
                {i < STEPS.length - 1 && (
                  <div
                    className="mt-1.5 w-px grow bg-teal-brand/25"
                    style={{ boxShadow: '0 0 6px 0 rgba(59,177,227,0.22)' }}
                    aria-hidden="true"
                  />
                )}
              </div>
              {/* content */}
              <div className={i < STEPS.length - 1 ? 'pb-10' : ''}>
                <div className="font-mono text-xs tracking-[0.3em] text-teal-brand">{s.n}</div>
                <h3 className="mt-1.5 font-display text-2xl font-medium tracking-normal text-navy-950">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
