import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Lock, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import Logo from './Logo'

const FIELD =
  'w-full border border-navy-950/10 bg-navy-950/[0.04] px-4 py-3 text-sm text-navy-950 placeholder:text-gray-500 outline-none transition-colors focus:border-teal-brand/60'

export default function LoginModal() {
  const { loginOpen, closeLogin, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  // reset the form each time the modal opens; close on Escape
  useEffect(() => {
    if (!loginOpen) return
    setEmail('')
    setPassword('')
    setError('')
    setPending(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeLogin()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loginOpen, closeLogin])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    // the API decides now, so this is a round trip rather than a comparison
    const message = await login(email, password)
    setPending(false)
    if (message === null) {
      closeLogin()
      navigate('/admin')
    } else {
      setError(message)
    }
  }

  return (
    <AnimatePresence>
      {loginOpen && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closeLogin} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Team log in"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md border border-navy-950/10 bg-white p-8 shadow-[0_30px_80px_-20px_rgba(5,7,14,0.5)] md:p-10"
          >
            <button
              type="button"
              onClick={closeLogin}
              aria-label="Close"
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center text-gray-500 transition-colors hover:text-navy-950"
            >
              <X size={18} />
            </button>

            <Logo height={28} />
            <div className="mt-6 flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-teal-brand uppercase">
              <Lock size={13} aria-hidden="true" /> Content studio
            </div>
            <h2 className="mt-2 text-2xl font-bold text-navy-950">Team sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Sign in to publish and manage articles on the Resources page.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <input
                type="email"
                autoFocus
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={FIELD}
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={FIELD}
              />
              {error && <p className="text-xs font-medium text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full cursor-pointer bg-blue-brand px-6 py-3.5 text-sm font-semibold tracking-[0.15em] text-white uppercase transition-colors duration-300 hover:bg-teal-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
