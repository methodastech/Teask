import About from '../components/site/About'
import { usePageMeta, SITE_URL } from '../lib/seo'

/**
 * /about, the company and the founders, the record (per the Website Framework).
 * Top padding clears the fixed navbar; the CTA band keeps the deployment
 * enquiry one click away, as on every page.
 */
export default function AboutPage() {
  usePageMeta({
    title: 'About Teask · The Company, the Founders, the Record · Tenaga Alam Sekitar Kita',
    description:
      'Teask builds rapidly deployable, decentralised energy infrastructure in Malaysia, founded 2022 in Cyberjaya by James Anthony Tan and Kiu Yik Khong. Awards, investment and the record.',
    path: '/about',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About Teask',
      url: `${SITE_URL}/about`,
      mainEntity: {
        '@type': 'Organization',
        name: 'Tenaga Alam Sekitar Kita (M) Sdn Bhd',
        alternateName: 'Teask',
        url: SITE_URL,
        foundingDate: '2022',
        // jobTitle carries the office only. That they founded the company is
        // already what the `founder` property says, and repeating it here left
        // the structured data contradicting the page once the visible copy
        // dropped it.
        founder: [
          { '@type': 'Person', name: 'James Anthony Tan', jobTitle: 'Chief Executive Officer' },
          { '@type': 'Person', name: 'Kiu Yik Khong', jobTitle: 'Chief Operating Officer' },
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'CoInnov8, Level 1, CoPlace 10 Block 2330, Jalan Usahawan Cyber 6',
          addressLocality: 'Cyberjaya',
          postalCode: '63000',
          addressRegion: 'Selangor',
          addressCountry: 'MY',
        },
      },
    },
  })

  return (
    <main className="pt-16 md:pt-20">
      <About />


    </main>
  )
}
