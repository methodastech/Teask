import { useState } from 'react'
import { motion } from 'framer-motion'
import { EASE } from './Section'
import GlyphMark, { type MarkName } from './GlyphMark'

/**
 * The technology stack read as a journey rather than a feature list.
 *
 * Each layer depends on the one before it — light is captured, held, directed,
 * and eventually traded — and a grid of four equal cards throws that dependency
 * away. So the stages are a numbered rail you read top to bottom, and the rail
 * doubles as the control: the stage you are on is spelled out in full beside it.
 *
 * Two earlier attempts are worth not repeating. A fork with three branches was
 * accurate but took work to parse. Hover-to-reveal panels put the copy behind an
 * interaction, which is the wrong place for the only real explanation on the
 * page — nobody hovers what they cannot see. Here the detail is always on screen
 * for whichever stage is selected, in its own column, so nothing overlaps and
 * nothing has to be discovered.
 *
 * No quantities appear anywhere. Array output is still unpublished, so this
 * describes a sequence, never a volume.
 */

type Stage = {
  mark: MarkName
  /** the one-word action, so the sequence is scannable before it is read */
  verb: string
  title: string
  body: string
  status: string
  soon?: boolean
}

const STAGES: Stage[] = [
  {
    mark: 'solar',
    verb: 'Capture',
    title: 'Solar generation',
    body: 'Bifacial PV on a dual-pitch butterfly canopy, folds flat for transport, harvests on site.',
    status: 'Shipping',
  },
  {
    mark: 'battery',
    verb: 'Store',
    title: 'Energy storage',
    body: 'On-board battery buffers generation and delivers fast, reliable charging around the clock.',
    status: 'Shipping',
  },
  {
    mark: 'network',
    verb: 'Direct',
    title: 'Smart-grid controller',
    body: 'Balances draw, health and load, standalone or tied to the grid when one is present.',
    status: 'Shipping',
  },
  {
    mark: 'exchange',
    verb: 'Trade',
    title: 'P2P & VPPA trading',
    body: 'An upgradeable core designed for peer-to-peer and virtual power purchase energy trading.',
    status: 'On the roadmap',
    soon: true,
  },
]

/** where the stack ends up. Endpoints, not stages — no detail panel of their own */
const ENDPOINTS: { mark: MarkName; label: string; note: string }[] = [
  { mark: 'bolt', label: 'EV charging', note: 'Fast charge, on site' },
  { mark: 'plug', label: 'Grid tie', note: 'When a grid is present' },
]

export default function EnergyFlow() {
  const [active, setActive] = useState(0)
  const stage = STAGES[active]

  // The rail takes the larger share of the width. It carries the actual argument
  // of the section — that these layers are a chain — where the panel only
  // elaborates whichever link you are on. Sized the other way round, the card
  // out-shouted the thing it was explaining.
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12">
      {/* ── the rail: the whole sequence, always visible ─────────────── */}
      <div>
        {/*
          Sunlight is part of the chain, not a caption above it, so it sits on the
          rail as its own node — the input the product does not carry with it. It
          is also the only element with continuous motion: rays turning, core
          breathing. Everything else here moves in response to the reader.
        */}
        <div className="relative flex items-center gap-4 pb-2 lg:gap-5">
          <span aria-hidden className="absolute top-1/2 bottom-0 left-[21px] w-[2px] lg:left-[27px] bg-solar/25" />
          <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center lg:h-14 lg:w-14">
            <span
              aria-hidden
              className="sun-rays absolute inset-0 grid place-items-center text-solar/70"
            >
              <svg viewBox="0 0 48 48" className="h-9 w-9 lg:h-12 lg:w-12" fill="none" aria-hidden="true">
                {Array.from({ length: 12 }, (_, k) => (
                  <line
                    key={k}
                    x1="24"
                    y1="3.5"
                    x2="24"
                    y2="8.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    transform={`rotate(${k * 30} 24 24)`}
                  />
                ))}
              </svg>
            </span>
            <span
              aria-hidden
              className="sun-core h-5 w-5 rounded-full lg:h-6 lg:w-6 bg-solar shadow-[0_0_18px_4px_rgba(242,169,59,0.45)]"
            />
          </span>
          <span className="font-mono text-[11px] tracking-[0.24em] text-solar uppercase">
            Sunlight in
          </span>
        </div>

        <div role="tablist" aria-label="Technology stages">
          {STAGES.map((s, i) => {
            const on = i === active
            const passed = i <= active
            return (
              <button
                key={s.title}
                role="tab"
                aria-selected={on}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group relative flex w-full cursor-pointer items-start gap-4 py-3 pr-3 pl-0 text-left outline-none lg:items-center lg:gap-5 lg:py-[18px]"
              >
                {/* the rail itself: filled to the stage you're on, so progress
                    down the chain is legible without reading a word */}
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 left-[21px] w-[2px] lg:left-[27px] bg-navy-950/10"
                />
                {i < STAGES.length - 1 && (
                  <motion.span
                    aria-hidden
                    className="absolute top-1/2 bottom-0 left-[21px] w-[2px] lg:left-[27px] origin-top bg-blue-brand"
                    initial={false}
                    animate={{ scaleY: i < active ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
                {i > 0 && (
                  <motion.span
                    aria-hidden
                    className="absolute top-0 bottom-1/2 left-[21px] w-[2px] lg:left-[27px] origin-bottom bg-blue-brand"
                    initial={false}
                    animate={{ scaleY: passed ? 1 : 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  />
                )}
                {/* a charge falling down the live part of the rail */}
                {i < active && (
                  <span
                    aria-hidden
                    className="rail-drop absolute left-[17px] h-2 w-2.5 lg:left-[23px] rounded-full bg-blue-brand shadow-[0_0_10px_2px_rgba(0,132,214,0.55)]"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  />
                )}

                {/* the node */}
                <span
                  className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center border transition-all duration-300 lg:h-14 lg:w-14 ${
                    on
                      ? 'border-blue-brand bg-blue-brand text-white shadow-[0_12px_30px_-10px_rgba(0,132,214,0.75)]'
                      : passed
                        ? 'border-blue-brand/40 bg-white text-blue-brand'
                        : s.soon
                          ? 'border-dashed border-navy-950/25 bg-white text-navy-950/50 group-hover:border-navy-950/40'
                          : 'border-navy-950/15 bg-white text-navy-950/55 group-hover:border-navy-950/30'
                  }`}
                >
                  <GlyphMark name={s.mark} size={28} className="text-current" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2.5">
                    <span
                      className={`font-mono text-[10px] tabular-nums transition-colors ${
                        on ? 'text-blue-brand' : 'text-navy-950/30'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`font-mono text-[10px] tracking-[0.22em] uppercase transition-colors ${
                        on ? 'text-blue-brand' : 'text-navy-950/35'
                      }`}
                    >
                      {s.verb}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block text-[17px] font-semibold tracking-normal transition-colors lg:text-[19px] ${
                      on ? 'text-navy-950' : 'text-navy-950/65 group-hover:text-navy-950'
                    }`}
                  >
                    {s.title}
                  </span>

                  {/* Below lg the detail lives here rather than in a panel of its
                      own. Stacked, the rail and the panel said the same stage
                      twice and doubled the section's height — you scrolled the
                      whole chain, then read one link of it again. Expanding in
                      place keeps the sequence intact and halves the scroll. */}
                  <span
                    className={`block overflow-hidden transition-all duration-300 lg:hidden ${
                      on ? 'mt-2 max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <span className="block text-[13.5px] leading-relaxed text-gray-600">
                      {s.body}
                    </span>
                    <span
                      className={`mt-2.5 inline-block border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] uppercase ${
                        s.soon
                          ? 'border-dashed border-navy-950/20 text-navy-950/45'
                          : 'border-teal-brand/30 bg-teal-brand/[0.07] text-teal-brand'
                      }`}
                    >
                      {s.status}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* where it ends up */}
        <div className="relative mt-1 pt-6 pl-[60px] lg:pl-[76px]">
          <span aria-hidden className="absolute top-0 left-[21px] h-6 w-[2px] lg:left-[27px] bg-navy-950/10" />
          <span
            aria-hidden
            className="absolute top-6 left-[17px] h-0 w-0 lg:left-[23px] border-x-[5px] border-t-[7px] border-x-transparent border-t-navy-950/25"
          />
          <span className="font-mono text-[10px] tracking-[0.24em] text-navy-950/45 uppercase">
            Delivers to
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            {ENDPOINTS.map((e) => (
              <span
                key={e.label}
                className="inline-flex items-center gap-2 border border-navy-950/10 bg-white px-3 py-2"
              >
                <GlyphMark name={e.mark} size={16} className="text-blue-brand" />
                <span className="text-[13px] font-medium text-navy-950">{e.label}</span>
                <span className="text-[12px] text-gray-400">· {e.note}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── the detail: one stage, spelled out, never hidden ──────────── */}
      {/* The height is fixed rather than hugging its copy: the bodies differ in
          length and a panel that resized under the pointer would make the rail
          feel unstable. Content is centred in it so the shortest stage doesn't
          leave a hole above the ticks. */}
      <div className="relative hidden flex-col border border-navy-950/10 bg-white p-8 pb-14 lg:flex shadow-[0_20px_50px_-34px_rgba(5,7,14,0.26)] md:p-9 md:pb-14">
        {/* the stage number, set large and pale — orientation, not decoration */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-4 right-6 font-display text-[110px] leading-none font-light text-navy-950/[0.045] select-none"
        >
          {String(active + 1).padStart(2, '0')}
        </span>


        {/* Keyed, but deliberately without an exit animation. `mode="wait"` holds
            the old copy on screen while it fades, so the panel goes blank between
            stages — a 300ms hole in the middle of the thing you are reading. React
            swaps the content on the key change and the new stage fades up in its
            place, which is both quicker and continuous. */}
        <div className="relative">
          <motion.div
            key={stage.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
            className="relative"
          >
            <GlyphMark
              name={stage.mark}
              size={40}
              className={stage.soon ? 'text-navy-950/40' : 'text-blue-brand'}
            />
            <p className="mt-6 font-mono text-[10px] tracking-[0.24em] text-blue-brand uppercase">
              {stage.verb}
            </p>
            {/* Sized down a step. The panel is the footnote to the rail, and at
                38px it was setting the section's headline twice. */}
            <h3 className="mt-2 font-display text-[28px] font-light tracking-normal text-navy-950 md:text-[32px]">
              {stage.title}
            </h3>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-gray-600">{stage.body}</p>
            <span
              className={`mt-7 inline-block border px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase ${
                stage.soon
                  ? 'border-dashed border-navy-950/20 text-navy-950/45'
                  : 'border-teal-brand/30 bg-teal-brand/[0.07] text-teal-brand'
              }`}
            >
              {stage.status}
            </span>
          </motion.div>
        </div>

        {/* Which of the four you are on. These were 1px tall with a scaled child
            inside an overflow-hidden box, which rounded to nothing on some rows
            and rendered as ragged offcuts — 2px with an animated width behaves. */}
        <div className="absolute right-8 bottom-7 left-8 flex gap-1.5 md:right-9 md:left-9">
          {STAGES.map((s, i) => (
            <span key={s.title} className="relative h-[2px] flex-1 bg-navy-950/10">
              <motion.span
                className="absolute inset-y-0 left-0 bg-blue-brand"
                initial={false}
                animate={{ width: i <= active ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
