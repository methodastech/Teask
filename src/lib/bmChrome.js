/* ── BM chrome · ported from the post-build layer (10 Aug 2026) ──────────────
 *
 * Two behaviours that lived as inline <script> tags in the deployed index.html,
 * moved here so they ship from source. Neither touches React state: both work
 * by toggling classes that bm-overrides.css styles, which is why they can sit
 * outside the component tree without fighting it.
 *
 *   1. Nav       — hides on scroll down, returns on scroll up, and goes
 *                  transparent over the hero.
 *   2. Motion    — reveals headings and grid children as they enter view.
 *
 * Kept as plain DOM code rather than rewritten into components on purpose: it
 * has to apply to every section on every page, including ones rendered by
 * components that know nothing about it.
 */

/* ── 1. nav ────────────────────────────────────────────────────────────────
 * bm-nav-top marks "still over the hero", bm-nav-hidden pulls the bar away.
 * The 6px deadband stops trackpad jitter from flickering it.
 */
function nav() {
  let last = 0
  const apply = () => {
    const h = document.querySelector('header.fixed')
    if (!h) return
    const y = window.scrollY
    h.classList.toggle('bm-nav-top', y < 60)
    if (y < 90) h.classList.remove('bm-nav-hidden')
    else if (y > last + 6) h.classList.add('bm-nav-hidden')
    else if (y < last - 6) h.classList.remove('bm-nav-hidden')
    last = y
  }
  addEventListener('scroll', apply, { passive: true })
  /* the header mounts with React, not with the document — poll briefly so the
     first paint is right even if that happens after this runs */
  const t0 = setInterval(apply, 700)
  setTimeout(() => clearInterval(t0), 8000)
  apply()
}

/* ── 2. scroll reveal ──────────────────────────────────────────────────────
 * Tags headings and grid children with [data-mo], then adds .mo-in as they
 * come into view. Anything already on screen at tag time is skipped entirely,
 * so nothing above the fold has to wait to appear.
 */
function motion() {
  if (!('IntersectionObserver' in window)) return

  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('mo-in')
          io.unobserve(e.target)
        }
      }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )

  const seen = (el) => {
    const r = el.getBoundingClientRect()
    return r.top < innerHeight && r.bottom > 0
  }

  function tag() {
    const secs = document.querySelectorAll('section')
    /* from 1: the hero is its own animation and must not be faded in */
    for (let si = 1; si < secs.length; si++) {
      const sec = secs[si]
      sec.querySelectorAll(':scope h1, :scope h2, :scope h3').forEach((el) => {
        if (el.hasAttribute('data-mo') || el.closest('[data-mo]') || seen(el)) return
        el.setAttribute('data-mo', '')
        io.observe(el)
      })
      sec
        .querySelectorAll("[class*='grid'] > div, [class*='grid'] > a, [class*='grid'] > article")
        .forEach((el, i) => {
          if (el.hasAttribute('data-mo') || el.closest('[data-mo]') || seen(el)) return
          el.setAttribute('data-mo', '')
          /* stagger, capped so a long row does not trail badly at the end */
          el.style.setProperty('--mo-d', Math.min(i % 8, 6) * 70 + 'ms')
          io.observe(el)
          const cls = el.className || ''
          if (/rounded/.test(cls) || el.querySelector(":scope > [class*='rounded']")) {
            el.setAttribute('data-mo-card', '')
          }
        })
    }
    document.documentElement.classList.add('mo-init')
  }

  /* Belt and braces: an IntersectionObserver can starve in a background tab or
     an odd embed, which would leave content stuck at opacity 0 — the one
     failure here that loses information rather than polish. This sweep reveals
     anything already in view and costs nothing once everything is shown. */
  function sweep() {
    const left = document.querySelectorAll('[data-mo]:not(.mo-in)')
    if (!left.length) return
    left.forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.top < innerHeight * 0.92 && r.bottom > 0) el.classList.add('mo-in')
    })
  }
  addEventListener('scroll', sweep, { passive: true })
  setInterval(sweep, 700)

  /* re-tag as React renders and as routes change */
  let t
  const mo = new MutationObserver(() => {
    clearTimeout(t)
    t = setTimeout(tag, 350)
  })
  const start = () => {
    tag()
    mo.observe(document.body, { childList: true, subtree: true })
  }
  setTimeout(start, 600)
}

function boot() {
  nav()
  motion()
}

document.readyState === 'loading'
  ? addEventListener('DOMContentLoaded', boot)
  : boot()
