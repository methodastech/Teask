import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchPosts } from './cms'
import { POSTS, articlesIn, findPost, newsIn, relatedIn, type Post } from './posts'

/**
 * One fetch of the article library per page load, shared by everything that
 * reads it: the Resources listing, the article pages, the sidebar and the
 * studio.
 *
 * Reading posts used to be a synchronous function call because they were a
 * constant in the bundle. Now they come from MySQL over the network, so the
 * list has a loading state — and that state has to live somewhere every
 * consumer can see it, or each page would fetch its own copy.
 */

interface PostsContextValue {
  posts: Post[]
  loading: boolean
  /** set when the API could not be reached; the site still renders without it */
  error: string
  reload: () => Promise<void>
}

const PostsContext = createContext<PostsContextValue | null>(null)

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setPosts(await fetchPosts())
      setError('')
    } catch (e) {
      // an unreachable API should degrade to the built-in articles, not to a
      // blank Resources page
      setPosts(POSTS)
      setError(e instanceof Error ? e.message : 'The article library could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo(
    () => ({ posts, loading, error, reload: load }),
    [posts, loading, error, load],
  )

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePosts must be used within PostsProvider')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useArticles(): Post[] {
  const { posts } = usePosts()
  return useMemo(() => articlesIn(posts), [posts])
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNews(): Post[] {
  const { posts } = usePosts()
  return useMemo(() => newsIn(posts), [posts])
}

/** the post, plus whether we are still waiting to know if it exists */
// eslint-disable-next-line react-refresh/only-export-components
export function usePost(slug: string | undefined): { post: Post | undefined; loading: boolean } {
  const { posts, loading } = usePosts()
  const post = useMemo(() => (slug ? findPost(posts, slug) : undefined), [posts, slug])
  return { post, loading }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRelated(slug: string, n: number): Post[] {
  const { posts } = usePosts()
  return useMemo(() => relatedIn(posts, slug, n), [posts, slug, n])
}
