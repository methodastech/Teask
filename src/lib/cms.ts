import type { Post } from './posts'

/**
 * Demo CMS store. Posts published from the admin studio are kept in the
 * browser's localStorage (there is no backend yet), then merged ahead of the
 * built-in articles wherever the site lists or looks up posts. Clearing site
 * data resets them — this is a prototype, not production persistence.
 */

const CMS_KEY = 'teask_cms_posts'

export function loadCmsPosts(): Post[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CMS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? (arr as Post[]) : []
  } catch {
    return []
  }
}

function persist(posts: Post[]) {
  window.localStorage.setItem(CMS_KEY, JSON.stringify(posts))
}

export function saveCmsPost(post: Post) {
  const rest = loadCmsPosts().filter((p) => p.slug !== post.slug)
  persist([post, ...rest])
}

export function deleteCmsPost(slug: string) {
  persist(loadCmsPosts().filter((p) => p.slug !== slug))
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (base || 'post').slice(0, 60)
}

export function estimateReadMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
