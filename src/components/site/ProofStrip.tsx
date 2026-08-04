/**
 * Framework band 02 · the proof strip, "trust is felt before it is read."
 * A single quiet band under the hero carrying the approved credibility names
 * on a slow masked marquee. Shown as partner/award logos where a logo exists;
 * names without a logo yet fall back to the original mono caption.
 */

import { useState } from 'react'

/**
 * `stacked` marks a lockup that is roughly as tall as it is wide — a symbol over
 * a wordname, rather than a wordmark. Matching every logo to the same height
 * makes those render tiny: at 32px tall, a 5:1 wordmark is 175px across and a
 * 1:1 badge is 32px, so the badge reads as an afterthought. Logos are sized to
 * look equal, not to measure equal, so the stacked ones get more height.
 */
type Proof = { name: string; logo?: string; stacked?: boolean }

const PROOF: Proof[] = [
  {
    name: 'National Energy Awards 2025 · Runner-up',
    logo: '/images/partners/national-energy-awards.png',
    stacked: true,
  },
  { name: 'Cradle CIP Spark 2024', logo: '/images/partners/cip-spark.png' },
  { name: '144 Ventures · Strategic investment', logo: '/images/partners/144-ventures.png' },
  { name: 'OneQode', logo: '/images/partners/oneqode.png' },
  { name: 'Tigasfera', logo: '/images/partners/tigasfera.png' },
  { name: 'Cradle', logo: '/images/partners/cradle.png' },
  { name: 'Cyberview', logo: '/images/partners/cyberview.png', stacked: true },
  { name: 'Plugin+', logo: '/images/partners/pluginplus.png' },
  { name: 'Carbon Next', logo: '/images/partners/carbon-next.png', stacked: true },
  { name: 'MyZEVA · Malaysia Zero Emission Vehicle Association', logo: '/images/partners/myzeva.png' },
  {
    name: "N'OSAIRIS Technology Solutions",
    logo: '/images/partners/nosairis.png',
    stacked: true,
  },
  {
    name: 'Majlis Perbandaran Sepang',
    logo: '/images/partners/sepang.png',
    stacked: true,
  },
  { name: 'Leave a Nest', logo: '/images/partners/leave-a-nest.png' },
  { name: 'Beam', logo: '/images/partners/beam.png', stacked: true },
]

/**
 * How many times the set is laid down per half of the loop. A -50% loop only
 * reads as seamless when each half is at least as wide as the screen, and the
 * original five logos came to roughly 1000px — hence the gap. At fourteen they
 * comfortably exceed 2500px, so two repeats put each half well beyond any
 * ultrawide, and the set is now long enough that the repetition barely registers.
 * Worth dropping to 1 if the roster grows much further.
 */
const HALF_REPEATS = 2

/**
 * One name in the strip. Falls back to the mono caption both when there is no
 * artwork *and* when the artwork fails to load — a declared path that isn't on
 * disk yet would otherwise render a broken image, which is worse than the
 * wordmark it replaced.
 */
function ProofMark({ item }: { item: Proof }) {
  const [failed, setFailed] = useState(false)
  const showLogo = item.logo && !failed
  return (
    <span className="mx-8 inline-flex items-center gap-8 whitespace-nowrap">
      {showLogo ? (
        <img
          src={item.logo}
          alt={item.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className={
            item.stacked
              ? 'h-10 w-auto object-contain md:h-11'
              : 'h-7 w-auto object-contain md:h-8'
          }
        />
      ) : (
        <span className="font-mono text-[11px] tracking-[0.25em] text-gray-600 uppercase">
          {item.name}
        </span>
      )}
      <span className="h-1 w-1 rotate-45 bg-teal-brand/60" aria-hidden="true" />
    </span>
  )
}

export default function ProofStrip() {
  const row = PROOF.map((p) => <ProofMark key={p.name} item={p} />)

  return (
    <section
      aria-label="Awards, investors and partners"
      className="relative w-full overflow-hidden border-y border-navy-950/10 bg-white py-6"
    >
      <div
        className="pointer-events-none"
        style={{
          maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        }}
      >
        {/*
          A -50% loop is only seamless if each half is at least as wide as the
          screen. Five logos come to roughly a thousand pixels, so on any normal
          desktop one half ran out mid-band and left the gap — the blank space
          that reads as "we ran out of partners".

          So each half repeats the set until it comfortably exceeds any viewport,
          and the two halves are identical: at -50% the second sits exactly where
          the first began and the seam never lands anywhere visible. The duration
          scales with the repeat count so the logos keep travelling at the same
          speed however many times the set is laid down.
        */}
        <div
          className="marquee flex w-max items-center"
          style={{ animationDuration: `${36 * HALF_REPEATS}s` }}
        >
          {Array.from({ length: HALF_REPEATS * 2 }, (_, k) => (
            <div key={k} className="flex items-center" aria-hidden={k > 0 ? true : undefined}>
              {row}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
