import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { Eyebrow } from './Section'
import TiltCard from './TiltCard'

const STATS: { value: number; suffix: string; label: string; note: string }[] = [
  { value: 30, suffix: ' min', label: 'To full deployment', note: 'No trenching, no civil works.' },
  { value: 25, suffix: '+ years', label: 'Design lifespan', note: 'Upgradeable, recyclable materials.' },
  { value: 3, suffix: ' min', label: 'E-motorcycle charge', note: 'Proprietary fast-charging.' },
  { value: 100, suffix: '%', label: 'Relocatable', note: 'Redeploys wherever demand goes.' },
]

function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const dur = 1400
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * to))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  )
}

export default function StatsBand() {
  return (
    <section id="record" className="relative w-full overflow-hidden bg-white py-16 md:py-28">
      {/* faint blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(63,127,196,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(63,127,196,0.08) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 100%)',
        }}
      />
      <div className="relative shell">
        <div className="max-w-2xl">
          <Eyebrow>The record</Eyebrow>
          <h2 className="mt-3 font-display text-heading font-light tracking-normal text-navy-950 md:mt-4">
            Grounded, and provable.
          </h2>
        </div>

        <div className="mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {STATS.map((s, i) => (
            <div key={s.label} className="w-[76%] shrink-0 snap-start md:w-auto">
              <TiltCard delay={i * 0.08} className="p-7 md:p-8">
                <div className="font-display text-4xl font-light text-teal-brand md:text-5xl">
                  <CountUp to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-3 text-sm font-semibold text-navy-950">{s.label}</div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.15em] text-gray-600 uppercase">
                  {s.note}
                </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
