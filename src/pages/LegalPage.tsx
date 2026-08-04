import { Link, Navigate, useParams } from 'react-router-dom'
import { getLegalDoc, LEGAL_DOCS, type LegalDoc } from '../lib/legal'
import { usePageMeta } from '../lib/seo'
import { SectionHeading } from '../components/site/Section'

/**
 * /legal/:slug, the three client legal documents reproduced from teask.asia.
 * One renderer for all three so the wording stays in lib/legal.ts and the
 * layout never diverges between them.
 */

function Doc({ doc }: { doc: LegalDoc }) {
  usePageMeta({
    title: `${doc.title} · Teask`,
    description: doc.description,
    path: `/legal/${doc.slug}`,
  })

  const others = LEGAL_DOCS.filter((d) => d.slug !== doc.slug)

  return (
    <main className="pt-16 md:pt-20">
      <section className="relative w-full bg-white py-16 md:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionHeading as="h1" eyebrow="Legal" title={doc.title} intro={doc.description} />

          <div className="mt-12">
            {doc.blocks.map((b, i) => {
              switch (b.kind) {
                case 'h2':
                  return (
                    <h2
                      key={i}
                      className="mt-14 border-t border-navy-950/10 pt-10 font-display text-2xl font-medium tracking-normal text-navy-950 md:text-3xl"
                    >
                      {b.text}
                    </h2>
                  )
                case 'h3':
                  return (
                    <h3 key={i} className="mt-8 text-base font-bold text-navy-950">
                      {b.text}
                    </h3>
                  )
                case 'ul':
                  return (
                    <ul key={i} className="mt-3 space-y-2">
                      {b.items.map((it) => (
                        <li key={it} className="flex gap-3 text-sm leading-relaxed text-gray-600">
                          <span
                            className="mt-[0.55em] h-1 w-1 shrink-0 rotate-45 bg-teal-brand"
                            aria-hidden="true"
                          />
                          {it}
                        </li>
                      ))}
                    </ul>
                  )
                case 'dl':
                  return (
                    <dl key={i} className="mt-5 space-y-3">
                      {b.rows.map(([k, v]) => (
                        <div
                          key={k}
                          className="flex flex-col gap-1 border-b border-navy-950/5 pb-3 sm:flex-row sm:justify-between sm:gap-8"
                        >
                          <dt className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                            {k}
                          </dt>
                          <dd className="text-sm font-semibold text-navy-950 sm:text-right">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )
                default:
                  return (
                    <p key={i} className="mt-4 text-sm leading-relaxed text-gray-600 md:text-base">
                      {b.text}
                    </p>
                  )
              }
            })}
          </div>

          {/* the other two documents */}
          <div className="mt-16 border-t border-navy-950/10 pt-8">
            <span className="font-mono text-[11px] tracking-[0.3em] text-teal-brand uppercase">
              Also read
            </span>
            <div className="mt-4 flex flex-wrap gap-3">
              {others.map((d) => (
                <Link
                  key={d.slug}
                  to={`/legal/${d.slug}`}
                  className="border border-navy-950/10 bg-paper px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-teal-brand/50 hover:text-navy-950"
                >
                  {d.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>()
  const doc = slug ? getLegalDoc(slug) : undefined
  if (!doc) return <Navigate to="/" replace />
  return <Doc doc={doc} />
}
