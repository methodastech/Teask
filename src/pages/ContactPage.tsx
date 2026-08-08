import { useState, type FormEvent } from 'react'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { SectionHeading } from '../components/site/Section'
import { usePageMeta } from '../lib/seo'

/**
 * /contact — the enquiry form, its three purposes, and the direct channels.
 *
 * On delivery: the form posts to whatever endpoint `VITE_CONTACT_ENDPOINT`
 * names (a Formspree form URL is the quickest to stand up, but any endpoint
 * accepting a JSON POST works). Until that is configured it falls back to the
 * visitor's own mail client, so an enquiry is never silently swallowed — the
 * one outcome worse than an unfinished form is one that looks like it sent.
 * The confirmation copy tells the truth about which of the two happened.
 */

const FIELD =
  'w-full border border-navy-950/10 bg-navy-950/[0.04] px-4 py-3 text-sm text-navy-950 placeholder:text-gray-500 outline-none transition-colors focus:border-teal-brand/60'

const EMAIL = 'kiu@teask.asia'
/**
 * Where the form posts.
 *
 * The endpoint ships WITH the site — public/contact.php becomes
 * dist/contact.php — so in a production build it is always at this relative
 * path, on the same origin, whatever domain the site is served from. That makes
 * it a fact about the app rather than configuration, so it lives here instead of
 * in an env file that `.gitignore` would drop on the next clone.
 *
 * At the site ROOT, deliberately not under /api/. The content API deploys into
 * that folder and its .htaccess ends with `RewriteRule ^ index.php [QSA,L]`,
 * routing everything inside /api/ to its own front controller — which has no
 * contact route, so /api/contact.php would never execute. Keeping this one file
 * out of that folder means the two can never collide, wherever the content API
 * ends up living.
 *
 * Development deliberately gets nothing: the Vite dev server cannot execute PHP,
 * so posting there would only ever fail. Undefined sends the form down its
 * mail-client fallback instead, which works locally.
 *
 * VITE_CONTACT_ENDPOINT still overrides both, for pointing at Formspree or a
 * staging endpoint without touching code.
 */
const CONTACT_ENDPOINT =
  (import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined) ||
  (import.meta.env.PROD ? '/contact.php' : undefined)

/**
 * Why someone is writing. Asked up front because it changes what we need from
 * them and who picks the enquiry up — and because "come and see one" was a real
 * request from the client's side that the page previously had no room for.
 */
const PURPOSES = [
  {
    id: 'enquiry',
    label: 'General enquiry',
    blurb: 'Partnership, distribution, investment or anything else.',
    prompt: 'What would you like to talk about?',
  },
  {
    id: 'map-site',
    label: 'Map my site',
    blurb: 'Send us a location and we will come back on whether the T Station fits.',
    prompt: 'Where is the site, and what do you need it to do?',
  },
  {
    id: 'site-visit',
    label: 'Arrange a site visit',
    blurb: 'See a station in person, at our office or at a live installation.',
    prompt: 'Who would be visiting, and roughly when suits you?',
  },
] as const

type PurposeId = (typeof PURPOSES)[number]['id']
type Status = 'idle' | 'sending' | 'sent' | 'mail' | 'error'
const PHONE_DISPLAY = '019-212-1118'
const PHONE_TEL = '+60192121118'
// wa.me wants the number in full international form with no punctuation
const WHATSAPP = 'https://wa.me/60192121118'
const ADDRESS =
  'CoInnov8, Level 1, CoPlace 10 Block 2330, Jalan Usahawan Cyber 6, 63000 Cyberjaya, Selangor'

export default function ContactPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [purpose, setPurpose] = useState<PurposeId>('map-site')
  const active = PURPOSES.find((p) => p.id === purpose)!

  usePageMeta({
    title: 'Contact Teask · Get in Touch · Cyberjaya, Malaysia',
    description:
      "Get in touch with Teask. We're here to assist you. Talk to us about hosting, buying, partnering, distribution, investment or government programmes. Cyberjaya, Malaysia.",
    path: '/contact',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      mainEntity: {
        '@type': 'Organization',
        name: 'Teask',
        email: EMAIL,
        telephone: PHONE_TEL,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'CoInnov8, Level 1, CoPlace 10 Block 2330, Jalan Usahawan Cyber 6',
          postalCode: '63000',
          addressLocality: 'Cyberjaya',
          addressRegion: 'Selangor',
          addressCountry: 'MY',
        },
      },
    },
  })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const payload = {
      purpose: active.label,
      name: String(data.get('name') ?? ''),
      organisation: String(data.get('org') ?? ''),
      email: String(data.get('email') ?? ''),
      message: String(data.get('message') ?? ''),
      // the honeypot; empty for anyone who filled this in by hand. Sent rather
      // than checked here, because the check belongs where it cannot be skipped
      website: String(data.get('website') ?? ''),
    }

    if (CONTACT_ENDPOINT) {
      setStatus('sending')
      try {
        const res = await fetch(CONTACT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...payload, _subject: `${active.label} · ${payload.name}` }),
        })
        setStatus(res.ok ? 'sent' : 'error')
      } catch {
        setStatus('error')
      }
      return
    }

    // No endpoint configured yet: hand the enquiry to the visitor's mail client
    // rather than pretending it went somewhere.
    const body = [
      `Purpose: ${payload.purpose}`,
      `Name: ${payload.name}`,
      `Organisation: ${payload.organisation}`,
      `Email: ${payload.email}`,
      '',
      payload.message,
    ].join('\n')
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(
      `${active.label} · ${payload.name || 'Teask website'}`,
    )}&body=${encodeURIComponent(body)}`
    setStatus('mail')
  }

  const CHANNELS = [
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: PHONE_DISPLAY,
      href: WHATSAPP,
      note: 'Quickest route to a reply',
      external: true,
      accent: true,
    },
    {
      icon: Mail,
      label: 'Email',
      value: EMAIL,
      href: `mailto:${EMAIL}`,
      note: 'Best for detailed enquiries and documents',
    },
    {
      icon: Phone,
      label: 'Phone',
      value: PHONE_DISPLAY,
      href: `tel:${PHONE_TEL}`,
      note: 'Speak to us directly about a site',
    },
    {
      icon: MapPin,
      label: 'Office',
      value: 'CoInnov8, Cyberjaya',
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`,
      note: ADDRESS,
      external: true,
    },
  ]

  return (
    <main className="pt-16 md:pt-20">
      <section id="contact" className="relative w-full bg-white py-16 md:py-32">
        <div className="shell">
          <SectionHeading
            as="h1"
            eyebrow="Contact"
            title={
              <>
                Tell us the site,
                <br />
                <span className="text-teal-brand">we&rsquo;ll map the fit.</span>
              </>
            }
            intro="A mall, a campus, a fleet or a community. Send us the location and what you need it to do, and we will come back on whether the T Station fits and what it would take."
          />

          {/* direct channels first: never make a buyer depend on one route */}
          <div className="mt-14 grid gap-px border border-navy-950/10 bg-navy-950/10 md:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map(({ icon: Icon, label, value, href, note, external, accent }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`group p-7 transition-colors hover:bg-teal-brand/[0.07] ${
                  accent ? 'bg-teal-brand/[0.06]' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                  <Icon size={13} className="text-teal-brand" aria-hidden="true" />
                  {label}
                </div>
                <div className="mt-3 text-base font-semibold text-navy-950 transition-colors group-hover:text-teal-brand">
                  {value}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{note}</p>
              </a>
            ))}
          </div>

          <div className="mt-16 grid gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="font-mono text-[11px] tracking-[0.3em] text-teal-brand uppercase">
                Leave us a message
              </span>

              {status === 'sent' || status === 'mail' ? (
                <div className="mt-6 border border-teal-brand/30 bg-teal-brand/[0.05] p-8 text-center sm:p-10">
                  {/* the mark draws itself — see .tick-* in index.css */}
                  <svg viewBox="0 0 60 60" className="mx-auto h-16 w-16" aria-hidden="true">
                    <circle
                      cx="30"
                      cy="30"
                      r="26.5"
                      fill="none"
                      stroke="var(--color-teal-brand)"
                      strokeWidth="2.5"
                      className="tick-ring"
                      transform="rotate(-90 30 30)"
                    />
                    <path
                      d="M18 30.5 L26.5 39 L42 23"
                      fill="none"
                      stroke="var(--color-teal-brand)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="tick-mark"
                    />
                  </svg>

                  <h2 className="tick-rise mt-6 font-display text-2xl font-medium tracking-normal text-navy-950">
                    {status === 'sent' ? 'Thank you — message received' : 'Your message is ready to send'}
                  </h2>

                  <p className="tick-rise-late mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-600">
                    {status === 'sent' ? (
                      <>
                        We have your {active.label.toLowerCase()} and someone will come back to you
                        shortly. If it&rsquo;s urgent,{' '}
                        <a
                          href={WHATSAPP}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-teal-brand hover:underline"
                        >
                          message us on WhatsApp
                        </a>
                        .
                      </>
                    ) : (
                      <>
                        We&rsquo;ve opened your email app with the enquiry filled in — press send
                        there and it reaches us. If nothing opened, write to{' '}
                        <a
                          href={`mailto:${EMAIL}`}
                          className="font-semibold text-teal-brand hover:underline"
                        >
                          {EMAIL}
                        </a>{' '}
                        or call{' '}
                        <a
                          href={`tel:${PHONE_TEL}`}
                          className="font-semibold text-teal-brand hover:underline"
                        >
                          {PHONE_DISPLAY}
                        </a>
                        .
                      </>
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="tick-rise-late mt-7 cursor-pointer font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-navy-950"
                  >
                    ← Write another message
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-6">
                  {/* purpose first: it changes what we ask for below */}
                  <fieldset>
                    <legend className="sr-only">What is this about?</legend>
                    <div className="grid gap-px border border-navy-950/10 bg-navy-950/10 sm:grid-cols-3">
                      {PURPOSES.map((p) => {
                        const on = p.id === purpose
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setPurpose(p.id)}
                            className={`cursor-pointer px-4 py-3.5 text-left transition-colors ${
                              on ? 'bg-blue-brand text-white' : 'bg-white hover:bg-navy-950/[0.03]'
                            }`}
                          >
                            <span
                              className={`text-[13px] font-semibold ${on ? 'text-white' : 'text-navy-950'}`}
                            >
                              {p.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2.5 text-xs leading-relaxed text-gray-500">{active.blurb}</p>
                  </fieldset>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <input name="name" required placeholder="Your name" className={FIELD} />
                    <input name="org" placeholder="Organisation" className={FIELD} />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="Email address"
                    className={`${FIELD} mt-4`}
                  />
                  <textarea
                    name="message"
                    required
                    rows={5}
                    // the prompt follows the purpose, so the field asks for what we actually need
                    placeholder={active.prompt}
                    className={`${FIELD} mt-4 resize-y`}
                  />

                  {/*
                    Honeypot. Bots fill every field they can find; people never
                    see this one, so anything in it identifies a script and the
                    server drops the submission.

                    Hidden with an off-screen position rather than `display:none`
                    or `hidden`: the cruder bots skip anything obviously
                    undisplayed, and this way it is still a real, focusable,
                    fillable field to anything walking the DOM. `aria-hidden` and
                    negative tabindex keep it away from screen readers and from
                    the keyboard order, so it costs nothing in accessibility.
                  */}
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="off"
                    className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
                  />

                  {status === 'error' && (
                    <p className="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                      That didn&rsquo;t go through. Please try again, or reach us directly at{' '}
                      <a href={`mailto:${EMAIL}`} className="font-semibold underline">
                        {EMAIL}
                      </a>
                      .
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="mt-6 inline-flex cursor-pointer items-center gap-3 bg-blue-brand px-8 py-4 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand disabled:cursor-wait disabled:opacity-70"
                  >
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                    {status === 'sending' && (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin border-2 border-white/30 border-t-white"
                      />
                    )}
                  </button>
                </form>
              )}
            </div>

            <aside className="border-t border-navy-950/10 pt-10 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-14">
              <h2 className="font-display text-xl font-medium tracking-normal text-navy-950">
                What to include
              </h2>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-gray-600">
                {[
                  'Where the site is, and whether it already has a grid connection',
                  'What you need to charge: EVs, e-motorcycles, a mixed fleet',
                  'Roughly how many vehicles, and when demand peaks',
                  'Whether you own the land or manage it for someone else',
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-brand" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs leading-relaxed text-gray-500">
                Talk to us about hosting, buying, partnering, distribution, investment or government
                programmes.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
