import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useScroll } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/**
 * Back to top, mirroring the hero's exit button so the two read as one family:
 * same 64px frosted disc, same hairline, same progress ring, same hover to
 * brand blue. The hero's sits at the top of the viewport and this one at the
 * bottom, both pinned to the window edge rather than the shell's gutter: in the
 * gutter they landed on top of full-bleed media (the intro video runs to the
 * content edge), so they sit outside the column instead.
 *
 * The ring reads the same scroll progress the exit button does, so it doubles as
 * a "how far through am I" indicator rather than being decoration copied across.
 */
export default function BackToTop() {
  const { scrollYProgress } = useScroll()

  // Only worth showing once there is something to come back from. One viewport
  // is the threshold: below that the top is a short flick away and a floating
  // button is just clutter over the hero.
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-8 z-40"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex justify-end px-4 sm:px-6">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Back to top"
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
              <ArrowUp
                size={24}
                strokeWidth={2.4}
                className="transition-transform duration-300 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
