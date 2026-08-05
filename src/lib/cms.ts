import {
  apiCreatePost,
  apiDeletePost,
  apiEnabled,
  apiListPosts,
  apiUpdatePost,
  apiUploadImage,
} from './api'
import { POSTS, type Post } from './posts'

/**
 * The content store, with two backends behind one set of functions.
 *
 * When VITE_API_URL is set, everything goes to MySQL through the PHP API and
 * what the client publishes is visible to every visitor. When it is not, the
 * old prototype behaviour applies: posts live in this browser's localStorage
 * and nobody else can see them.
 *
 * Both paths exist on purpose. The revamp has to keep running locally, and on
 * the current host, while the database is still being set up — and the switch
 * between them is one environment variable, not a code change.
 */

const CMS_KEY = 'teask_cms_posts'
/** slugs of built-in articles deleted in the browser-only mode */
const REMOVED_KEY = 'teask_cms_removed'

export const usingDatabase = apiEnabled

// ── browser-only fallback ──────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    const value = raw ? JSON.parse(raw) : null
    return Array.isArray(value) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

const loadLocal = () => readJson<Post[]>(CMS_KEY, [])
const loadRemoved = () => readJson<string[]>(REMOVED_KEY, [])

function persistLocal(posts: Post[]) {
  window.localStorage.setItem(CMS_KEY, JSON.stringify(posts))
}

/**
 * The built-in articles, minus the ones edited or deleted in this browser.
 *
 * Without a database these still have to behave like real content: an edited
 * one must not appear twice, and a deleted one must not come back on reload.
 * Once the API is on, the database holds all of this and none of it runs.
 */
function localLibrary(): Post[] {
  const local = loadLocal()
  const hidden = new Set([...local.map((p) => p.slug), ...loadRemoved()])
  return [...local, ...POSTS.filter((p) => !hidden.has(p.slug))]
}

// ── one interface over both ────────────────────────────────────────

/** The whole article library, from whichever backend is in use. */
export async function fetchPosts(): Promise<Post[]> {
  return apiEnabled ? apiListPosts() : localLibrary()
}

/**
 * Create or update. Pass `originalSlug` when editing, so a retitled article
 * keeps the address it was published under instead of silently moving and
 * breaking every link to it.
 */
export async function savePost(post: Post, originalSlug?: string): Promise<Post> {
  if (apiEnabled) {
    return originalSlug ? apiUpdatePost(originalSlug, post) : apiCreatePost(post)
  }

  const existing = loadLocal()
  const saved: Post = {
    ...post,
    // a built-in article being edited keeps its slug and gets a local copy
    // that shadows it; only a genuinely new one needs a free slug
    slug: originalSlug ?? uniqueLocalSlug(post.slug, localLibrary()),
  }
  persistLocal([saved, ...existing.filter((p) => p.slug !== saved.slug)])
  window.localStorage.setItem(
    REMOVED_KEY,
    JSON.stringify(loadRemoved().filter((s) => s !== saved.slug)),
  )
  return saved
}

export async function removePost(slug: string): Promise<void> {
  if (apiEnabled) {
    await apiDeletePost(slug)
    return
  }
  persistLocal(loadLocal().filter((p) => p.slug !== slug))
  // a built-in article is in the bundle, not in storage, so deleting it means
  // remembering that it was deleted
  const removed = loadRemoved()
  if (POSTS.some((p) => p.slug === slug) && !removed.includes(slug)) {
    window.localStorage.setItem(REMOVED_KEY, JSON.stringify([...removed, slug]))
  }
}

/**
 * A cover image, returned as something safe to store in `post.cover`.
 * With the API it becomes a URL on the server; without it, a data URL that
 * only works in this browser — which is why the fallback caps the file size.
 */
export function uploadCover(file: File): Promise<string> {
  if (apiEnabled) return apiUploadImage(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('That image could not be read.'))
    reader.readAsDataURL(file)
  })
}

// ── shared helpers ─────────────────────────────────────────────────

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (base || 'post').slice(0, 60)
}

/** the API does this server-side, where it can see every row */
function uniqueLocalSlug(base: string, existing: Post[]): string {
  if (!existing.some((p) => p.slug === base)) return base
  for (let n = 2; n < 200; n++) {
    const candidate = `${base.slice(0, 56)}-${n}`
    if (!existing.some((p) => p.slug === candidate)) return candidate
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`
}

export function estimateReadMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
