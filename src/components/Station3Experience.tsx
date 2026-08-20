import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { ArrowRight, ChevronDown, ChevronLeft, MousePointerClick, X } from 'lucide-react'
import { PART_GROUPS } from '../lib/station3Parts'
import type { HeroStyle } from '../lib/heroStyle'
import { setViewportCovered } from '../lib/overlay'
import SolarDay from './SolarDay'
import ProductCallouts from './ProductCallouts'
import { chamferClip } from './ChamferBorder'

/**
 * Section 1 → 2 · the optional experience.
 *
 * Intro: Station 3 + headline + ENTER. The page scrolls freely past it, so a
 * visitor who just wants the proposition is never held up. Take ENTER and the
 * model solidifies, the camera dollies in and the explorer takes over (hover a
 * part → name, click-and-hold → zoom + spec).
 */

const Station3Model = lazy(() => import('./Station3Model'))
// lazy for the same reason the model is: it imports three, and the main bundle
// must not carry it
const HeroIntroFlight = lazy(() => import('./HeroIntroFlight'))
const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The hero headline: "POWER IN MOTION", exactly two lines, gradient. Static.
 * nowrap keeps "IN MOTION" whole, it broke to a third line at the largest step,
 * and the top size is set so that line still clears the 3D unit on the right.
 */
function HeroHeadline() {
  // Size is the fluid --text-hero scale: 56px on a phone through 104px at 2560,
  // held from there to 4K. nowrap keeps "In Motion" on one line, so the ceiling
  // is set where that line still clears the unit on the right.
  return (
    <motion.h1
      className="mt-6 font-display text-hero font-light tracking-normal whitespace-nowrap"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
    >
      <span className="block bg-gradient-to-r from-teal-brand to-blue-brand bg-clip-text text-transparent">
        Power
      </span>
      <span className="block bg-gradient-to-r from-teal-brand to-blue-brand bg-clip-text text-transparent">
        In Motion
      </span>
    </motion.h1>
  )
}

export default function Station3Experience() {
  const enteredRef = useRef(false)
  const labelRef = useRef<HTMLDivElement>(null)
  const leaderRef = useRef<SVGLineElement>(null)
  const reticleRef = useRef<HTMLDivElement>(null)
  // imperative channel into the model, the part legend focuses parts through it
  const selectRef = useRef<((id: string | null) => void) | null>(null)
  // fires the hero's own descent, timed to the intro handing over
  const arriveRef = useRef<(() => void) | null>(null)

  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [entered, setEntered] = useState(false)

  /**
   * The descent from the sun. Plays on every load, by request — there is no
   * once-per-session gate, so a refresh always replays it.
   *
   * Reduced-motion is still honoured: for anyone who has asked the OS not to
   * animate, a five-second fall is not a flourish, and that preference is not a
   * matter of taste. It stays skippable by any click, key, scroll or the Skip
   * button for everyone else.
   */
  const [flightDone, setFlightDone] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  /**
   * The fall and the hero's own loading run concurrently, and the hero is the
   * slower of the two — the bike alone is 37MB. Landing out of cloud onto an
   * empty grey box undoes the whole effect, so the white is HELD until the model
   * reports ready. Capped at 2.5s past the flight so a stalled asset cannot trap
   * anyone behind a white screen; a late-arriving model is better than a lock.
   */
  const [flightEnded, setFlightEnded] = useState(false)
  const endFlight = useCallback(() => setFlightEnded(true), [])

  useEffect(() => {
    if (!flightEnded || flightDone) return
    const reveal = () => {
      // kick the hero's descent off the same beat the white starts lifting, so
      // the two moves read as one continuous fall rather than a cut
      arriveRef.current?.()
      setFlightDone(true)
    }
    if (ready) {
      reveal()
      return
    }
    const cap = window.setTimeout(reveal, 2500)
    return () => window.clearTimeout(cap)
  }, [flightEnded, ready, flightDone])

  /**
   * The model's render loop is held while the intro covers it, and only the
   * arrival trigger releases it. That trigger is assigned when the model
   * finishes loading — so if the reveal happens FIRST (the 2.5s cap fires on a
   * slow asset), the parent calls a trigger that does not exist yet and the
   * hero would never draw at all. Re-firing once the model is ready closes that
   * window; calling it twice is harmless, it just restarts the approach.
   */
  useEffect(() => {
    if (flightDone && ready) arriveRef.current?.()
  }, [flightDone, ready])

  /**
   * While the descent is up it owns the screen outright, so tell the rest of
   * the page to stand down — the ambient dust canvas in particular, which is
   * repainting the full viewport underneath it for nothing. Released the moment
   * the overlay starts lifting, not when it finishes, so the dust is already
   * running by the time any of it shows through.
   */
  useEffect(() => {
    setViewportCovered(!flightDone)
    return () => setViewportCovered(false)
  }, [flightDone])

  useEffect(() => {
    if (flightDone) return
    const skip = () => {
      setFlightEnded(true)
      setFlightDone(true)
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('wheel', skip, { passive: true })
    window.addEventListener('touchstart', skip, { passive: true })
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
    }
  }, [flightDone, endFlight])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pressId, setPressId] = useState<string | null>(null)

  /**
   * Hero art-direction switch, for showing the client the options side by side.
   * Persisted so a reload during a presentation doesn't snap back to the default.
   * Flipping it tears down and rebuilds the whole 3D scene, which is why the
   * loading state is reset alongside it.
   */
  const [heroStyle, setHeroStyleState] = useState<HeroStyle>(() => {
    // localStorage throws outright when storage is blocked (private mode, a
    // sandboxed frame), and this runs during render, so an unguarded read would
    // take the whole hero down rather than just losing the preference
    try {
      // A stored preference is only honoured while its option still has a button.
      // Anyone last left on V2 — or on blueprint, before that — would otherwise
      // reload straight back into a treatment with no way out of it, since the
      // switcher is the only thing that can change this. Anything not in
      // HERO_STYLES falls through to V1.
      const saved = window.localStorage.getItem('teask:hero-style') as HeroStyle | null
      return saved && HERO_STYLES.some((s) => s.id === saved) ? saved : 'model'
    } catch {
      return 'model'
    }
  })
  const setHeroStyle = (next: HeroStyle) => {
    setHeroStyleState(next)
    setReady(false)
    setProgress(0)
    try {
      window.localStorage.setItem('teask:hero-style', next)
    } catch {
      /* private mode, the choice just won't survive a reload */
    }
  }

  // page scroll 0→1, drives the close button's progress ring (fills to full teal
  // as you reach the bottom, Orano-style)
  const { scrollYProgress } = useScroll()

  // hide the fixed close button once the visitor scrolls past the hero so it does
  // not float over the sections below
  const [pastHero, setPastHero] = useState(false)
  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The page used to be held at the top until ENTER was clicked, which made the
  // 3D piece a toll gate: a visitor who only wanted the proposition had to opt
  // into an experience first, and anyone who scrolled and got nothing may well
  // have assumed the page was broken. Scrolling is now free from the first
  // frame and ENTER is an invitation rather than a turnstile — take it and you
  // get the explorer, ignore it and the page reads straight through.

  const onProgress = useCallback((l: number, t: number) => setProgress(Math.round((l / t) * 100)), [])
  const onReady = useCallback(() => setReady(true), [])

  const enter = useCallback(() => {
    enteredRef.current = true
    setEntered(true)
    // ENTER can now be clicked with the hero part-scrolled, so bring it back to
    // full frame; the explorer assumes it owns the viewport
    document.getElementById('product')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToNext = useCallback(() => {
    document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // back to the intro: the model de-solidifies and the camera dollies back out
  const exit = useCallback(() => {
    selectRef.current?.(null) // release any legend-selected part in the model
    enteredRef.current = false
    setEntered(false)
    setHoverId(null)
    setPressId(null)
  }, [])

  const activeId = pressId ?? hoverId
  const activeGroup = PART_GROUPS.find((g) => g.id === activeId) ?? null
  // the phone panel keys off the pressed part only — touch has no hover, so
  // there is no transient state for it to follow
  const pressedGroup = PART_GROUPS.find((g) => g.id === pressId) ?? null
  const expanded = !!pressId

  return (
    <>
    <section id="product" className="relative h-screen w-full overflow-hidden bg-paper" aria-label="T Station T3">
      {/* the approach, over everything until it hands over */}
      <AnimatePresence>
        {!flightDone && (
          <motion.div
            className="absolute inset-0 z-50 cursor-pointer bg-[#03060f]"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.15, ease: EASE }}
            onClick={endFlight}
          >
            <Suspense fallback={null}>
              <HeroIntroFlight onDone={endFlight} />
            </Suspense>
            <button
              type="button"
              onClick={endFlight}
              className="absolute right-5 bottom-6 cursor-pointer border border-white/25 px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-white/70 uppercase transition-colors hover:border-white/60 hover:text-white sm:right-8"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the persistent 3D scene */}
      <Suspense fallback={null}>
        <Station3Model
          key={heroStyle}
          heroStyle={heroStyle}
          arriveFromAbove={!flightDone || flightEnded}
          arriveRef={arriveRef}
          enteredRef={enteredRef}
          labelRef={labelRef}
          leaderRef={leaderRef}
          reticleRef={reticleRef}
          onHoverChange={setHoverId}
          onPressChange={setPressId}
          onEnterRequest={enter}
          onProgress={onProgress}
          onReady={onReady}
          selectRef={selectRef}
        />
      </Suspense>

      {/* leader line + reticle + anchored spec label (active in both phases) */}
      {/* leader + reticle + anchored card are a desktop-pointer idiom: they exist
          to follow a cursor. On a phone selection happens in the parts panel and
          the specs render there, so none of this draws below md. */}
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" aria-hidden="true">
        <line
          ref={leaderRef}
          stroke="#3bb1e3"
          strokeWidth="1"
          strokeDasharray="3 3"
          style={{ opacity: 0, transition: 'opacity 200ms' }}
        />
      </svg>
      <div
        ref={reticleRef}
        className="pointer-events-none absolute top-0 left-0 hidden h-7 w-7 border border-teal-brand/70 md:block"
        style={{ opacity: 0, transition: 'opacity 200ms', borderRadius: '50%' }}
        aria-hidden="true"
      >
        <span className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-brand" />
      </div>
      <div
        ref={labelRef}
        className="pointer-events-none absolute top-0 left-0 z-20 hidden will-change-transform md:block"
        style={{ opacity: 0, transition: 'opacity 180ms' }}
        aria-live="polite"
      >
        <AnimatePresence>
          {activeGroup && (
            <motion.div
              key="spec-label"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="w-max max-w-[260px] border border-navy-950/10 border-l-2 border-l-teal-brand bg-white/85 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
            >
              <span className="font-mono text-[10px] tracking-widest text-teal-brand uppercase">
                {activeGroup.tagline}
              </span>
              <h3 className="mt-1 text-lg font-bold text-navy-950">{activeGroup.label}</h3>
              {expanded ? (
                <>
                  <dl className="mt-3 space-y-2">
                    {activeGroup.specs.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 border-b border-navy-950/5 pb-1.5">
                        <dt className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">{k}</dt>
                        <dd className="text-right text-xs font-semibold text-navy-950">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 font-mono text-[9px] tracking-widest text-gray-600 uppercase">
                    Pending final spec sheet
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs font-light text-gray-600">
                  {entered ? 'Select it from the part list' : 'Highlighted'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom fade, dissolves the 3D floor grid into the background so the
          scroll into the next section reads as one continuous surface */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-48 bg-gradient-to-t from-white to-transparent"
        aria-hidden="true"
      />

      {/* ── INTRO overlay ──────────────────────────────────────── */}
      <AnimatePresence>
        {!entered && flightDone && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-start pt-24 md:justify-center md:pt-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* readability scrim, vertical on a phone (scene sits below the copy),
                left-to-right on desktop (scene sits behind it) */}
            {/* Phone: the scene now runs the full height behind the copy, so the
                scrim holds solid over the text and is fully clear by 62% — the
                unit sits below that and keeps its colour. Explicit stops for the
                same reason as desktop: Tailwind's `via` is pinned to 50%. */}
            <div
              className="pointer-events-none absolute inset-0 md:hidden"
              style={{
                background:
                  'linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0.96) 38%, rgba(255,255,255,0.62) 50%, rgba(255,255,255,0.16) 57%, rgba(255,255,255,0) 62%)',
              }}
            />
            {/* Desktop: explicit stops rather than Tailwind's from/via/to, because
                `via` is pinned to 50% and that was washing the whole frame. The
                white now holds solid across the copy, falls away quickly, and is
                fully clear by 58% so the right side keeps its full colour. */}
            <div
              className="pointer-events-none absolute inset-0 hidden md:block"
              style={{
                background:
                  'linear-gradient(to right, #fff 0px, rgba(255,255,255,0.97) 390px, rgba(255,255,255,0.82) 520px, rgba(255,255,255,0.4) 660px, rgba(255,255,255,0) 860px)',
              }}
            />

            <div className="relative shell">
              {/* data-hero-copy: the 3D camera measures this block and drops the
                  unit below it. The copy's height is not a fixed fraction of the
                  frame — at 320px the paragraph runs to four lines and the ENTER
                  button lands where a hard-coded offset had already put the
                  canopy. */}
              <div className="max-w-xl" data-hero-copy>
                <motion.p
                  className="flex items-center gap-3 text-eyebrow font-semibold tracking-[0.28em] text-teal-brand uppercase"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                >
                  Solar EV charging
                </motion.p>

                <HeroHeadline />

                <motion.p
                  className="mt-6 max-w-[35rem] text-intro font-light text-gray-600"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.26, ease: EASE }}
                >
                  A portable solar station, drawn from its real engineering. Explore it part by
                  part, or step inside.
                </motion.p>

                <motion.button
                  type="button"
                  onClick={enter}
                  disabled={!ready}
                  style={{ clipPath: chamferClip(14) }}
                  className="group pointer-events-auto mt-9 inline-flex items-center bg-blue-brand px-8 py-4 text-sm font-semibold tracking-[0.2em] text-white transition-colors duration-300 hover:bg-teal-brand disabled:cursor-wait disabled:opacity-60"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.34, ease: EASE }}
                >
                  {ready ? (
                    <>
                      {/* leading rule slides in on hover, the Orano detail */}
                      <span className="mr-0 h-px w-0 bg-white transition-all duration-300 group-hover:mr-3 group-hover:w-6" />
                      ENTER
                      <span className="ml-3 inline-flex transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-0">
                        <ArrowRight size={16} className="arrow-nudge" aria-hidden="true" />
                      </span>
                    </>
                  ) : (
                    <span className="tracking-widest">Loading · {progress}%</span>
                  )}
                </motion.button>
              </div>
            </div>

            {/* ── framing anchors, aligned to the same content gutter ── */}
            {/* bottom frame: meaning anchor · hover hint · solar day */}
            <div className="absolute inset-x-0 bottom-6">
              <div className="shell flex items-end justify-between">
                <div className="flex items-center gap-5">
                  <span className="hidden font-mono text-[10px] tracking-[0.3em] text-gray-600 uppercase sm:block">
                    Tenaga Alam Sekitar Kita
                  </span>
                  {HERO_STYLES.length > 1 && (
                    <HeroStyleSwitch value={heroStyle} onChange={setHeroStyle} />
                  )}
                </div>
                {/* Now that the page scrolls without entering, the intro needs to
                    say so — otherwise the only visible instruction is ENTER and
                    the 3D piece still reads as a gate. The hover hint moves to
                    md+ where there is room for both. */}
                <button
                  type="button"
                  onClick={scrollToNext}
                  className="group pointer-events-auto flex h-10 cursor-pointer items-center gap-2 border border-navy-950/10 bg-white/70 px-4 backdrop-blur-md transition-colors duration-200 hover:border-blue-brand/40 hover:bg-white"
                  aria-label="Scroll on to the rest of the page"
                >
                  <span className="relative grid h-4 w-4 shrink-0 place-items-center overflow-hidden">
                    <ChevronDown className="scroll-cue text-blue-brand" size={16} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-navy-950/70 uppercase">
                    Scroll on
                  </span>
                </button>
                <div className="hidden items-center gap-2 md:flex">
                  <MousePointerClick size={13} className="text-teal-brand" aria-hidden="true" />
                  {/* a phone has nothing to hover with, so the instruction has to
                      change with the input device rather than the screen width */}
                  <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                    <span className="pointer-coarse:hidden">Hover the unit</span>
                    <span className="hidden pointer-coarse:inline">Tap the unit</span>
                  </span>
                </div>
                <SolarDay className="hidden md:flex" />
              </div>
            </div>

            {/* cycling benefit callout, floats by the unit, flips between three */}
            <ProductCallouts className="pointer-events-none absolute right-[8%] bottom-[26%] hidden md:block" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EXPLORE overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {entered && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {/* heading, aligned to the nav content gutter */}
            <div className="absolute inset-x-0 top-24">
              {/* data-hero-keepout: the spec callout reads this block's box and
                  routes around it, so hovering a part high on the canvas can no
                  longer drop the label on top of the heading */}
              <div className="shell" data-hero-keepout>
                {/* the padding lives on this inner box, not on `.shell`: `.shell`
                    sets `padding-inline` from unlayered CSS, which outranks a
                    Tailwind `pr-*` utility and silently swallowed it. On a phone
                    the close button is a 72px disc pinned to this same top-24
                    band on the right, and the headline ran underneath it. */}
                <div className="pr-24 md:pr-0">
                  <span className="flex items-center text-xs font-bold tracking-widest text-teal-brand uppercase">
                    The Product
                  </span>
                  {/* white: this sits over the live 3D scene, which is now a bright
                      outdoor render rather than the old near-white blueprint */}
                  <h2 className="mt-3 font-display text-heading font-light tracking-normal text-white [text-shadow:0_2px_18px_rgba(10,18,32,0.45)]">
                    Every part, spelled out.
                  </h2>
                </div>
              </div>
            </div>

            {/* The part index, the way into each part: click a name and the camera
                goes there. Written as one sheet rather than seven floating chips —
                a stack of pills reads as app UI parked on top of the render, where
                a single ruled panel reads as the drawing's own index and matches
                the spec card that opens opposite it. */}
            <div className="absolute inset-y-0 right-0 hidden items-center md:flex">
              <div className="shell flex w-full justify-end">
                <div className="pointer-events-auto w-[212px] border border-navy-950/10 bg-white/80 shadow-[0_28px_70px_-32px_rgba(5,7,14,0.45)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-navy-950/10 px-3.5 py-2.5">
                    <span className="font-mono text-[9px] tracking-[0.22em] text-navy-950/45 uppercase">
                      Parts
                    </span>
                    <span className="font-mono text-[9px] text-navy-950/25 tabular-nums">
                      {PART_GROUPS.length}
                    </span>
                  </div>
                  <div>
                    {PART_GROUPS.map((g, i) => {
                      const on = activeId === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => selectRef.current?.(pressId === g.id ? null : g.id)}
                          aria-pressed={pressId === g.id}
                          className={`group/part relative flex w-full cursor-pointer items-center gap-3 px-3.5 py-[9px] text-left transition-colors duration-200 ${
                            i > 0 ? 'border-t border-navy-950/[0.06]' : ''
                          } ${on ? 'bg-blue-brand/[0.07]' : 'hover:bg-blue-brand/[0.04]'}`}
                        >
                          {/* Hover previews the selected state in the brand blue
                              rather than a neutral grey, so pointing at a row
                              already tells you what picking it will do. Selection
                              stays distinguishable by weight and by the tick,
                              not by being the only blue thing. */}
                          <span
                            className={`absolute inset-y-0 left-0 w-[2px] transition-all duration-200 ${
                              on
                                ? 'bg-blue-brand'
                                : 'bg-transparent group-hover/part:bg-blue-brand/50'
                            }`}
                          />
                          <span
                            className={`font-mono text-[9px] tabular-nums transition-colors ${
                              on
                                ? 'text-blue-brand'
                                : 'text-navy-950/30 group-hover/part:text-blue-brand/70'
                            }`}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span
                            className={`flex-1 text-[12.5px] tracking-normal transition-colors ${
                              on
                                ? 'font-semibold text-blue-brand'
                                : 'font-medium text-navy-950/75 group-hover/part:text-blue-brand'
                            }`}
                          >
                            {g.label}
                          </span>
                          <span
                            className={`h-px transition-all duration-200 ${
                              on
                                ? 'w-4 bg-blue-brand'
                                : 'w-2 bg-navy-950/15 group-hover/part:w-3 group-hover/part:bg-blue-brand/60'
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone: the desktop index is pinned to the right margin, which a
                phone does not have — so it was hidden outright and a touch
                visitor had no way into the parts at all beyond hunting the model
                itself. Same index, laid into the empty apron under the unit, two
                columns so all seven names are on screen without swiping. */}
            <div className="absolute inset-x-0 bottom-24 md:hidden">
              <div className="shell">
                <div className="pointer-events-auto border border-navy-950/10 bg-white/80 shadow-[0_28px_70px_-32px_rgba(5,7,14,0.45)] backdrop-blur-xl">
                  {pressedGroup ? (
                    /* Detail view. The anchored spec card is a 205×242 slab on a
                       375px screen — it buried the very part it was describing.
                       On a phone the specs belong where the selection was made,
                       and the panel swaps in place so its height barely moves. */
                    <>
                      <button
                        type="button"
                        onClick={() => selectRef.current?.(null)}
                        className="flex min-h-11 w-full cursor-pointer items-center gap-2 border-b border-navy-950/10 px-3 py-2 text-left"
                      >
                        <ChevronLeft size={15} className="shrink-0 text-blue-brand" aria-hidden="true" />
                        <span className="flex-1">
                          <span className="block font-mono text-[9px] tracking-[0.18em] text-blue-brand uppercase">
                            {pressedGroup.tagline}
                          </span>
                          <span className="block text-[13px] font-semibold text-navy-950">
                            {pressedGroup.label}
                          </span>
                        </span>
                        <span className="font-mono text-[9px] tracking-[0.16em] text-navy-950/35 uppercase">
                          All parts
                        </span>
                      </button>
                      {/* two spec pairs per row: four stacked rows was most of the
                          old card's height, and the values are all short */}
                      <dl className="grid grid-cols-2">
                        {pressedGroup.specs.map(([k, v], i) => (
                          <div
                            key={k}
                            className={`px-3 py-2 ${i % 2 === 1 ? 'border-l border-navy-950/[0.06]' : ''} ${
                              i > 1 ? 'border-t border-navy-950/[0.06]' : ''
                            }`}
                          >
                            <dt className="font-mono text-[9px] tracking-[0.16em] text-navy-950/40 uppercase">
                              {k}
                            </dt>
                            <dd className="mt-0.5 text-[12.5px] leading-tight font-semibold text-navy-950">
                              {v}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {/* the caveat the desktop card carries — the figures are
                          provisional, so it travels with them */}
                      <p className="border-t border-navy-950/[0.06] px-3 py-1.5 font-mono text-[9px] tracking-[0.18em] text-gray-500 uppercase">
                        Pending final spec sheet
                      </p>
                    </>
                  ) : (
                    <>
                  <div className="flex items-center justify-between border-b border-navy-950/10 px-3 py-2">
                    <span className="font-mono text-[9px] tracking-[0.22em] text-navy-950/45 uppercase">
                      Parts
                    </span>
                    {/* the prompt the floating chip used to carry on desktop */}
                    <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-navy-950/35 uppercase">
                      <MousePointerClick size={11} className="text-blue-brand" aria-hidden="true" />
                      Drag to spin
                    </span>
                  </div>
                  <div className="grid grid-cols-2">
                    {PART_GROUPS.map((g, i) => {
                      const on = activeId === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => selectRef.current?.(pressId === g.id ? null : g.id)}
                          aria-pressed={pressId === g.id}
                          className={`relative flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors duration-200 ${
                            i % 2 === 1 ? 'border-l border-navy-950/[0.06]' : ''
                          } ${i > 1 ? 'border-t border-navy-950/[0.06]' : ''} ${
                            on ? 'bg-blue-brand/[0.07]' : ''
                          }`}
                        >
                          <span
                            className={`absolute inset-y-0 left-0 w-[2px] transition-all duration-200 ${
                              on ? 'bg-blue-brand' : 'bg-transparent'
                            }`}
                          />
                          <span
                            className={`font-mono text-[9px] tabular-nums ${
                              on ? 'text-blue-brand' : 'text-navy-950/30'
                            }`}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span
                            className={`flex-1 text-[12px] leading-tight ${
                              on ? 'font-semibold text-blue-brand' : 'font-medium text-navy-950/75'
                            }`}
                          >
                            {g.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Scroll guide. It was a 10px label in a corner and testers missed it,
                so it is now a real target: solid enough to register as a control,
                with the chevron carrying a slow, continuous fall. Motion is what
                actually gets noticed at the edge of vision — the size alone was
                never going to do it. */}
            <div className="absolute inset-x-0 bottom-6">
              <div className="shell">
                <button
                  type="button"
                  onClick={scrollToNext}
                  className="group pointer-events-auto flex h-10 cursor-pointer items-center gap-2.5 border border-navy-950/10 bg-white/85 px-4 shadow-[0_16px_40px_-22px_rgba(5,7,14,0.4)] backdrop-blur-md transition-all duration-200 hover:border-blue-brand/40 hover:bg-white"
                  aria-label="Scroll to the next section"
                >
                  {/* The chevron used to sit in a solid blue tile, which read as a
                      second button inside the button. Bare and brand-blue it is the
                      more visible of the two, because the eye reads the moving mark
                      rather than the block it was boxed in. */}
                  <span className="relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden">
                    <ChevronDown
                      className="scroll-cue text-blue-brand"
                      size={20}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.24em] text-navy-950/80 uppercase transition-colors group-hover:text-navy-950">
                    Scroll to explore
                  </span>
                </button>
              </div>
            </div>

            {/* same height, padding and gap as the scroll button opposite, so the
                two chips read as a pair rather than two unrelated widgets.
                md and up only: at 375px this chip and the scroll button both want
                the same row and were printing on top of each other, so on a phone
                the prompt moves into the parts panel header instead. */}
            <div className="absolute bottom-6 left-1/2 hidden h-10 -translate-x-1/2 items-center gap-2.5 border border-navy-950/10 bg-white/85 px-4 shadow-[0_16px_40px_-22px_rgba(5,7,14,0.4)] backdrop-blur-md md:flex">
              <MousePointerClick size={16} className="text-blue-brand" aria-hidden="true" />
              <span className="font-mono text-[11px] tracking-[0.24em] text-navy-950/80 uppercase">
                Click a part name to inspect
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>

    {/* fixed close button, the ring fills to full teal as you scroll to the
        bottom (Orano-style), and clicking it returns to the locked intro.
        Hidden once past the hero so it does not float over lower sections. */}
    <AnimatePresence>
      {entered && !pastHero && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-24 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex justify-end px-4 sm:px-6">
            {/* White on a translucent ring only worked while the world behind it
                was dark. Over the rendered site it sits on pale paving and grass,
                where white-on-nothing disappears. It now carries its own frosted
                disc, so it stays legible against whatever the camera happens to
                be pointing at rather than depending on the backdrop. */}
            <button
              type="button"
              onClick={exit}
              aria-label="Exit, back to start"
              className="group pointer-events-auto relative grid h-16 w-16 place-items-center rounded-full border border-navy-950/10 bg-white/85 text-navy-950 shadow-[0_10px_30px_-10px_rgba(5,7,14,0.45)] backdrop-blur-md transition-colors duration-300 hover:border-blue-brand/40 hover:bg-white hover:text-blue-brand"
            >
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 100 100"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="50" cy="50" r="47" stroke="rgba(5,7,14,0.10)" strokeWidth="2.5" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="47"
                  stroke="#0084d6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{ pathLength: scrollYProgress }}
                />
              </svg>
              <X
                size={26}
                strokeWidth={2.4}
                className="transition-transform duration-300 group-hover:rotate-90"
                aria-hidden="true"
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    </>
  )
}

/**
 * Art-direction switch for the hero, so the treatments can be compared in a
 * client review. Now three of them, so the two-state toggle has become a
 * segmented control — a switch can only ever announce on or off, which would
 * have left the third option unreachable to a screen reader. Radio semantics
 * are the honest fit: one of N, exactly one selected.
 */
/**
 * The treatments still on the table, numbered as the client refers to them.
 *
 * Only V1 remains in the comparison. Blueprint and V2 have both been withdrawn
 * from the *switcher* — their renderers are untouched in Station3Model and still
 * reachable by passing heroStyle='blueprint' or 'realistic', so nothing has been
 * thrown away and either can come back by adding one line here. The realistic
 * environment, its HDRI and PBR loading, and the whole detail branch all remain
 * in place pending the final call.
 *
 * The switcher hides itself below two options, since a segmented control with a
 * single choice is not a control.
 */
const HERO_STYLES: { id: HeroStyle; label: string }[] = [{ id: 'model', label: 'V1' }]

function HeroStyleSwitch({
  value,
  onChange,
}: {
  value: HeroStyle
  onChange: (next: HeroStyle) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Hero art direction"
      className="pointer-events-auto flex items-center gap-px border border-navy-950/10 bg-navy-950/10"
    >
      {HERO_STYLES.map((s) => {
        const on = s.id === value
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.id)}
            className={`cursor-pointer px-2.5 py-1.5 font-mono text-[9px] tracking-[0.2em] uppercase transition-colors duration-200 ${
              on
                ? 'bg-blue-brand text-white'
                : 'bg-white/85 text-gray-500 backdrop-blur-sm hover:bg-white hover:text-navy-950'
            }`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
