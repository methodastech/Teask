import type { Post } from './posts'

/**
 * Client for the PHP content API in /api.
 *
 * The browser cannot talk to MySQL directly — it has no driver, and shipping
 * database credentials to it would put them in front of anyone who opens
 * DevTools. So everything goes through the API, which is the only thing that
 * holds those credentials.
 *
 * If VITE_API_URL is not set, `apiEnabled` is false and the app runs on the
 * built-in articles instead. That is deliberate: the site has to keep working
 * locally, and on the current live host, before the database exists.
 */

const BASE = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const apiEnabled = BASE !== ''

/** the studio's bearer token; the API rejects writes without it */
const TOKEN_KEY = 'teask_api_token'

export const getToken = (): string | null => {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token: string) => window.localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  // FormData sets its own multipart boundary; naming a Content-Type breaks it
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    })
  } catch {
    // a DNS failure, a dead server or a CORS rejection all land here
    throw new ApiError('Could not reach the server. Check your connection.', 0)
  }

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // a PHP fatal error or an HTML error page from the host
    throw new ApiError('The server sent a response the site could not read.', res.status)
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`
    // an expired or revoked session should not keep being retried
    if (res.status === 401) clearToken()
    throw new ApiError(message, res.status)
  }

  return data as T
}

// ── content ────────────────────────────────────────────────────────

export const apiListPosts = () =>
  request<{ posts: Post[] }>('/posts').then((r) => r.posts)

export const apiCreatePost = (post: Post) =>
  request<{ post: Post }>('/posts', { method: 'POST', body: post }).then((r) => r.post)

export const apiUpdatePost = (slug: string, post: Post) =>
  request<{ post: Post }>(`/posts/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: post,
  }).then((r) => r.post)

export const apiDeletePost = (slug: string) =>
  request<{ ok: true }>(`/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })

export function apiUploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<{ url: string }>('/upload', { method: 'POST', form }).then((r) => r.url)
}

// ── sign in ────────────────────────────────────────────────────────

export type ApiUser = { email: string; name: string }

export const apiLogin = (email: string, password: string) =>
  request<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

export const apiLogout = () => request<{ ok: true }>('/auth/logout', { method: 'POST' })

export const apiMe = () => request<{ user: ApiUser }>('/auth/me').then((r) => r.user)
