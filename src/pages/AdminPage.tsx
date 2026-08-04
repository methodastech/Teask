import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Newspaper,
  LogOut,
  PenSquare,
  Search,
  Trash2,
} from 'lucide-react'
import Logo from '../components/Logo'
import PostEditor, { emptyDoc, type EditorDoc } from '../components/admin/PostEditor'
import { useAuth } from '../lib/auth'
import { deleteCmsPost, estimateReadMinutes, loadCmsPosts, saveCmsPost, slugify } from '../lib/cms'
import type { Post } from '../lib/posts'
import { usePageMeta } from '../lib/seo'

/**
 * The content studio, built to the house workspace pattern: a fixed light rail
 * on the left carrying the logo, a search field and numbered destinations, with
 * the working area on a warm paper ground beside it.
 *
 * The studio publishes two kinds of item — evergreen articles and dated news —
 * so the rail carries a destination for each plus the editor. Both kinds share
 * one store and one editor; only the 'kind' flag and the listing differ.
 */

const DEFAULT_COVER = '/images/photos/l1960350.jpg'
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // 2 MB, keeps us inside the browser storage budget

type View = 'overview' | 'posts' | 'news' | 'new'

export default function AdminPage() {
  const { user, logout } = useAuth()
  usePageMeta({
    title: 'Content Studio · Teask',
    description: 'Publish and manage Teask articles.',
    path: '/admin',
  })

  const [posts, setPosts] = useState<Post[]>(() => loadCmsPosts())
  // the studio lists the two kinds separately, so split once here
  const articles = useMemo(() => posts.filter((p) => (p.kind ?? 'article') === 'article'), [posts])
  const news = useMemo(() => posts.filter((p) => p.kind === 'news'), [posts])
  const [view, setView] = useState<View>('overview')
  const [railOpen, setRailOpen] = useState(true)
  const [query, setQuery] = useState('')

  const [doc, setDoc] = useState<EditorDoc>(emptyDoc)
  const [flash, setFlash] = useState('')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  )

  // search runs inside the destination you are on, so a query on the News page
  // never returns articles
  const inView = view === 'news' ? news : articles
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inView
    return inView.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [posts, query])

  if (!user) return <Navigate to="/" replace />

  const reset = () => setDoc(emptyDoc())

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFlash('That file is not an image.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFlash('Image is larger than 2 MB. Pick a smaller file or paste a URL instead.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDoc((d) => ({ ...d, cover: String(reader.result) }))
      setFlash('')
    }
    reader.readAsDataURL(file)
  }

  const readMinutes = estimateReadMinutes(doc.blocks.map((b) => b.text).join(' '))

  const publish = () => {
    const slugBase = slugify(doc.title)
    const slug = loadCmsPosts().some((p) => p.slug === slugBase)
      ? `${slugBase}-${Date.now().toString(36).slice(-4)}`
      : slugBase
    const paragraphs = doc.blocks.map((b) => b.text.trim()).filter(Boolean)
    const post: Post = {
      kind: doc.kind,
      slug,
      title: doc.title.trim(),
      description: doc.description.trim(),
      category: doc.category.trim() || (doc.kind === 'news' ? 'News' : 'Insights'),
      date: today,
      readMinutes,
      cover: doc.cover.trim() || DEFAULT_COVER,
      coverAlt: doc.title.trim(),
      keywords: [],
      sections: [{ paragraphs: paragraphs.length ? paragraphs : [doc.description.trim()] }],
    }
    try {
      saveCmsPost(post)
    } catch {
      setFlash('Could not save. Browser storage is full. Try a smaller cover image.')
      return
    }
    setPosts(loadCmsPosts())
    reset()
    setFlash(`Published “${post.title}”. It is now live on the Resources page.`)
    setView(doc.kind === 'news' ? 'news' : 'posts')
  }

  const remove = (slug: string) => {
    deleteCmsPost(slug)
    setPosts(loadCmsPosts())
  }

  const NAV: { id: View; n: string; label: string; icon: typeof FileText; count?: number }[] = [
    { id: 'overview', n: '01', label: 'Overview', icon: LayoutGrid },
    { id: 'posts', n: '02', label: 'Articles', icon: FileText, count: articles.length },
    { id: 'news', n: '03', label: 'News', icon: Newspaper, count: news.length },
    { id: 'new', n: '04', label: 'Write new', icon: PenSquare },
  ]

  return (
    <div className="flex min-h-screen bg-[#EFEFEA] pt-16 md:pt-20">
      {/* ── the rail ────────────────────────────────────────────── */}
      <aside
        className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-navy-950/10 bg-gradient-to-b from-white to-[#FAFAF6] transition-[width] duration-300 md:top-20 md:flex md:h-[calc(100vh-5rem)] ${
          railOpen ? 'w-[286px]' : 'w-[76px]'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          {railOpen && <Logo height={26} />}
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            aria-label={railOpen ? 'Collapse menu' : 'Expand menu'}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-navy-950/10 bg-white text-gray-500 transition-colors hover:text-navy-950"
          >
            {railOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>

        {railOpen && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-navy-950/10 bg-white px-3 py-2.5">
              <Search size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (e.target.value) setView('posts')
                }}
                placeholder="Search articles"
                className="w-full bg-transparent text-[13px] text-navy-950 placeholder:text-gray-400 outline-none"
              />
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const active = view === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                title={railOpen ? undefined : item.label}
                className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-blue-brand/[0.10] text-blue-brand'
                    : 'text-gray-600 hover:bg-navy-950/[0.04] hover:text-navy-950'
                } ${railOpen ? '' : 'justify-center px-0'}`}
              >
                {railOpen && (
                  <span className="w-5 shrink-0 font-mono text-[10px] tracking-[0.1em] text-gray-400">
                    {item.n}
                  </span>
                )}
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                    active
                      ? 'border-blue-brand/25 bg-blue-brand/[0.12] text-blue-brand'
                      : 'border-navy-950/10 bg-white text-gray-500 group-hover:text-navy-950'
                  }`}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                </span>
                {railOpen && (
                  <>
                    <span className="flex-1 truncate text-[13.5px] font-medium">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="rounded-md bg-navy-950/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                        {item.count}
                      </span>
                    )}
                    <ChevronRight size={13} className="shrink-0 text-gray-300" aria-hidden="true" />
                  </>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-navy-950/10 px-5 py-4">
          {railOpen && (
            <p className="font-mono text-[8.5px] leading-relaxed tracking-[0.1em] text-gray-400 uppercase">
              Demo studio. Articles are saved in this browser only, no backend yet.
            </p>
          )}
          <button
            type="button"
            onClick={logout}
            className={`mt-3 flex cursor-pointer items-center gap-2 text-[12px] font-medium text-gray-500 transition-colors hover:text-navy-950 ${
              railOpen ? '' : 'justify-center'
            }`}
          >
            <LogOut size={14} aria-hidden="true" />
            {railOpen && 'Log out'}
          </button>
        </div>
      </aside>

      {/* ── the working area ────────────────────────────────────── */}
      <main className="min-w-0 flex-1 px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                Content studio
              </span>
              <h1 className="mt-2 font-display text-4xl font-light tracking-normal text-navy-950 md:text-5xl">
                Welcome, {user.name}.
              </h1>
            </div>
            <span className="font-mono text-[11px] text-gray-500">{dateLabel}</span>
          </header>

          {flash && (
            <p className="mt-6 border-l-2 border-teal-brand bg-white px-4 py-3 text-sm text-navy-950">
              {flash}
            </p>
          )}

          {view === 'overview' && (
            <Overview posts={posts} onWrite={() => setView('new')} onBrowse={() => setView('posts')} />
          )}

          {view === 'posts' && (
            <Library
              posts={filtered}
              total={articles.length}
              query={query}
              onRemove={remove}
              onWrite={() => {
                setDoc((d) => ({ ...d, kind: 'article' }))
                setView('new')
              }}
              kind="article"
            />
          )}

          {view === 'news' && (
            <Library
              posts={filtered}
              total={news.length}
              query={query}
              onRemove={remove}
              onWrite={() => {
                setDoc((d) => ({ ...d, kind: 'news' }))
                setView('new')
              }}
              kind="news"
            />
          )}

          {view === 'new' && (
            <PostEditor
              doc={doc}
              setDoc={setDoc}
              onPublish={publish}
              onExit={() => setView(doc.kind === 'news' ? 'news' : 'posts')}
              readMinutes={readMinutes}
              onPickImage={onPickImage}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function Stat({ n, label, sub }: { n: number | string; label: string; sub: string }) {
  return (
    <div className="rounded-xl border border-navy-950/[0.08] bg-white p-6">
      <div className="font-display text-4xl font-light tracking-normal text-navy-950">{n}</div>
      <div className="mt-3 text-sm font-semibold text-navy-950">{label}</div>
      <div className="mt-0.5 text-xs text-gray-500">{sub}</div>
    </div>
  )
}

function Overview({ posts, onWrite, onBrowse }: { posts: Post[]; onWrite: () => void; onBrowse: () => void }) {
  const categories = new Set(posts.map((p) => p.category)).size
  const minutes = posts.reduce((a, p) => a + p.readMinutes, 0)
  return (
    <>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat n={posts.length} label="Articles" sub="published from this studio" />
        <Stat n={categories} label="Categories" sub="in use across the library" />
        <Stat n={minutes} label="Minutes" sub="of reading published" />
      </div>

      <div className="mt-12 flex items-center gap-4">
        <h2 className="font-display text-2xl font-medium tracking-normal text-navy-950">Quick actions</h2>
        <span className="h-px flex-1 bg-navy-950/10" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button type="button" onClick={onWrite} className="group cursor-pointer rounded-xl border border-navy-950/[0.08] bg-white p-7 text-left transition-colors hover:border-teal-brand/40">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-blue-brand/25 bg-blue-brand/[0.12] text-blue-brand">
            <PenSquare size={16} strokeWidth={1.75} />
          </span>
          <h3 className="mt-5 font-display text-xl font-medium tracking-normal text-navy-950">Write a new article</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Publishes straight to the top of the Resources page with its own URL.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
            Start <ArrowUpRight size={12} />
          </span>
        </button>

        <button type="button" onClick={onBrowse} className="group cursor-pointer rounded-xl border border-navy-950/[0.08] bg-white p-7 text-left transition-colors hover:border-teal-brand/40">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-navy-950/10 bg-paper text-gray-500">
            <FileText size={16} strokeWidth={1.75} />
          </span>
          <h3 className="mt-5 font-display text-xl font-medium tracking-normal text-navy-950">Manage the library</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Review what is live, open an article on the site, or remove one.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
            Open <ArrowUpRight size={12} />
          </span>
        </button>
      </div>
    </>
  )
}

function Library({
  posts,
  total,
  query,
  onRemove,
  onWrite,
  kind = 'article',
}: {
  posts: Post[]
  total: number
  query: string
  kind?: 'article' | 'news'
  onRemove: (slug: string) => void
  onWrite: () => void
}) {
  const noun = kind === 'news' ? 'News' : 'Articles'
  const one = kind === 'news' ? 'news item' : 'article'
  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-medium tracking-normal text-navy-950">
          {noun}{' '}
          <span className="font-mono text-sm text-gray-500">
            {query ? `${posts.length} of ${total}` : total}
          </span>
        </h2>
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 border border-navy-950/10 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-navy-950 uppercase transition-colors hover:border-teal-brand/50 hover:text-teal-brand"
        >
          View resources <ArrowUpRight size={13} />
        </Link>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-navy-950/15 bg-white/60 p-10 text-center">
          <p className="text-sm text-gray-600">
            Nothing published yet. Each {one} you publish here appears on the Resources page and
            gets its own page.
          </p>
          <button type="button" onClick={onWrite} className="mt-5 cursor-pointer bg-blue-brand px-6 py-3 text-xs font-semibold tracking-[0.15em] text-white uppercase transition-colors hover:bg-teal-brand">
            Write the first one
          </button>
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-600">No {one}s match that search.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {posts.map((p) => (
            <li key={p.slug} className="flex items-center gap-5 rounded-xl border border-navy-950/[0.08] bg-white p-4">
              <img src={p.cover} alt="" className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
                  {p.category} · {p.readMinutes} min · {p.date}
                </div>
                <h3 className="mt-1.5 truncate text-base font-bold text-navy-950">{p.title}</h3>
                <p className="mt-1 truncate text-sm text-gray-600">{p.description}</p>
              </div>
              <Link
                to={`/resources/${p.slug}`}
                className="hidden shrink-0 items-center gap-1 text-xs font-semibold tracking-wide text-teal-brand uppercase hover:text-blue-brand sm:inline-flex"
              >
                View <ArrowUpRight size={12} />
              </Link>
              <button
                type="button"
                onClick={() => onRemove(p.slug)}
                aria-label={`Delete ${p.title}`}
                className="shrink-0 cursor-pointer text-gray-400 transition-colors hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
