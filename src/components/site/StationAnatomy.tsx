import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EASE } from './Section'

/** The studio render of the real unit, transparent PNG, resized to 1400px. */
const STATION = '/images/t-station-unit.png'

type Spot = {
  n: number
  /** marker position over the render, in % of the image box */
  x: number
  y: number
  title: string
  sub: string
  /** which margin the label lives in, always clear of the render */
  gutter: 'left' | 'right'
  /** the label's vertical position in the margin, in % of the image height;
   *  decoupled from the marker so labels never collide, a leader bridges the gap */
  labelY: number
}

const SPOTS: Spot[] = [
  { n: 1, x: 52, y: 32, title: 'Solar canopy', sub: 'Bifacial PV, 5 kWp', gutter: 'right', labelY: 20 },
  { n: 2, x: 85, y: 32, title: 'Stay-cable rig', sub: 'Tensioned canopy frame', gutter: 'right', labelY: 42 },
  { n: 3, x: 24, y: 48, title: 'Power cabinet', sub: 'BESS + 5–15 kW inverter', gutter: 'left', labelY: 38 },
  { n: 4, x: 39, y: 58, title: 'Charge points', sub: 'Six simultaneous bays', gutter: 'left', labelY: 58 },
  { n: 5, x: 66, y: 77, title: 'Deployment footprint', sub: 'Two standard parking bays', gutter: 'right', labelY: 76 },
  { n: 6, x: 24, y: 73, title: 'Levelling base', sub: 'No trenching, no civil works', gutter: 'left', labelY: 76 },
]

// the render is centred at this width, leaving equal margins for the labels.
// markers map from image-space (0–100 of the render) into container-space.
// keep IMG_W in sync with the render div's md:w-[..] class below.
const IMG_W = 66
const IMG_L = (100 - IMG_W) / 2 // 17 → render spans 17%…83% of the container
const markerX = (x: number) => IMG_L + (x * IMG_W) / 100
const anchorX = (g: Spot['gutter']) => (g === 'left' ? IMG_L : 100 - IMG_L)

export default function StationAnatomy() {
  const [active, setActive] = useState<number | null>(null)
  const [auto, setAuto] = useState(1)

  // when the visitor isn't hovering, sweep the highlight 1 → 6 on a loop;
  // any hover/focus parks the sweep and takes over
  useEffect(() => {
    if (active !== null) return
    const id = window.setInterval(() => setAuto((a) => (a % SPOTS.length) + 1), 3200)
    return () => window.clearInterval(id)
  }, [active])

  const shown = active ?? auto
  const shownSpot = SPOTS.find((s) => s.n === shown) ?? null

  return (
    <div className="mt-24">
      <div className="flex items-center">
        <span className="font-mono text-[11px] tracking-[0.25em] text-teal-brand uppercase">The unit</span>
      </div>
      <h3 className="mt-3 max-w-xl font-display text-heading font-light tracking-normal text-navy-950 md:mt-4">
        One station, <span className="text-teal-brand">six systems.</span>
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
        Every system is labelled.{' '}
        <span className="pointer-coarse:hidden">Hover a marker to hold it in focus.</span>
        <span className="hidden pointer-coarse:inline">Tap a marker to hold it in focus.</span>
      </p>

      {/* container holds the render (centred), the leader lines and the margin
          labels in one shared coordinate space, so leaders line up on any width */}
      <div className="relative mx-auto mt-10 w-full">
        {/* leader lines, md+ only (mobile reads the list underneath instead) */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {SPOTS.map((s) => {
            const isOn = shown === s.n
            const dimmed = !isOn
            const ax = anchorX(s.gutter)
            const mx = markerX(s.x)
            // orthogonal elbow only, never a diagonal: run horizontally from the
            // label along its own row, then turn 90° and drop/rise into the marker
            const points = `${ax},${s.labelY} ${mx},${s.labelY} ${mx},${s.y}`
            return (
              <polyline
                key={s.n}
                points={points}
                fill="none"
                stroke="#3bb1e3"
                strokeWidth={isOn ? 1.4 : 1}
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
                opacity={isOn ? 0.85 : dimmed ? 0.12 : 0.4}
                style={{ transition: 'opacity 200ms' }}
              />
            )
          })}
        </svg>

        {/* the margin labels (md+), pinned outside the render on their side */}
        {SPOTS.map((s) => {
          const isOn = shown === s.n
          const dimmed = !isOn
          return (
            <motion.div
              key={`label-${s.n}`}
              animate={{ opacity: isOn ? 1 : dimmed ? 0.3 : 0.9, scale: isOn ? 1.04 : 1 }}
              transition={{ duration: 0.25, ease: EASE }}
              className={`pointer-events-none absolute hidden w-[17%] max-w-[220px] md:block ${
                isOn ? 'z-30' : 'z-20'
              } ${s.gutter === 'left' ? 'text-right' : 'text-left'}`}
              style={{
                top: `${s.labelY}%`,
                [s.gutter === 'left' ? 'right' : 'left']: `${100 - IMG_L}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <div
                className={`inline-block bg-white/95 px-3.5 py-2.5 backdrop-blur-md transition-all duration-200 md:px-4 md:py-3 ${
                  isOn
                    ? 'border-2 border-teal-brand shadow-[0_10px_34px_rgba(59,177,227,0.28)]'
                    : 'border border-teal-brand/25'
                }`}
              >
                <div className={`text-[13px] font-bold md:text-sm ${isOn ? 'text-teal-brand' : 'text-navy-950'}`}>
                  {s.title}
                </div>
                <div className="mt-0.5 font-mono text-[9px] tracking-[0.18em] text-gray-600 uppercase md:text-[10px]">
                  {s.sub}
                </div>
              </div>
            </motion.div>
          )
        })}

        {/* the render + its markers, centred so the labels flank it */}
        <div className="relative mx-auto w-full md:w-[66%]">
          <img
            src={STATION}
            alt="A T Station portable solar EV charging unit, shown from a three-quarter angle with its dual-pitch solar canopy, black cabinet modules and charging point."
            width={1400}
            height={933}
            decoding="async"
            className="block h-auto w-full select-none"
            draggable={false}
          />

          {SPOTS.map((s) => {
            const isOn = shown === s.n
            const dimmed = !isOn
            return (
              <button
                key={s.n}
                type="button"
                aria-label={`${s.title}, ${s.sub}`}
                onMouseEnter={() => setActive(s.n)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.n)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === s.n ? null : s.n)}
                // The marker stays 24px because the drawing needs it small, but a
                // 24px target is a miss on a phone. `before` throws an invisible
                // 44px hit area around it — the accessibility minimum — without
                // touching the dot itself or disturbing the layout.
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 font-mono text-[10px] transition-all duration-200 before:absolute before:-inset-2.5 before:content-[''] md:h-8 md:w-8 md:text-xs md:before:inset-0 ${
                  isOn ? 'scale-110 border-teal-brand bg-teal-brand text-white' : 'border-teal-brand bg-white/85 text-teal-brand'
                } ${dimmed ? 'opacity-40' : 'opacity-100'} ${isOn ? 'z-30' : 'z-10'}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, boxShadow: isOn ? '0 0 16px 0 rgba(59,177,227,0.6)' : '0 0 10px 0 rgba(59,177,227,0.35)' }}
              >
                {s.n}
                {/* halo pulse on whichever marker is highlighted, so the sweep reads */}
                {isOn && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full border border-teal-brand"
                    animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.8, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* on a phone the render is too narrow for flanking labels, so they read underneath */}
      <div className="mt-5 md:hidden">
        <div className="flex min-h-[62px] flex-col justify-center border border-teal-brand/25 bg-teal-brand/[0.05] px-4 py-3">
          {shownSpot && (
            <>
              <div className="text-sm font-bold text-navy-950">{shownSpot.title}</div>
              <div className="mt-0.5 font-mono text-[10px] tracking-[0.18em] text-gray-600 uppercase">
                {shownSpot.sub}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-8 text-center font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
        One unit · six systems · zero trenching
      </div>
    </div>
  )
}
