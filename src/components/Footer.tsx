import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Facebook, Instagram, Linkedin } from 'lucide-react'
import type { CSSProperties } from 'react'
import { chamferClip } from './ChamferBorder'
import { EASE } from './site/Section'
import { LEGAL_DOCS } from '../lib/legal'

// shared horizontal gutter so the contact row, wordmark and bottom bar all line
// up on the same left/right edges
const GUTTER = 'px-6 sm:px-10 lg:px-14'

const SOCIAL: { label: string; icon: typeof Facebook; href: string }[] = [
  { label: 'Facebook', icon: Facebook, href: 'https://www.facebook.com/share/18gTtVmP8u/' },
  {
    label: 'Instagram',
    icon: Instagram,
    href: 'https://www.instagram.com/teask.asia?igsh=MWJocHAzamg4d2Npdw==',
  },
  {
    label: 'LinkedIn',
    icon: Linkedin,
    href: 'https://www.linkedin.com/company/tenaga-alam-sekitar-kita-teask/',
  },
]

// the giant footer watermark: the real wordmark PNG used as a mask, filled with
// a faint navy gradient so it reads as a crisp, scalable ghost of the logo
const GHOST: CSSProperties = {
  aspectRatio: '2835 / 789',
  WebkitMaskImage: 'url(/brand/teask-logo-hd.png)',
  maskImage: 'url(/brand/teask-logo-hd.png)',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  background: 'linear-gradient(to bottom, rgba(5,7,14,0.12), rgba(5,7,14,0.03))',
}

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-navy-950/10 bg-paper">
      {/* ── call to action ── */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-90px' }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-5 pt-24 pb-16 text-center sm:px-8 md:pt-32"
      >
        <h2 className="max-w-4xl font-display text-[1.65rem] leading-[1.2] font-light tracking-[0.01em] text-gray-400 md:text-4xl lg:text-[2.9rem]">
          Let&rsquo;s power an <span className="text-teal-brand">eco-friendly</span> future together, with
          clean energy that deploys anywhere in{' '}
          <span className="font-semibold text-gray-500">30 minutes.</span>
        </h2>
        <div className="mt-10 flex justify-center">
          <Link
            to="/contact"
            style={{ clipPath: chamferClip(14) }}
            className="group inline-flex items-center bg-blue-brand px-8 py-4 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand"
          >
            <span className="mr-0 h-px w-0 bg-white transition-all duration-300 group-hover:mr-3 group-hover:w-6" />
            Let&rsquo;s get started
            <ArrowRight size={16} className="ml-3 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-0" aria-hidden="true" />
          </Link>
        </div>
      </motion.div>

      {/* ── contact + social, aligned to the wordmark edges ── */}
      <div className={`relative z-10 mx-auto w-full max-w-[100rem] ${GUTTER}`}>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          {/* address, far left, three lines */}
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">Address</div>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-navy-950">
              CoInnov8, Level 1, CoPlace 10 Block 2330,
              <br />
              Jalan Usahawan Cyber 6, 63000 Cyberjaya, Selangor
            </p>
          </div>

          {/* phone/email and social, side by side, baseline-aligned with the address */}
          <div className="flex items-end gap-10 sm:gap-16">
            <div className="flex flex-col gap-4">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">Phone</div>
                <a
                  href="tel:+60192121118"
                  className="-my-3 mt-1.5 block py-3 text-sm font-medium text-navy-950 transition-colors duration-200 hover:text-teal-brand"
                >
                  019-212-1118
                </a>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">Email</div>
                <a
                  href="mailto:kiu@teask.asia"
                  className="-my-3 mt-1.5 block py-3 text-sm font-medium text-navy-950 transition-colors duration-200 hover:text-teal-brand"
                >
                  kiu@teask.asia
                </a>
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                  WhatsApp
                </div>
                <a
                  href="https://wa.me/60192121118"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-my-3 mt-1.5 block py-3 text-sm font-medium text-navy-950 transition-colors duration-200 hover:text-teal-brand"
                >
                  Message us
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {SOCIAL.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-teal-brand/30 text-teal-brand transition-colors duration-300 hover:bg-teal-brand hover:text-white"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── giant faded wordmark + bottom bar, sharing the same edges ── */}
      <div className={`relative mx-auto mt-8 w-full max-w-[100rem] ${GUTTER}`}>
        <div aria-hidden="true" className="pointer-events-none w-full translate-y-[6%] select-none" style={GHOST} />
        {/* Overlaid on the wordmark from md up, where the wordmark is tall enough
            to hold it. On a phone the wordmark is only ~100px while the bar
            stacks to more than that, so absolute positioning pushed it up over
            the contact block — below md it sits underneath instead. The padding
            is re-applied only when absolute, since `inset-x-0` ignores the
            parent's padding but static flow inherits it. */}
        <div className="mt-6 pb-6 md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:px-10 lg:px-14">
          <div className="flex flex-col-reverse items-center gap-3 text-xs text-gray-500 sm:flex-row sm:justify-between">
            <p>© 2026 Tenaga Alam Sekitar Kita (M) Sdn Bhd. All rights reserved.</p>
            {/* py-2 with a matching negative margin: the links become 40px tall
                targets on a phone while the row keeps the height it had */}
            <div className="-my-3 flex flex-wrap items-center justify-center gap-x-4">
              {LEGAL_DOCS.map((doc) => (
                <Link
                  key={doc.slug}
                  to={`/legal/${doc.slug}`}
                  className="py-3 transition-colors duration-200 hover:text-navy-950"
                >
                  {doc.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
