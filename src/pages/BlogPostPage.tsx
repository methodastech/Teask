import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react'
import { getPost } from '../lib/posts'
import { usePageMeta, SITE_URL } from '../lib/seo'
import { chamferClip } from '../components/ChamferBorder'
import BlogSidebar from '../components/site/BlogSidebar'

/** /resources/:slug, one article, marked up as an Article for search and AI. */

function PostBody({ slug }: { slug: string }) {
  const post = getPost(slug)!
  const date = new Date(post.date)

  usePageMeta({
    title: `${post.title} · Teask`,
    description: post.description,
    path: `/resources/${post.slug}`,
    ogImage: post.cover.startsWith('http') ? post.cover : `${SITE_URL}${post.cover}`,
    ogType: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        image: post.cover.startsWith('http') ? post.cover : `${SITE_URL}${post.cover}`,
        datePublished: post.date,
        author: { '@type': 'Organization', name: 'Teask', url: SITE_URL },
        publisher: { '@type': 'Organization', name: 'Teask, Tenaga Alam Sekitar Kita', url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/resources/${post.slug}`,
        keywords: post.keywords.join(', '),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Resources', item: `${SITE_URL}/resources` },
          { '@type': 'ListItem', position: 3, name: post.title },
        ],
      },
    ],
  })

  return (
    <main className="pt-16 md:pt-20">
      <article className="relative w-full bg-white py-16 md:py-24">
        {/* article + the right rail share one measure */}
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Link
            to="/resources"
            className="-my-3 inline-flex items-center gap-2 py-3 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-navy-950"
          >
            <ArrowLeft size={13} aria-hidden="true" /> All resources
          </Link>

          <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
            {/* ── the article ── */}
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.2em] text-teal-brand uppercase">
                <span>{post.category}</span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar size={12} aria-hidden="true" />
                  {date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Clock size={12} aria-hidden="true" />
                  {post.readMinutes} min read
                </span>
              </div>

              <h1 className="mt-4 font-display text-4xl leading-[1.05] font-light tracking-normal text-navy-950 md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-gray-600">{post.description}</p>

              <img
                src={post.cover}
                alt={post.coverAlt}
                className="mt-8 aspect-[16/8] w-full object-cover shadow-[0_1px_2px_rgba(16,24,40,0.05),0_16px_40px_rgba(16,24,40,0.10)]"
              />

              {post.sections.map((s, i) => (
                <section key={i} className={i > 0 ? 'mt-10' : 'mt-10'}>
                  {s.heading && (
                    <h2 className="font-display text-2xl font-medium tracking-normal text-navy-950 md:text-3xl">
                      {s.heading}
                    </h2>
                  )}
                  {s.paragraphs.map((p, j) => (
                    <p key={j} className="mt-5 text-base leading-relaxed text-gray-600">
                      {p}
                    </p>
                  ))}
                </section>
              ))}

              {/* article CTA */}
              <div className="mt-14 border border-navy-950/10 bg-paper p-8 md:p-10">
                <div className="font-mono text-[11px] tracking-[0.3em] text-teal-brand uppercase">
                  Scope a deployment
                </div>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600 md:text-base">
                  A mall, a campus, a fleet or a community, tell us the site and we will map the
                  fit. One conversation is enough.
                </p>
                <Link
                  to="/contact"
                  style={{ clipPath: chamferClip(12) }}
                  className="mt-6 inline-flex items-center bg-blue-brand px-7 py-3.5 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand"
                >
                  Contact
                  <ArrowRight size={15} className="ml-3" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* ── the right rail ── */}
            <BlogSidebar slug={post.slug} />
          </div>
        </div>
      </article>
    </main>
  )
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug || !getPost(slug)) return <Navigate to="/resources" replace />
  return <PostBody slug={slug} />
}
