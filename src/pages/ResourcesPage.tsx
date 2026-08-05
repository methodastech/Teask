import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { SectionHeading } from '../components/site/Section'
import TiltCard from '../components/site/TiltCard'
import { useArticles, useNews, usePosts } from '../lib/postsStore'
import { usePageMeta, SITE_URL } from '../lib/seo'

/**
 * /resources, the insights library (10 SEO articles across solar EV charging,
 * microgrids, rural power, distributed energy and AI energy). Feeds search and
 * AI visibility per the audit's fix list.
 */

export default function ResourcesPage() {
  // Resources carries two things now: the evergreen insights library, and the
  // newsroom. They share a shape but not a job — one is written to be found by
  // search months later, the other is dated and read once — so they get their
  // own bands rather than being interleaved in one feed.
  const { posts, loading } = usePosts()
  const articles = useArticles()
  const news = useNews()

  usePageMeta({
    title: 'Resources & Insights · Solar EV Charging, Microgrids & Distributed Energy · Teask',
    description:
      'Guides and insights on solar EV charging stations in Malaysia, portable EV chargers, solar microgrids, rural electrification and distributed energy infrastructure.',
    path: '/resources',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Teask Resources & Insights',
      url: `${SITE_URL}/resources`,
      publisher: { '@type': 'Organization', name: 'Teask, Tenaga Alam Sekitar Kita', url: SITE_URL },
      blogPost: posts.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${SITE_URL}/resources/${p.slug}`,
        datePublished: p.date,
      })),
    },
  })

  // Three rows of the phone's two-up grid, then the rest on request. Every post
  // stays in the DOM order it was rendered in, so "Load more" only ever appends
  // — it never reshuffles what the reader has already scanned.
  const BATCH = 6
  const [visible, setVisible] = useState(BATCH)
  const shown = articles.slice(0, visible)
  const remaining = articles.length - shown.length

  return (
    <main className="pt-16 md:pt-20">
      <section className="relative w-full bg-white py-16 md:py-32">
        <div className="shell">
          <SectionHeading
            as="h1"
            eyebrow="Resources"
            title={
              <>
                Insights on
                <br />
                <span className="text-teal-brand">distributed energy.</span>
              </>
            }
            intro="Solar EV charging, microgrids, rural power and the infrastructure behind them, written for the hosts, partners and builders deciding what comes next."
          />

          {/* Article grid. Phone runs two across: at ~162px there is room for the
              category line and a readable title, but not for the description or
              the CTA, so those stay hidden below md. The whole card is the link,
              so the target is large even though the type is small. */}
          <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {/* the library is fetched, so hold the grid's shape while it
                arrives rather than collapsing the page and pushing it back */}
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <div key={`skeleton-${i}`} className="animate-pulse border border-navy-950/[0.06]">
                  <div className="aspect-[16/9] w-full bg-navy-950/[0.06]" />
                  <div className="space-y-2 p-3 md:p-6">
                    <div className="h-2 w-1/3 bg-navy-950/[0.06]" />
                    <div className="h-3 w-full bg-navy-950/[0.08]" />
                    <div className="h-3 w-2/3 bg-navy-950/[0.08]" />
                  </div>
                </div>
              ))}

            {shown.map((p, i) => (
              <Link key={p.slug} to={`/resources/${p.slug}`} className="group block h-full">
                <TiltCard className="p-0" delay={Math.min(i * 0.05, 0.3)}>
                  <img
                    src={p.cover}
                    alt={p.coverAlt}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="p-3 md:p-6">
                    <div className="font-mono text-[10px] tracking-[0.14em] text-teal-brand uppercase md:tracking-[0.2em]">
                      {p.category} · {p.readMinutes} min
                    </div>
                    {/* break-words: at 320px the card is 135px wide and a word like
                        "Infrastructure" can still outrun the column */}
                    <h2 className="mt-1.5 line-clamp-4 hyphens-auto break-words text-[13px] leading-snug font-bold text-navy-950 group-hover:text-teal-brand md:mt-2 md:line-clamp-none md:text-base md:leading-normal">
                      {p.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 hidden text-sm leading-relaxed text-gray-600 md:block">
                      {p.description}
                    </p>
                    <span className="mt-5 hidden w-fit items-center gap-2 border border-teal-brand/40 px-4 py-2 text-[11px] font-semibold tracking-[0.15em] text-navy-950 uppercase transition-colors group-hover:border-teal-brand group-hover:bg-teal-brand group-hover:text-white md:inline-flex">
                      Read article <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                </TiltCard>
              </Link>
            ))}
          </div>

          {remaining > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + BATCH)}
                className="group inline-flex min-h-11 cursor-pointer items-center gap-2.5 border border-teal-brand/40 px-6 py-3 text-[11px] font-semibold tracking-[0.15em] text-navy-950 uppercase transition-colors hover:border-teal-brand hover:bg-teal-brand hover:text-white md:text-xs"
              >
                <Plus size={14} aria-hidden="true" />
                Load more
                <span className="font-mono text-[10px] text-gray-500 tabular-nums transition-colors group-hover:text-white/70">
                  {remaining}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── the newsroom ─────────────────────────────────────────────
          Dated items read as a chronological list, not a card grid: the date
          leads, the headline follows. The band only renders when there is
          something in it, so an empty newsroom never ships an empty heading. */}
      {news.length > 0 && (
        <section id="news" className="relative w-full bg-paper py-16 md:py-32">
          <div className="shell">
            <SectionHeading
              eyebrow="Newsroom"
              title={
                <>
                  Teask in
                  <br />
                  <span className="text-teal-brand">the news.</span>
                </>
              }
              intro="Announcements, awards, partnerships and coverage, newest first."
            />

            <ol className="mt-10 border-t border-navy-950/10">
              {news.map((n) => (
                <li key={n.slug}>
                  <Link
                    to={`/resources/${n.slug}`}
                    className="group grid gap-3 border-b border-navy-950/10 py-5 transition-colors hover:bg-white/60 sm:grid-cols-[10rem_11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-2"
                  >
                    <time
                      dateTime={n.date}
                      className="self-start font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase sm:self-center"
                    >
                      {new Date(n.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                    {/* a thumbnail per entry: the newsroom sat as an unbroken
                        run of type, and these are all photographed events */}
                    <img
                      src={n.cover}
                      alt=""
                      loading="lazy"
                      className="aspect-[16/10] w-full rounded-sm object-cover sm:w-44"
                    />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-navy-950 group-hover:text-teal-brand md:text-base">
                        {n.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {n.description}
                      </span>
                    </span>
                    <ArrowRight
                      size={15}
                      aria-hidden="true"
                      className="hidden shrink-0 text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-teal-brand sm:block"
                    />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </main>
  )
}
