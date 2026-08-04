import { Link } from 'react-router-dom'
import { MapPin, ArrowUpRight } from 'lucide-react'
import { SectionHeading } from './Section'
import TiltCard from './TiltCard'


const PROJECTS: {
  location: string
  title: string
  meta: string
  image: string
  alt: string
  /** case-study page, when one exists */
  href?: string
  badge?: string
  /** not live yet, the shot greys out and a band crosses it */
  comingSoon?: boolean
}[] = [
  {
    location: 'Cyberjaya, Selangor',
    title: 'DPULZE Shopping Centre',
    meta: 'Solar EV & e-motorcycle station',
    image: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3FP46Emobin1BeouoYpzom4YJCr/897e4763-ec01-42ac-8b44-f3b57b68ad16.jpg',
    alt: 'The T Station installed at DPULZE Shopping Centre in Cyberjaya, sheltering electric motorcycles.',
    badge: "Malaysia's First-Ever T Station",
    href: '/projects/dpulze-cyberjaya',
  },
  {
    location: 'Klang Valley',
    title: 'Fleet charging pilot',
    meta: 'On-site fast-charging',
    image: '/images/photos/l1960342.jpg',
    alt: 'Electric motorcycles charging in a row beneath the T Station solar canopy.',
  },
]

export default function Projects() {
  return (
    <section id="projects" className="relative w-full bg-white py-16 md:py-32">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Projects"
            title={
              <>
                Live in
                <br />
                <span className="text-teal-brand">the field.</span>
              </>
            }
          />
          <Link
            to="/projects/dpulze-cyberjaya"
            className="group hidden items-center gap-2 pb-2 text-sm font-semibold text-gray-600 transition-colors hover:text-navy-950 md:inline-flex"
          >
            Read the case study
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {PROJECTS.map((p, i) => (
            <div key={p.title} className="w-[76%] shrink-0 snap-start md:w-auto">
              <TiltCard href={p.href} delay={i * 0.1}>
              <div className="relative">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      p.comingSoon ? 'saturate-50' : ''
                    }`}
                  />
                </div>

                {/* not live yet, a band crosses the greyed-out shot */}
                {p.comingSoon && (
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div className="absolute inset-0 bg-white/45" />
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 border-y border-teal-brand/45 bg-white/85 py-2 backdrop-blur-[1px]">
                      <div className="text-center font-mono text-[10px] font-bold tracking-[0.45em] text-teal-brand uppercase md:text-[11px]">
                        Coming soon
                      </div>
                    </div>
                  </div>
                )}
                {p.badge && (
                  /* frosted-glass badge: a modern, semi-transparent panel that lets
                     the photo read through a blur, with a hairline glass top edge */
                  <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-1.5 border border-white/25 bg-navy-950/25 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md">
                    {/* bright top edge sells the glass */}
                    <span
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/45"
                      aria-hidden="true"
                    />
                    <MapPin size={12} strokeWidth={2} className="relative text-teal-brand" aria-hidden="true" />
                    <span className="relative font-mono text-[10px] font-bold tracking-[0.1em] text-white uppercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
                      {p.badge}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-gray-600 uppercase">
                  <MapPin size={12} className="text-teal-brand" aria-hidden="true" />
                  {p.location}
                </div>
                <h3 className="mt-3 text-lg font-bold text-navy-950">{p.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{p.meta}</p>
              </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
