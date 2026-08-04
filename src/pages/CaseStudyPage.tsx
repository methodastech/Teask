import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin } from 'lucide-react'
import { EASE } from '../components/site/Section'
import { chamferClip } from '../components/ChamferBorder'
import { getCaseStudy } from '../lib/caseStudies'
import { usePageMeta, SITE_URL } from '../lib/seo'

/**
 * A deployment, written up as before → intervention → outcome.
 *
 * Blocks whose data is still pending (metrics, client quote) render nothing at
 * all rather than showing placeholder numbers, so the page is always honest
 * about what Teask can actually evidence today.
 */
export default function CaseStudyPage() {
  const { slug = '' } = useParams()
  const study = getCaseStudy(slug)

  usePageMeta({
    title: study ? `${study.client} · Deployment Case Study · Teask` : 'Case study · Teask',
    description: study?.summary ?? 'Teask deployment case study.',
    path: `/projects/${slug}`,
    ogType: 'article',
    ogImage: study?.hero.image,
    jsonLd: study
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${study.client} · Teask deployment`,
          description: study.summary,
          image: study.hero.image,
          author: { '@type': 'Organization', name: 'Teask' },
          publisher: { '@type': 'Organization', name: 'Teask' },
          mainEntityOfPage: `${SITE_URL}/projects/${slug}`,
        }
      : undefined,
  })

  if (!study) return <Navigate to="/" replace />

  const Section = ({ heading, body }: { heading: string; body: string[] }) => (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
      className="mt-16 max-w-3xl"
    >
      <h2 className="font-display text-2xl font-medium tracking-normal text-navy-950 md:text-3xl">
        {heading}
      </h2>
      {body.map((p) => (
        <p key={p.slice(0, 32)} className="mt-4 text-base leading-relaxed text-gray-600">
          {p}
        </p>
      ))}
    </motion.section>
  )

  return (
    <main className="pt-16 md:pt-20">
      <article className="relative w-full bg-paper pb-24 md:pb-32">
        <div className="shell pt-14 md:pt-20">
          <Link
            to="/#projects"
            className="-my-3 inline-flex min-h-11 items-center py-3 font-mono text-[10px] tracking-[0.25em] text-gray-500 uppercase transition-colors hover:text-teal-brand"
          >
            ← Deployments
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
              <MapPin size={12} aria-hidden="true" />
              {study.location}
            </span>
            {study.badge && (
              <span className="border border-teal-brand/30 px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-teal-brand uppercase">
                {study.badge}
              </span>
            )}
          </div>

          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.05] font-light tracking-normal text-navy-950 md:text-6xl">
            {study.client}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">{study.summary}</p>

          <div className="mt-10 overflow-hidden border border-navy-950/10">
            <img
              src={study.hero.image}
              alt={study.hero.alt}
              className="aspect-[16/9] w-full object-cover"
              loading="eager"
            />
          </div>

          {/* headline numbers, only once there are real ones */}
          {study.metrics.length > 0 && (
            <dl className="mt-12 grid gap-8 border-y border-navy-950/10 py-10 sm:grid-cols-3">
              {study.metrics.map((m) => (
                <div key={m.label}>
                  <dt className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                    {m.label}
                  </dt>
                  <dd className="mt-2 font-display text-4xl font-light text-teal-brand">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Section {...study.challenge} />
          <Section {...study.solution} />
          <Section {...study.outcome} />

          {study.quote && (
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mt-16 max-w-3xl border-l-2 border-teal-brand pl-6"
            >
              <blockquote className="font-display text-xl leading-relaxed font-light text-navy-950 md:text-2xl">
                “{study.quote.text}”
              </blockquote>
              <figcaption className="mt-4 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                {study.quote.name} · {study.quote.role}
              </figcaption>
            </motion.figure>
          )}

          <div className="mt-16 flex flex-col items-start gap-4 border-t border-navy-950/10 pt-10 sm:flex-row sm:items-center">
            <p className="max-w-md text-sm leading-relaxed text-gray-600">
              Running a mall, a campus or a fleet with the same problem? Tell us the site and we
              will map the fit.
            </p>
            <Link
              to="/contact"
              style={{ clipPath: chamferClip(14) }}
              className="group inline-flex shrink-0 items-center bg-blue-brand px-7 py-3.5 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand"
            >
              Let&rsquo;s get started
              <ArrowRight
                size={16}
                className="ml-3 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
