import { SectionHeading } from './Section'
import TiltCard from './TiltCard'
import GlyphMark, { type MarkName } from './GlyphMark'

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3FP46Emobin1BeouoYpzom4YJCr/'

const PILLARS: {
  mark: MarkName
  tag: string
  title: string
  body: string
  image: string
  alt: string
}[] = [
  {
    mark: 'bolt',
    tag: 'Product',
    title: 'The T Station',
    body: 'A portable, solar-powered charging station for EVs and e-motorcycles. It arrives charged and starts serving on day one, no grid connection required.',
    image: CDN + 'hf_20260719_210642_069b51af-60fd-4d1f-b705-0c8374e0c107_min.webp',
    alt: 'A single T Station charging electric motorcycles under its solar canopy.',
  },
  {
    mark: 'stack',
    tag: 'System',
    title: 'Modular microgrid',
    body: 'Combine units into a larger microgrid, solar, storage and distribution that scale with demand and relocate whenever the site moves.',
    image: CDN + 'hf_20260719_210647_8d9d5228-daba-4a2b-a3e4-2014a08b3d4d_min.webp',
    alt: 'Several T Station units clustered together forming a modular microgrid.',
  },
  {
    mark: 'pulse',
    tag: 'Platform',
    title: 'Smart energy layer',
    body: 'Monitoring, load balancing and an upgradeable core built for what comes next: peer-to-peer and VPPA energy trading.',
    image: '/images/solutions/smart-energy-layer.webp',
    alt: 'A Teask T Station with its solar canopy and charging bays, standing in a clean modern corporate plaza.',
  },
]

export default function Offering() {
  return (
    <section id="platform" className="relative w-full bg-paper py-16 md:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow="What we build"
          title={
            <>
              One platform,
              <br />
              <span className="text-teal-brand">three layers.</span>
            </>
          }
          intro="Clean energy infrastructure that deploys in under 30 minutes, with or without the grid."
        />

        <div className="mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="w-[76%] shrink-0 snap-start md:w-auto">
              <TiltCard delay={i * 0.1}>
              {/* image on top */}
              <div className="aspect-[4/3] w-full overflow-hidden border-b border-teal-brand/20">
                <img
                  src={p.image}
                  alt={p.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {/* text below */}
              <div className="p-7 md:p-8">
                <div className="flex items-center justify-between">
                  <GlyphMark name={p.mark} size={50} className="text-blue-brand" />
                  <span className="font-mono text-[10px] tracking-[0.25em] text-gray-600 uppercase">
                    {p.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-medium tracking-normal text-navy-950">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{p.body}</p>
              </div>
              </TiltCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
