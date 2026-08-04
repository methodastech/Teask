import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, User, X } from 'lucide-react'
import Logo from './Logo'
import { chamferClip } from './ChamferBorder'
import { useAuth } from '../lib/auth'

const links = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Resources', to: '/resources' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, openLogin } = useAuth()

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      {/* Solid white, always. It used to fade in from transparent over the first
          60px of scroll, which left the links sitting unreadably on top of the
          hero render and any full-bleed photography. */}
      <nav className="bg-white" aria-label="Main navigation">
        <div className="shell flex items-center justify-between py-4">
          {/* id is the landing target the intro loader flies its wordmark to */}
          <Link to="/" id="nav-logo" aria-label="Teask home" className="-my-1 flex items-center py-1">
            {/* sized to match the Contact button's height so the lockup reads as prominently */}
            <Logo height={38} />
          </Link>

          <div className="hidden items-center gap-6 lg:flex xl:gap-8">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="group relative text-[13px] font-medium tracking-wide text-gray-600 transition-colors hover:text-navy-950"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-teal-brand transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            <Link
              to="/contact"
              style={{ clipPath: chamferClip(11) }}
              className="shrink-0 bg-blue-brand px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-brand"
            >
              Contact
            </Link>
            {user ? (
              <Link
                to="/admin"
                className="group relative text-[13px] font-medium tracking-wide text-teal-brand transition-colors hover:text-blue-brand"
              >
                Admin site
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-teal-brand transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="group relative inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium tracking-wide text-gray-600 transition-colors hover:text-navy-950"
              >
                <User size={14} aria-hidden="true" /> Log in
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-teal-brand transition-all duration-300 group-hover:w-full" />
              </button>
            )}
          </div>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="-m-1 p-3 text-navy-950 lg:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-navy-950/10 bg-white/95 backdrop-blur-md lg:hidden"
            >
              <div className="shell flex flex-col gap-1 py-4">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="py-2 text-base font-medium text-gray-600 hover:text-navy-950"
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="py-2 text-base font-medium text-teal-brand"
                  >
                    Admin site
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      openLogin()
                    }}
                    className="flex items-center gap-2 py-2 text-left text-base font-medium text-gray-600 hover:text-navy-950"
                  >
                    <User size={16} aria-hidden="true" /> Log in
                  </button>
                )}
                <Link
                  to="/contact"
                  onClick={() => setOpen(false)}
                  style={{ clipPath: chamferClip(12) }}
                  className="mt-3 bg-blue-brand px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Contact
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
