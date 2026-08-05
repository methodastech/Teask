import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiEnabled, apiLogin, apiLogout, apiMe, clearToken, getToken, setToken } from './api'

/**
 * Studio sign-in.
 *
 * With VITE_API_URL set, credentials are checked by the API against the
 * admin_users table (bcrypt hashes, server-issued session token). Without it,
 * the old hardcoded demo account applies so the prototype still opens — that
 * path is a preview convenience and must never guard anything real.
 */

/**
 * Preview credentials, used only while no API is configured — the staging
 * build the client is shown before the database exists.
 *
 * These are compiled into the JavaScript bundle, so anyone who reads it can
 * find them. That is acceptable for a preview, because without a database the
 * studio writes to the reader's own browser and nobody else sees a thing.
 *
 * It is NOT acceptable to put the real studio password here. That one lives in
 * config.php on the server, is stored only as a bcrypt hash, and takes over the
 * moment VITE_API_URL is set — at which point everything below is dead code.
 */
export const PREVIEW_EMAIL = 'studio@teask.asia'
export const PREVIEW_PASSWORD = 'gkt6-ecmn-hj8x'

const AUTH_KEY = 'teask_auth'

type User = { email: string; name: string }

interface AuthContextValue {
  user: User | null
  /** resolves to null on success, or a message to show the user */
  login: (email: string, password: string) => Promise<string | null>
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

  /**
   * A remembered user is only a hint. The token behind it may have expired or
   * been revoked, so confirm it with the server once on load and sign out if
   * it is no longer good — otherwise the studio would render for someone whose
   * every save is about to be refused.
   */
  useEffect(() => {
    if (!apiEnabled || !user) return
    if (!getToken()) {
      setUser(null)
      window.localStorage.removeItem(AUTH_KEY)
      return
    }
    let current = true
    apiMe()
      .then((me) => {
        if (!current) return
        setUser(me)
        window.localStorage.setItem(AUTH_KEY, JSON.stringify(me))
      })
      .catch((e) => {
        // only a rejected session signs them out; a network blip should not
        if (current && e instanceof ApiError && e.status === 401) {
          setUser(null)
          window.localStorage.removeItem(AUTH_KEY)
        }
      })
    return () => {
      current = false
    }
    // once per load, against whatever session was remembered
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    if (!apiEnabled) {
      if (email.trim().toLowerCase() === PREVIEW_EMAIL && password === PREVIEW_PASSWORD) {
        const u: User = { email: PREVIEW_EMAIL, name: 'Teask Team' }
        setUser(u)
        window.localStorage.setItem(AUTH_KEY, JSON.stringify(u))
        return null
      }
      // same wording the API uses, so the preview behaves like the real thing
      return 'Those credentials do not match an account.'
    }

    try {
      const { token, user: u } = await apiLogin(email.trim().toLowerCase(), password)
      setToken(token)
      setUser(u)
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(u))
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not sign in.'
    }
  }, [])

  const logout = useCallback(() => {
    // tell the server to drop the session, but do not make the user wait for it
    if (apiEnabled && getToken()) void apiLogout().catch(() => {})
    clearToken()
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
