import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import AmbientParticles from './components/AmbientParticles'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import LoginModal from './components/LoginModal'
import { AuthProvider } from './lib/auth'
import { PostsProvider } from './lib/postsStore'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import SolutionsPage from './pages/SolutionsPage'
import ResourcesPage from './pages/ResourcesPage'
import BlogPostPage from './pages/BlogPostPage'
import ContactPage from './pages/ContactPage'
import LegalPage from './pages/LegalPage'
import CaseStudyPage from './pages/CaseStudyPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminPage from './pages/AdminPage'

/** route changes land at the top of the new page, not mid-scroll */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* the article library is fetched once here and shared by the
            Resources listing, the article pages and the studio */}
        <PostsProvider>
          <div className="min-h-screen w-full bg-paper text-navy-950 selection:bg-teal-brand/30">
            <ScrollToTop />
            <AmbientParticles />
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/resources/:slug" element={<BlogPostPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/projects/:slug" element={<CaseStudyPage />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* catch-all, so an unknown URL routes back into the funnel
                  instead of rendering the chrome around an empty page */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Footer />
            <BackToTop />
            <LoginModal />
          </div>
        </PostsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
