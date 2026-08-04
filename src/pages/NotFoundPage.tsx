import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SectionHeading } from '../components/site/Section'
import { chamferClip } from '../components/ChamferBorder'
import { usePageMeta } from '../lib/seo'

const ROUTES: { to: string; label: string; blurb: string }[] = [
  { to: '/solutions', label: 'Solutions', blurb: 'Where the T Station deploys and who it serves' },
  { to: '/resources', label: 'Resources', blurb: 'Articles on solar charging, microgrids and rural power' },
  { to: '/about', label: 'About', blurb: 'The company, the founders and the record' },
  { to: '/contact', label: 'Contact', blurb: 'Tell us the site and we will map the fit' },
]

/**
 * Catch-all. Before this existed an unknown URL rendered the chrome with an
 * empty middle — no message, no way onward. A dead end on a marketing site is a
 * lost enquiry, so this one routes people back into the funnel.
 */
export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found · Teask',
    description: 'That page does not exist. Find Teask solutions, resources, company information or get in touch.',
    path: '/404',
  })

  return (
    <main className="pt-16 md:pt-20">
      <section className="relative w-full bg-paper py-16 md:py-32">
        <div className="shell">
          <SectionHeading
            as="h1"
            eyebrow="Error 404"
            title={
              <>
                That page
                <br />
                <span className="text-teal-brand">isn&rsquo;t here.</span>
              </>
            }
            intro="The link may be out of date, or the page may have moved. Everything below is still where it should be."
          />

          <div className="mt-14 grid gap-px border border-navy-950/10 bg-navy-950/10 sm:grid-cols-2">
            {ROUTES.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="group flex flex-col justify-between bg-white p-7 transition-colors hover:bg-teal-brand/[0.04]"
              >
                <div>
                  <div className="font-display text-xl font-medium tracking-normal text-navy-950 transition-colors group-hover:text-teal-brand">
                    {r.label}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.blurb}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
                  Go
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>

          <Link
            to="/"
            style={{ clipPath: chamferClip(14) }}
            className="mt-10 inline-flex items-center bg-blue-brand px-8 py-4 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
