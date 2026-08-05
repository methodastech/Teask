import { useEffect } from 'react'

/**
 * Per-page SEO: title, meta description, canonical, Open Graph and JSON-LD,
 * applied on mount, per the audit's fix list (no title / no meta / no OG /
 * no schema on the old site). Canonical base is the production domain.
 */

export const SITE_URL = 'https://teask.asia'
export const SITE_NAME = 'Teask · Tenaga Alam Sekitar Kita'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/photos/l1960350.jpg`

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', url)
}

export function usePageMeta(opts: {
  title: string
  description: string
  /** path beginning with '/', e.g. '/solutions' */
  path: string
  ogImage?: string
  ogType?: 'website' | 'article'
  /** page-scoped JSON-LD (replaced on navigation) */
  jsonLd?: object | object[]
}) {
  /**
   * Compared as a string, not by identity: the caller rebuilds this object on
   * every render, and its contents now arrive asynchronously — the Resources
   * page lists articles fetched from the API. Depending on identity would run
   * the effect constantly; leaving it out of the deps, as this once did, would
   * publish the empty list captured on mount and never correct it.
   */
  const jsonLd = opts.jsonLd ? JSON.stringify(opts.jsonLd) : ''

  useEffect(() => {
    const url = `${SITE_URL}${opts.path === '/' ? '' : opts.path}`
    document.title = opts.title
    setMeta('name', 'description', opts.description)
    setCanonical(url)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', opts.title)
    setMeta('property', 'og:description', opts.description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:type', opts.ogType ?? 'website')
    setMeta('property', 'og:image', opts.ogImage ?? DEFAULT_OG_IMAGE)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', opts.title)
    setMeta('name', 'twitter:description', opts.description)
    setMeta('name', 'twitter:image', opts.ogImage ?? DEFAULT_OG_IMAGE)

    let script = document.getElementById('page-jsonld') as HTMLScriptElement | null
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = 'page-jsonld'
        document.head.appendChild(script)
      }
      script.textContent = jsonLd
    } else if (script) {
      script.remove()
    }
  }, [opts.title, opts.description, opts.path, opts.ogImage, opts.ogType, jsonLd]) // eslint-disable-line react-hooks/exhaustive-deps
}
