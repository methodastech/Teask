import { type ReactNode, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The site's horizontal carousel: SHARP edges (a peeking card is simply clipped
 * by the container, no soft fade mask) with two sharp arrow buttons at the
 * upper-right that scroll one card at a time. Scrollbar hidden; swipe still works.
 *
 * `className` styles the inner scroll track (flex, gap, snap, padding). Mark each
 * scrollable card with `data-carousel-item` so a click steps exactly one card.
 */

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center border border-navy-950/15 text-navy-950 transition-colors duration-200 hover:border-teal-brand hover:bg-teal-brand hover:text-white"
    >
      {children}
    </button>
  )
}

export default function Carousel({
  children,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const scroll = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const item = el.querySelector<HTMLElement>('[data-carousel-item]')
    // step one card (its width + the flex gap), falling back to most of the view
    const step = item ? item.getBoundingClientRect().width + 20 : el.clientWidth * 0.8
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mb-5 flex justify-end gap-2">
        <NavButton onClick={() => scroll(-1)} label="Previous">
          <ChevronLeft size={18} aria-hidden="true" />
        </NavButton>
        <NavButton onClick={() => scroll(1)} label="Next">
          <ChevronRight size={18} aria-hidden="true" />
        </NavButton>
      </div>
      <div
        ref={ref}
        aria-label={ariaLabel}
        className={`overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
