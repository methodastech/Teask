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
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import Logo from '../components/Logo'
import PostEditor, {
  docFromPost,
  emptyDoc,
  sectionsFromBlocks,
  type EditorDoc,
} from '../components/admin/PostEditor'
import { useAuth } from '../lib/auth'
import { estimateReadMinutes, removePost, savePost, slugify, uploadCover, usingDatabase } from '../lib/cms'
import { kindOf, type Post, type PostKind } from '../lib/posts'
import { usePosts } from '../lib/postsStore'
import { plainText } from '../lib/richText'
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
// only applies without a server, where the cover has to fit in localStorage
const MAX_LOCAL_UPLOAD_BYTES = 2 * 1024 * 1024

/**
 * The rail has three destinations, and writing is not one of them.
 *
 * Articles and News are separate shelves, and the editor belongs to whichever
 * shelf the piece is on — so opening it keeps you inside that section rather
 * than moving you to a fourth place where both kinds are mixed together.
 */
type Section = 'overview' | 'articles' | 'news'

const messageFrom = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback

export default function AdminPage() {
  const { user, logout } = useAuth()
  usePageMeta({
    title: 'Content Studio · Teask',
    description: 'Publish and manage Teask articles.',
    path: '/admin',
  })

  // the studio reads the same library the public site does, so what is listed
  // here is exactly what a visitor would find on /resources
  const { posts, loading, error, reload } = usePosts()
  // the studio lists the two kinds separately, so split once here
  const articles = useMemo(() => posts.filter((p) => kindOf(p) === 'article'), [posts])
  const news = useMemo(() => posts.filter((p) => kindOf(p) === 'news'), [posts])
  const [section, setSection] = useState<Section>('overview')
  const [editing, setEditing] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [query, setQuery] = useState('')

  const [doc, setDoc] = useState<EditorDoc>(emptyDoc)
  const [flash, setFlash] = useState('')
  const [saving, setSaving] = useState(false)

  /**
   * While the editor is open the rail follows what is being written, not what
   * was last browsed. That keeps the highlight honest if the Article/News
   * toggle is used inside the editor — the piece moves shelf, and so does the
   * place the rail says you are.
   */
  const activeSection: Section = editing
    ? doc.kind === 'news'
      ? 'news'
      : 'articles'
    : section

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

  // search runs inside the section you are on, so a query on the News page
  // never returns articles
  const inView = activeSection === 'news' ? news : articles
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return inView
    return inView.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [inView, query])

  if (!user) return <Navigate to="/" replace />

  const reset = () => setDoc(emptyDoc())

  /**
   * One path for every image the studio takes, cover or in-body. With a server
   * this uploads and returns a URL; without one it becomes a data URL that only
   * works in this browser, which is why the size cap applies only then.
   */
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      setFlash('That file is not an image.')
      return null
    }
    if (!usingDatabase && file.size > MAX_LOCAL_UPLOAD_BYTES) {
      setFlash('Image is larger than 2 MB. Pick a smaller file or paste a URL instead.')
      return null
    }
    try {
      const url = await uploadCover(file)
      setFlash('')
      return url
    } catch (err) {
      setFlash(messageFrom(err, 'That image could not be uploaded.'))
      return null
    }
  }

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const cover = await uploadImage(file)
    if (cover) setDoc((d) => ({ ...d, cover }))
  }

  // alt text is not read by the reader, and ** markers are not words
  const readMinutes = estimateReadMinutes(
    plainText(
      doc.blocks
        .filter((b) => b.type !== 'image')
        .map((b) => b.text)
        .join(' '),
    ),
  )

  const publish = async () => {
    // editing keeps what the editor cannot express — the publication date and
    // the SEO keywords — so saving a seeded article does not strip them
    const original = doc.slug ? posts.find((p) => p.slug === doc.slug) : undefined
    const sections = sectionsFromBlocks(doc.blocks)
    const title = doc.title.trim()

    const post: Post = {
      kind: doc.kind,
      slug: doc.slug ?? slugify(title),
      title,
      description: doc.description.trim(),
      category: doc.category.trim() || (doc.kind === 'news' ? 'News' : 'Insights'),
      date: original?.date ?? today,
      readMinutes,
      cover: doc.cover.trim() || DEFAULT_COVER,
      coverAlt: original?.coverAlt || title,
      keywords: original?.keywords ?? [],
      // an article with nothing but a cover still needs a body; fall back to
      // the summary rather than publishing an empty page
      sections: sections.length ? sections : [{ paragraphs: [doc.description.trim()] }],
    }

    setSaving(true)
    try {
      const saved = await savePost(post, doc.slug)
      await reload()
      reset()
      setFlash(
        doc.slug
          ? `Saved changes to “${saved.title}”.`
          : `Published “${saved.title}”. It is now live on the Resources page.`,
      )
      // land on the shelf the piece went to, showing it in the list
      setSection(doc.kind === 'news' ? 'news' : 'articles')
      setEditing(false)
    } catch (err) {
      setFlash(
        messageFrom(
          err,
          usingDatabase
            ? 'Could not save. Check your connection and try again.'
            : 'Could not save. Browser storage is full. Try a smaller cover image.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  /** open the editor on an existing piece, under its own section */
  const edit = (post: Post) => {
    setDoc(docFromPost(post))
    setFlash('')
    setSection(kindOf(post) === 'news' ? 'news' : 'articles')
    setEditing(true)
  }

  /** open the editor on a blank piece of the given kind */
  const startNew = (kind: PostKind) => {
    setDoc({ ...emptyDoc(), kind })
    setFlash('')
    setSection(kind === 'news' ? 'news' : 'articles')
    setEditing(true)
  }

  /** leave the editor for the list of the section you were writing in */
  const closeEditor = () => {
    setSection(doc.kind === 'news' ? 'news' : 'articles')
    setEditing(false)
  }

  /**
   * The rail can now be used while the editor is open, and every destination
   * on it discards what is in the editor. Nothing is auto-saved, so ask first
   * — but only when there is actually something to lose.
   */
  const canLeaveEditor = () => {
    if (!editing) return true
    const written =
      doc.title.trim() !== '' ||
      doc.description.trim() !== '' ||
      doc.blocks.some((b) => b.text.trim() !== '')
    return !written || window.confirm('Leave this piece? Anything not published will be lost.')
  }

  const remove = async (post: Post) => {
    // deleting now writes to the database, and nothing here can undo it
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return
    try {
      await removePost(post.slug)
      await reload()
      setFlash(`Deleted “${post.title}”.`)
    } catch (err) {
      setFlash(messageFrom(err, 'Could not delete that article.'))
    }
  }

  const NAV: {
    id: Section
    n: string
    label: string
    icon: typeof FileText
    count?: number
    /** the shelf sections carry a list and a writer beneath them */
    kind?: PostKind
    newLabel?: string
    allLabel?: string
  }[] = [
    { id: 'overview', n: '01', label: 'Overview', icon: LayoutGrid },
    {
      id: 'articles',
      n: '02',
      label: 'Articles',
      icon: FileText,
      count: articles.length,
      kind: 'article',
      allLabel: 'All articles',
      newLabel: 'New article',
    },
    {
      id: 'news',
      n: '03',
      label: 'News',
      icon: Newspaper,
      count: news.length,
      kind: 'news',
      allLabel: 'All news',
      newLabel: 'New news entry',
    },
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
                  // searching means browsing: leave the editor, and leave
                  // Overview for a shelf that actually has results to show
                  if (e.target.value) {
                    setEditing(false)
                    if (activeSection === 'overview') setSection('articles')
                  }
                }}
                placeholder={activeSection === 'news' ? 'Search news' : 'Search articles'}
                className="w-full bg-transparent text-[13px] text-navy-950 placeholder:text-gray-400 outline-none"
              />
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const active = activeSection === item.id
            const Icon = item.icon
            // a shelf opens to show its list and its writer; Overview has neither
            const expanded = active && railOpen && item.kind !== undefined
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canLeaveEditor()) return
                    setSection(item.id)
                    setEditing(false)
                  }}
                  aria-current={active && !editing ? 'page' : undefined}
                  aria-expanded={item.kind ? active : undefined}
                  title={railOpen ? undefined : item.label}
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
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
                      <ChevronRight
                        size={13}
                        aria-hidden="true"
                        className={`shrink-0 text-gray-300 transition-transform ${
                          expanded ? 'rotate-90' : ''
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* the section's own destinations, hung off a rule so they read
                    as belonging to the shelf above rather than as siblings */}
                {expanded && (
                  <div className="mt-1 mb-1 ml-[2.35rem] flex flex-col gap-0.5 border-l border-navy-950/10 pl-3">
                    <SubItem
                      label={item.allLabel!}
                      active={!editing}
                      onClick={() => canLeaveEditor() && setEditing(false)}
                    />
                    {/* the same slot, told truthfully: reworking a published
                        piece is not the same destination as starting one */}
                    <SubItem
                      label={
                        editing && doc.slug
                          ? item.kind === 'news'
                            ? 'Editing news entry'
                            : 'Editing article'
                          : item.newLabel!
                      }
                      active={editing}
                      icon={editing && doc.slug ? Pencil : PenSquare}
                      onClick={() => {
                        if (editing && doc.slug) return // already here
                        if (canLeaveEditor()) startNew(item.kind!)
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-navy-950/10 px-5 py-4">
          {railOpen && (
            <p className="font-mono text-[8.5px] leading-relaxed tracking-[0.1em] text-gray-400 uppercase">
              {usingDatabase
                ? 'Connected to the content database. Everything you publish is live.'
                : 'Demo studio. Articles are saved in this browser only, no backend yet.'}
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

          {/* the library could not be fetched: say so plainly, because what is
              listed below is then stale or empty rather than wrong */}
          {error && (
            <p className="mt-6 border-l-2 border-red-400 bg-white px-4 py-3 text-sm text-navy-950">
              {error}{' '}
              <button
                type="button"
                onClick={() => void reload()}
                className="cursor-pointer font-semibold text-teal-brand underline underline-offset-2"
              >
                Try again
              </button>
            </p>
          )}

          {loading ? (
            <p className="mt-10 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
              Loading the library…
            </p>
          ) : (
            <>
              {editing ? (
                <PostEditor
                  doc={doc}
                  setDoc={setDoc}
                  onPublish={() => void publish()}
                  onExit={closeEditor}
                  readMinutes={readMinutes}
                  onPickImage={onPickImage}
                  uploadImage={uploadImage}
                  saving={saving}
                />
              ) : activeSection === 'overview' ? (
                <Overview
                  posts={posts}
                  onWrite={() => startNew('article')}
                  onBrowse={() => setSection('articles')}
                />
              ) : (
                <Library
                  posts={filtered}
                  total={activeSection === 'news' ? news.length : articles.length}
                  query={query}
                  onRemove={remove}
                  onEdit={edit}
                  onWrite={() => startNew(activeSection === 'news' ? 'news' : 'article')}
                  kind={activeSection === 'news' ? 'news' : 'article'}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

/** a destination inside a rail section: the list, or the writer */
function SubItem({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: typeof PenSquare | typeof Pencil
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
        active
          ? 'font-semibold text-blue-brand'
          : 'text-gray-500 hover:bg-navy-950/[0.04] hover:text-navy-950'
      }`}
    >
      {Icon && <Icon size={12} strokeWidth={1.75} aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </button>
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
        <Stat n={posts.length} label="Articles" sub="live on the Resources page" />
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
  onEdit,
  onWrite,
  kind = 'article',
}: {
  posts: Post[]
  total: number
  query: string
  kind?: 'article' | 'news'
  onRemove: (post: Post) => void
  onEdit: (post: Post) => void
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
        {/* Writing is the reason to be on this screen, so the action sits here
            rather than only in the rail — and it has to be present once the
            library has something in it, which is when the empty state's own
            button disappears. */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 border border-navy-950/10 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-navy-950 uppercase transition-colors hover:border-teal-brand/50 hover:text-teal-brand"
          >
            View resources <ArrowUpRight size={13} />
          </Link>
          <button
            type="button"
            onClick={onWrite}
            className="inline-flex cursor-pointer items-center gap-1.5 bg-blue-brand px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-teal-brand"
          >
            <PenSquare size={13} aria-hidden="true" />
            New {kind === 'news' ? 'news entry' : 'article'}
          </button>
        </div>
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
                onClick={() => onEdit(p)}
                aria-label={`Edit ${p.title}`}
                className="shrink-0 cursor-pointer text-gray-400 transition-colors hover:text-teal-brand"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(p)}
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
