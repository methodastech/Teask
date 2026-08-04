import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { getRelated, POSTS } from '../../lib/posts'
import { chamferClip } from '../ChamferBorder'

/**
 * The article page's right rail, a news-portal style panel that carries the
 * site's own material instead of adverts: related reading, more from the
 * library, upcoming Teask moments, and a strip of real field photography.
 */

/** upcoming moments Teask has spoken about publicly; dates confirmed later */
const EVENTS: { title: string; when: string; note: string }[] = [
  {
    title: 'MITI speaker slot',
    when: 'Date to be announced',
    note: 'Teask on rapidly deployable energy infrastructure.',
  },
  {
    title: 'Campus sandbox pilot',
    when: 'From September 2026',
    note: 'First pilot deployments through innovation sandbox environments.',
  },
  {
    title: 'New deployment',
    when: 'Details to follow',
    note: 'The next T Station site, announced when confirmed.',
  },
]

const GALLERY: { src: string; alt: string }[] = [
  { src: '/images/photos/nea-204.jpg', alt: 'Teask team members holding National Energy Awards 2025 trophies.' },
  { src: '/images/photos/l1960346.jpg', alt: 'The Teask fast-charging unit with its scan-to-charge panel.' },
  { src: '/images/photos/nea-202.jpg', alt: 'The Teask team beneath a Race Towards Net Zero arch at IGEM 2025.' },
  { src: '/images/photos/l1960339.jpg', alt: 'Electric motorcycles charging beneath the T Station solar canopy.' },
]

function RailHeading({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-[0.3em] text-teal-brand uppercase">
        {children}
      </span>
      <span className="h-px flex-1 bg-navy-950/10" aria-hidden="true" />
    </div>
  )
}

export default function BlogSidebar({ slug }: { slug: string }) {
  const related = getRelated(slug, 3)
  const relatedSlugs = new Set(related.map((p) => p.slug))
  const more = POSTS.filter((p) => p.slug !== slug && !relatedSlugs.has(p.slug)).slice(0, 3)

  return (
    <aside className="space-y-10 lg:sticky lg:top-24 lg:self-start" aria-label="Related content">
      {/* related to this article */}
      <div>
        <RailHeading>Related reading</RailHeading>
        <div className="mt-4 space-y-4">
          {related.map((p) => (
            <Link key={p.slug} to={`/resources/${p.slug}`} className="group flex gap-3">
              <img
                src={p.cover}
                alt=""
                loading="lazy"
                className="h-14 w-20 shrink-0 object-cover"
              />
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] text-teal-brand uppercase">
                  {p.category}
                </div>
                <div className="mt-0.5 text-[13px] leading-snug font-semibold text-navy-950 group-hover:text-teal-brand">
                  {p.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* more from the library */}
      <div>
        <RailHeading>More from Teask</RailHeading>
        <ul className="mt-4 space-y-3">
          {more.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/resources/${p.slug}`}
                className="group -my-1 flex items-baseline gap-2 py-1 text-[13px] leading-snug font-medium text-gray-600 hover:text-navy-950"
              >
                <ArrowRight
                  size={11}
                  className="shrink-0 translate-y-px text-teal-brand"
                  aria-hidden="true"
                />
                <span className="group-hover:underline">{p.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* upcoming */}
      <div>
        <RailHeading>Coming up</RailHeading>
        <div className="mt-4 space-y-4">
          {EVENTS.map((e) => (
            <div key={e.title} className="border border-navy-950/10 bg-paper p-4">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-teal-brand uppercase">
                <CalendarDays size={11} aria-hidden="true" />
                {e.when}
              </div>
              <div className="mt-1.5 text-sm font-bold text-navy-950">{e.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{e.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* from the field */}
      <div>
        <RailHeading>From the field</RailHeading>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {GALLERY.map((g) => (
            <img
              key={g.src}
              src={g.src}
              alt={g.alt}
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      </div>

      {/* the one action */}
      <Link
        to="/contact"
        style={{ clipPath: chamferClip(10) }}
        className="block bg-blue-brand px-5 py-4 text-center text-xs font-semibold tracking-[0.2em] text-white uppercase transition-colors hover:bg-teal-brand"
      >
        Discuss a deployment
      </Link>
    </aside>
  )
}
