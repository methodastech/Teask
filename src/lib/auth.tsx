import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

/**
 * Demo auth for the content studio. There is no backend, so this checks a single
 * hardcoded demo account and remembers the session in localStorage. It is a
 * front-end prototype for the client's team to preview publishing, NOT real
 * authentication — do not put anything sensitive behind it.
 */

export const DEMO_EMAIL = 'demo@teask.asia'
export const DEMO_PASSWORD = 'teask2026'

const AUTH_KEY = 'teask_auth'

type User = { email: string; name: string }

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => boolean
  logout: () => void
  loginOpen: boolean
  openLogin: () => void
  closeLogin: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })
  const [loginOpen, setLoginOpen] = useState(false)

  const login = useCallback((email: string, password: string) => {
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const u: User = { email: DEMO_EMAIL, name: 'Teask Team' }
      setUser(u)
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(u))
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    window.localStorage.removeItem(AUTH_KEY)
  }, [])

  const openLogin = useCallback(() => setLoginOpen(true), [])
  const closeLogin = useCallback(() => setLoginOpen(false), [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loginOpen, openLogin, closeLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
