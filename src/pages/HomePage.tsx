import Station3Experience from '../components/Station3Experience'
import GridSection from '../components/GridSection'
import ProofStrip from '../components/site/ProofStrip'
import VideoIntro from '../components/site/VideoIntro'
import { usePageMeta, SITE_URL } from '../lib/seo'
import Offering from '../components/site/Offering'
import StatsBand from '../components/site/StatsBand'
import HowItWorks from '../components/site/HowItWorks'
import Solutions from '../components/site/Solutions'
import Technology from '../components/site/Technology'
import Projects from '../components/site/Projects'
import FAQ, { FAQS } from '../components/site/FAQ'
import ThePlan from '../components/site/ThePlan'
import Comparison from '../components/site/Comparison'

/**
 * Home, the flagship one-pager.
 *   Diamond loader → gated blueprint product experience → deployment contexts →
 *   platform → the record → how it works → solutions → technology → projects →
 *   recognition → CTA. (About lives on its own page at /about.)
 */
export default function HomePage() {
  usePageMeta({
    title: 'Teask · Malaysia’s First Portable Solar EV Charging Station · Clean Energy in 30 Minutes',
    description:
      'Teask builds rapidly deployable solar EV charging stations and modular energy infrastructure in Malaysia, live in under 30 minutes, no trenching, grid-optional. First station live in Cyberjaya.',
    path: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Tenaga Alam Sekitar Kita (M) Sdn Bhd',
        alternateName: 'Teask',
        url: SITE_URL,
        logo: `${SITE_URL}/brand/teask-logo-hd.png`,
        email: 'kiu@teask.asia',
        telephone: '+60-19-212-1118',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Cyberjaya',
          addressRegion: 'Selangor',
          addressCountry: 'MY',
        },
        sameAs: [
          'https://www.facebook.com/teask.asia',
          'https://www.instagram.com/teask.asia',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Teask',
        url: SITE_URL,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Teask T Station T3',
        description:
          'Malaysia’s first portable, solar-powered EV and e-motorcycle charging station, deploys in under 30 minutes, 25+ year structural service life, grid-optional.',
        brand: { '@type': 'Brand', name: 'Teask' },
        image: `${SITE_URL}/images/photos/l1960350.jpg`,
      },
      {
        // FAQPage markup: these answers are eligible to surface directly in
        // Google results, which is free real estate for exactly the objections
        // that stall a deal
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  })

  return (
    <>
      <main>
        <Station3Experience />
        <ProofStrip />
        <GridSection />
        <VideoIntro />
        <Offering />
        <StatsBand />
        <HowItWorks />
        <Solutions />
        <Technology />
        <Comparison />
        <ThePlan />
        <Projects />
        <FAQ />
      </main>
    </>
  )
}
