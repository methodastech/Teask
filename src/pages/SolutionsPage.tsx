import { Leaf, ShieldCheck, Wallet } from 'lucide-react'
import { SectionHeading } from '../components/site/Section'
import TiltCard from '../components/site/TiltCard'
import HouseIcon from '../components/site/HouseIcon'
import { usePageMeta } from '../lib/seo'

// what we solve — the three questions every site owner asks (moved from About)
const CHALLENGES: { icon: typeof ShieldCheck; title: string; body: string; image: string; alt: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Safety',
    body: 'Charging infrastructure engineered and certified as infrastructure, not improvised wiring: managed power, monitored systems, a station built to stand for decades.',
    image: '/images/solutions/safety.webp',
    alt: 'A technician in a hi-vis vest inspecting a Teask T Station power cabinet with managed cabling and monitored controls.',
  },
  {
    icon: Leaf,
    title: 'Sustainability',
    body: 'Solar generation at the point of use, recyclable materials, and a 25+ year service life through maintenance and upgrades instead of demolition and replacement.',
    image: '/images/solutions/sustainability.webp',
    alt: 'A Teask T Station in bright sunlight surrounded by lush green foliage, its solar canopy generating clean energy.',
  },
  {
    icon: Wallet,
    title: 'Affordability',
    body: 'No trenching, no substation upgrade, no months of civil works. Deployment measured in minutes changes what clean energy costs, and who can afford to host it.',
    image: '/images/solutions/affordability.webp',
    alt: 'A pre-assembled Teask T Station being craned off a flatbed and set down on flat ground with no civil works.',
  },
]

/**
 * /solutions, per the Website Framework sitemap: movable stations ·
 * light-EV charging · microgrids · rural · agriculture · AI & compute.
 * Real deployment photography where it exists; branded renders elsewhere.
 */

const SOLUTIONS: { title: string; who: string; body: string; image: string; alt: string }[] = [
  {
    title: 'Movable stations',
    who: 'Malls · campuses · hospitals · events',
    body: 'The T Station itself: a portable, solar-powered charging station that arrives pre-assembled, deploys in under 30 minutes on any flat ground, and relocates whenever demand moves. No trenching, no substation, no civil works.',
    image: '/images/solutions/movable-stations.webp',
    alt: 'A Teask T Station freshly deployed on the forecourt of a shopping mall, its white chevron and blue diamond emblem on the black cabinet.',
  },
  {
    title: 'Light-EV charging',
    who: 'E-motorcycles · e-bikes · scooter fleets',
    body: 'Fast, on-site charging for light electric vehicles, the fleets that keep deliveries and campuses moving. The latest battery and charger reach 80% charge in three minutes at 7.4 kW.',
    image: '/images/solutions/light-ev-charging.webp',
    alt: 'A fleet of yellow-and-black electric scooters charging beneath a Teask T Station solar canopy.',
  },
  {
    title: 'Modular microgrids',
    who: 'Sites that outgrow a single unit',
    body: 'Combine units into a larger microgrid: solar, storage and distribution that scale with demand, operate with or without the national grid, and redeploy as the site evolves.',
    image: '/images/solutions/modular-microgrids.webp',
    alt: 'Several Teask T Station units linked in a row forming a modular solar microgrid at a logistics yard.',
  },
  {
    title: 'Rural electrification',
    who: 'Off-grid communities · remote sites',
    body: 'Power where the grid does not reach, trailheads, plantations, island resorts and remote communities. The station arrives charged and starts serving on day one.',
    image: '/images/solutions/rural-electrification.webp',
    alt: 'A single Teask T Station on remote red-earth ground with forested hills behind, far from the grid.',
  },
  {
    title: 'Agriculture',
    who: 'Farms · plantations · agri-drones',
    body: 'Energy for agricultural operations: charging for drones and electric equipment, and dependable off-grid power for sites where conventional infrastructure is slow or too expensive.',
    image: '/images/solutions/agriculture.webp',
    alt: 'A Teask T Station on the edge of a plantation, an agricultural drone overhead and an electric farm vehicle charging.',
  },
  {
    title: 'AI & compute infrastructure',
    who: 'Data & sovereign-AI partners',
    body: 'Beyond EV charging: rapidly deployable power for local AI and computing infrastructure, the direction of the OneQode and Tigasfera collaboration.',
    image: '/images/solutions/ai-compute.webp',
    alt: 'A Teask T Station at dusk powering a modular edge data-centre, glowing energy lines linking them, city skyline behind.',
  },
]

export default function SolutionsPage() {
  usePageMeta({
    title: 'Solutions · Portable Solar EV Charging, Microgrids & Off-Grid Power · Teask',
    description:
      'Six ways the T Station deploys: movable solar charging stations, e-motorcycle fast charging, modular microgrids, rural electrification, agriculture and AI infrastructure power.',
    path: '/solutions',
  })

  return (
    <main className="pt-16 md:pt-20">
      <section className="relative w-full bg-white py-16 md:py-32">
        <div className="shell">
          <SectionHeading
            as="h1"
            eyebrow="Solutions"
            title={
              <>
                One platform,
                <br />
                <span className="text-teal-brand">every deployment.</span>
              </>
            }
            intro="The same unit serves very different jobs. Six ways the T Station goes to work, each one live in under 30 minutes."
          />

          {/* three inline cards per row — all six deployments in a static grid */}
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <TiltCard key={s.title} className="p-0">
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-6 md:p-7">
                  <div className="font-mono text-[10px] tracking-[0.2em] text-teal-brand uppercase">
                    {s.who}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-navy-950">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* what we solve — three problems, one platform (moved from About) */}
      <section className="relative w-full bg-paper py-16 md:py-32" aria-label="What Teask solves">
        <div className="shell">
          <SectionHeading
            eyebrow="What we solve"
            title={
              <>
                Three problems,
                <br />
                <span className="text-teal-brand">one platform.</span>
              </>
            }
            intro="Every deployment answers the same three questions a site owner actually asks."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {CHALLENGES.map((c) => (
              <TiltCard key={c.title} className="p-0">
                <img
                  src={c.image}
                  alt={c.alt}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-7 md:p-8">
                  <HouseIcon icon={c.icon} size={30} />
                  <h3 className="mt-4 text-lg font-bold text-navy-950">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.body}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
