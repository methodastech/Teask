import { motion } from 'framer-motion'
import { EASE } from './Section'
import ImagePlaceholder from './Placeholder'

export interface Milestone {
  when: string
  what: string
  detail: string
  image?: string
  alt?: string
}

/**
 * The record, as a single horizontal timeline with every milestone on screen at
 * once — no scrolling, no carousel arrows.
 *
 * Milestones alternate above and below the axis (selang-seli), which halves the
 * horizontal space each card needs and lets six fit across. Cards sit small and
 * quiet by default; hovering one scales it up in place rather than popping a
 * modal, and the detail line fades in as it grows.
 *
 * The scale origin is the axis edge of each card (bottom for the ones above,
 * top for the ones below), so a growing card stays visually pinned to its own
 * node on the timeline instead of drifting across its neighbours.
 *
 * The lift is 1.18, and the ceiling on it is the GUTTER, not taste: a scale
 * grows a card on all four sides, so anything past ~1.18 pushes more than the
 * 16px gap into the neighbour either side. 1.42, which this used to be, threw
 * 84px upward and landed on the section heading.
 *
 * The card's internals do not move with it. The detail line holds its height at
 * all times and only fades in, so the growth is one clean scale rather than a
 * scale racing a reflow.
 */
function Card({ m, above }: { m: Milestone; above: boolean }) {
  return (
    <div
      className={`group/card relative w-full cursor-default transition-transform duration-500 ease-out will-change-transform hover:z-30 hover:scale-[1.18] ${
        above ? 'origin-bottom' : 'origin-top'
      }`}
    >
      <div className="overflow-hidden border border-navy-950/10 bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-shadow duration-500 group-hover/card:shadow-[0_18px_44px_-12px_rgba(16,24,40,0.26)]">
        {/* 6/5, not 16/11. Seven columns fix the card's width, so the only way
            the photograph gets bigger is by getting taller — this takes it from
            121px to ~151px on a 1440 screen, and the row grew to 36rem to hold
            it. Stopped short of square: these are wide group shots, and a 1/1
            crop starts cutting people off the ends. */}
        <div className="aspect-[6/5] w-full overflow-hidden">
          {m.image ? (
            <img
              src={m.image}
              alt={m.alt}
              loading="lazy"
              // slightly muted at rest so the row reads as one calm band, then
              // resolves to full clarity on the card being inspected
              className="h-full w-full object-cover opacity-[0.82] saturate-[0.85] transition-all duration-500 group-hover/card:opacity-100 group-hover/card:saturate-100"
            />
          ) : (
            <ImagePlaceholder label={`${m.when} · ${m.what}`} className="h-full w-full" />
          )}
        </div>
        <div className="p-2.5">
          <div className="font-display text-[13px] leading-none font-medium tracking-normal text-navy-950">
            {m.when}
          </div>
          <h3 className="mt-1.5 text-[11px] leading-tight font-bold text-teal-brand">{m.what}</h3>
          {/* Height is RESERVED, not animated. Growing the card on hover moved
              it into the heading above and into its neighbours either side — a
              1.16 scale put 17px on each flank against a 16px gutter. The row
              now never changes size at all; the detail simply fades in to space
              the card was already holding. */}
          <p className="mt-1 h-7 overflow-hidden text-[10px] leading-snug text-gray-600 opacity-0 transition-opacity duration-400 group-hover/card:opacity-100">
            {m.detail}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RecordTimeline({ items }: { items: Milestone[] }) {
  return (
    <>
      {/* ── md+ · the alternating timeline ── */}
      {/* mt-24: the cards above the axis grow upward on hover, so the row needs
          clearance from the heading or an enlarged card lands on top of it */}
      <div className="relative mt-24 hidden md:block">
        {/* the axis, with a light pulse travelling along it */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2" aria-hidden="true">
          <div
            className="absolute inset-0 bg-teal-brand/25"
            style={{ boxShadow: '0 0 6px 0 rgba(59,177,227,0.22)' }}
          />
          <motion.div
            className="absolute top-1/2 h-3 w-[14%] -translate-y-1/2"
            animate={{ left: ['-14%', '-7%', '92%', '104%'], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 6,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 1.2,
              times: [0, 0.12, 0.85, 1],
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse closest-side, rgba(59,177,227,0.34), transparent 70%)',
              }}
            />
            <div
              className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(191,209,255,0.95) 50%, transparent)',
              }}
            />
          </motion.div>
        </div>

        {/* The gutter stays at 16px. Narrowing it buys the card ~4px, and the
            1.18 hover scale is pinned to this exact number — see Card — so a
            12px gutter would have the lifted card overrun its neighbours by
            ~4px a side. Not a trade worth making for 2% more width. */}
        <ol
          className="relative grid gap-3 lg:gap-4"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((m, i) => {
            const above = i % 2 === 1
            return (
              <motion.li
                key={`${m.when}-${m.what}`}
                initial={{ opacity: 0, y: above ? -14 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: EASE, delay: i * 0.07 }}
                className="flex min-h-[36rem] flex-col"
              >
                {/* upper slot */}
                {/* pb/pt-12: one diamond's clearance from the axis. The node is
                    24px square rotated 45deg, so ~34px across — the cards used
                    to sit 20px off the line, close enough that a card looked
                    like it was resting on its own marker. 48px keeps the same
                    gap the 16px node had at 44px now that the node is bigger. */}
                {/* basis-1/2, not flex-1. With flex-1 the slot holding a card
                    grew past its share and shoved the node off the axis, so a
                    column with a card above sat lower than one with a card
                    below and the diamonds stopped lining up. Fixed halves keep
                    the axis at the same y in every column whatever it holds. */}
                <div className="flex min-h-0 shrink-0 grow-0 basis-1/2 items-end justify-center pb-12">
                  {above && <Card m={m} above />}
                </div>

                {/* the node, centred exactly on the axis */}
                <div className="relative flex h-0 items-center justify-center" aria-hidden="true">
                  {/* the same outlined diamond the "how it works" rail uses —
                      white fill so it masks the axis running behind it, teal
                      border, teal core. The old solid node with a glow read as
                      a different kind of marker on a page that already had
                      this one. */}
                  <span className="absolute z-10 block h-6 w-6 rotate-45 border border-teal-brand bg-white">
                    <span className="absolute inset-2 bg-teal-brand/70" />
                  </span>
                </div>

                {/* lower slot */}
                <div className="flex min-h-0 shrink-0 grow-0 basis-1/2 items-start justify-center pt-12">
                  {!above && <Card m={m} above={false} />}
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>

      {/* ── mobile · six across is unreadable on a phone, so a simple grid ── */}
      <ol className="mt-10 grid grid-cols-2 gap-4 md:hidden">
        {items.map((m) => (
          <li key={`${m.when}-${m.what}`} className="border border-navy-950/10 bg-white">
            <div className="aspect-[16/11] w-full overflow-hidden">
              {m.image ? (
                <img src={m.image} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholder label={`${m.when} · ${m.what}`} className="h-full w-full" />
              )}
            </div>
            <div className="p-3">
              <div className="font-display text-base font-medium tracking-normal text-navy-950">
                {m.when}
              </div>
              <h3 className="mt-1 text-xs font-bold text-teal-brand">{m.what}</h3>
              <p className="mt-1 text-[11px] leading-snug text-gray-600">{m.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
