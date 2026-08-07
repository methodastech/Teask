import { SectionHeading } from './Section'
import RecordTimeline from './RecordTimeline'
import Story from './Story'
import Values from './Values'

/**
 * About · rebuilt to the site's band rhythm (busy and calm alternating, white
 * and paper, one heading treatment per band) so the page reads like the rest
 * of the framework-driven site rather than a single stacked column.
 *
 * Content: the company (audit + teask.asia mission) · the founders · the record
 * · field photography.
 * (The heritage story and "what we solve" now live on the Solutions page.)
 */

/**
 * The two founders and the two senior advisors, in seniority order.
 *
 * Bios are held to roughly the same length on purpose: this is a card, and the
 * reveal has to fit inside the portrait without scrolling. The advisors' full
 * CVs run several paragraphs — they are condensed here to the same measure as
 * the founders', keeping employers, tenure and credentials and dropping the
 * connective prose.
 */
/**
 * The slanted block behind each portrait.
 *
 * clip-path, not `transform: skewX()`: a skew on the parent drags every child
 * out of true with it, so the portrait would lean and the type would italicise.
 * Clipping leaves the coordinate space alone and only cuts the paint.
 *
 * LEAN% of the block's width is given to the rake. The top edge starts LEAN in
 * and the bottom edge stops LEAN short, so the two are parallel and the figure
 * reads as one consistent slant down the row.
 */
const LEAN = 10

const BLOCK_CLIP = `polygon(${LEAN}% 0%, 100% 0%, ${100 - LEAN}% 100%, 0% 100%)`

/* ── the accordion row's own geometry ──────────────────────────────────────
 *
 * Once panels change width on hover, two things about the grid's approach stop
 * working, and both are fixed here rather than patched:
 *
 *  1. A rake measured in % of width would slant differently in a wide panel
 *     than in a narrow one, so the four would stop reading as one continuous
 *     angle the moment anything moved. LEAN_PX is a fixed length, so every
 *     panel keeps an identical slant whatever its width.
 *
 *  2. Clipping the IMAGE meant the polygon had to be derived from the column
 *     ratio (see figureClip), and that ratio is exactly what a resizing panel
 *     changes — the tuck would drift out of true mid-animation. Instead the
 *     portrait now sits inside a WRAPPER pinned to inset-x-0, so the wrapper is
 *     always the panel's width and its clip can be written against the block's
 *     edges directly. Nothing to re-derive when the width moves.
 */
const LEAN_PX = 34
const BLOCK_TOP = 20 // % of panel height where the block starts
/** portrait height as a % of the panel, before each subject's own headScale */
const FIG_H = 93

const BLOCK_CLIP_FLUID = `polygon(${LEAN_PX}px 0%, 100% 0%, calc(100% - ${LEAN_PX}px) 100%, 0% 100%)`

/**
 * Where a portrait starts, and the clip that goes with it, for a given scale.
 *
 * The portrait is pinned to the block's floor, so its height is what decides
 * its top — hence the pair being computed together. The clip has to be derived
 * per subject too: it walks the block's edges up from BLOCK_TOP to wherever
 * that portrait begins, and once the portraits start at different heights, so
 * does the walk.
 *
 * Scaling is applied by moving the wrapper's top rather than by growing the
 * image inside it. The wrapper's clip has no open top — anything taller than
 * the box gets cut — so a scaled-up image would simply lose its crown.
 */
function figurePlacement(figH: number, blockTop: number, scale: number) {
  const top = 100 - figH * scale
  const overshoot = (blockTop - top) / (100 - blockTop)
  return {
    top: `${top.toFixed(2)}%`,
    clip:
      `polygon(${(LEAN_PX * (1 + overshoot)).toFixed(2)}px 0%, ` +
      `calc(100% + ${(LEAN_PX * overshoot).toFixed(2)}px) 0%, ` +
      `calc(100% - ${LEAN_PX}px) 100%, 0px 100%)`,
  }
}

/** the caption's inset: clear of the rake, plus a margin */
const CAPTION_PAD = LEAN_PX + 14

/* ── the fixed grid's equivalent ───────────────────────────────────────────
 *
 * Same placement, but the lean is in % rather than px: every column in the grid
 * is the same width, so a proportional lean keeps one slant across the row, and
 * it stays sensible down at a ~160px phone column.
 */
const BLOCK_TOP_GRID = 16
const FIG_H_GRID = 96

function figurePlacementGrid(scale: number) {
  const top = 100 - FIG_H_GRID * scale
  const overshoot = (BLOCK_TOP_GRID - top) / (100 - BLOCK_TOP_GRID)
  return {
    top: `${top.toFixed(2)}%`,
    clip:
      `polygon(${(LEAN * (1 + overshoot)).toFixed(2)}% 0%, ` +
      `${(100 + LEAN * overshoot).toFixed(2)}% 0%, ` +
      `${100 - LEAN}% 100%, 0% 100%)`,
  }
}

/**
 * The grid's rake correction, converted into the image's own width so it can
 * ride along in the same translate as the head correction. The portrait there
 * is 96% of its column (96% of the height × 1.25 column ratio × the source's
 * 4:5), so half a lean of column is half a lean ÷ 0.96 of image.
 */
const FIG_W_GRID = 96
const RAKE_SHIFT_GRID = (LEAN / 2 / FIG_W_GRID) * 100

/**
 * The block fill: the gem gradient from the logo's diamond, stop for stop, so
 * the row is cut from the same blue as the mark rather than a flat brand tint.
 * Kept in sync with SpinningDiamond in Logo.tsx.
 *
 * It runs pale at the top and deepest at 80%, which suits a tall block: the
 * light end sits behind the head and shoulders where the greyscale portrait
 * needs separation, and the dark end sits where the caption scrim lands.
 */
const BLOCK_GRADIENT =
  'linear-gradient(180deg,#8FEFFA 0%,#3FC9F0 30%,#2E7FE0 55%,#1E48C8 80%,#5AA9EA 100%)'

/**
 * `headCentre` is where the subject's head actually sits across its own file,
 * measured off the alpha channel over the band from the crown down 18% of the
 * frame. It is not decorative: the portraits are not consistently framed, and
 * centring the IMAGE therefore does not centre the FACE.
 *
 *   James       45.1%     Alexchandar  51.6%
 *   Kiu         47.3%     Mohammad     53.2%
 *
 * Re-measure whenever a portrait is replaced — it is a property of that file's
 * framing, not of the person.
 *
 * The two that sit left of their frame are exactly the two whose heads were
 * being clipped, because the rake already shifts the block's top edge right —
 * a head left of centre gets pushed into that edge, while one right of centre
 * happens to cancel it out. Centring on this value instead of on the file's
 * midpoint fixes both without touching the photographs.
 *
 * `headScale` levels how BIG each head reads. The four were shot at different
 * distances, so at one figure height their heads come out different sizes —
 * measured across the skull at its widest, before the shoulders start:
 *
 *   James       31.8%     Alexchandar  28.8%
 *   Kiu         29.9%     Mohammad     32.8%
 *
 * Each scale is the four-way average over that subject's own width, then damped
 * halfway back toward 1. The damping is not timidity: the measurement spans hair
 * as well as skull, so a short-haired subject's width is nearly all head while a
 * fuller-haired one's is not, and matching the raw widths visibly oversizes the
 * first one's face — which is exactly what happened to Kiu at his undamped
 * 1.048. Halving it landed where the eye agreed, so the same discipline is
 * applied across all four.
 *
 * Re-measure alongside headCentre when a portrait is replaced, then check by eye.
 */
const LEADERSHIP: {
  name: string
  role: string
  bio: string
  image: string
  headCentre: number
  headScale: number
}[] = [
  {
    name: 'James Anthony Tan',
    role: 'Chief Executive Officer',
    bio: 'Honorary Captain and Guinness World Record holder (2013): the youngest person, and the first Malaysian, to circumnavigate the world solo by aircraft. James leads vision, strategic partnerships, technology commercialisation and long-term growth.',
    image: '/images/founders/james-anthony-tan.png',
    headCentre: 0.451,
    headScale: 0.985,
  },
  {
    name: 'Kiu Yik Khong',
    role: 'Chief Operating Officer',
    bio: 'Formerly business development at a Japanese M&A multinational and commercial lead in agriculture. Khong leads operations, business development and commercial execution, overseeing the deployment and scaling of every station.',
    image: '/images/founders/kiu-yik-khong.png',
    headCentre: 0.473,
    headScale: 1.015,
  },
  {
    name: 'Alexchandar Anbalagan',
    role: 'Chief Strategy Officer',
    bio: 'Over 20 years in strategy, finance, governance, enterprise risk and internal audit with Global Fashion Group, Rolls-Royce, DHL Supply Chain, Chubb and KPMG across Asia Pacific. FCCA, Certified Internal Auditor and an Oxford Executive Leadership alumnus.',
    image: '/images/founders/alexchandar-anbalagan.png',
    headCentre: 0.516,
    headScale: 1.035,
  },
  {
    name: 'Ts. Mohammad Nazri Mizayauddin',
    role: 'Advisor · Governance & Sustainability',
    bio: 'Formerly Chief Strategy Officer at SEDA Malaysia, with over 25 years in corporate strategy, renewable energy, ESG and investment. Director of SUS Environment (Shanghai) and a national ExCo member of the IEA Photovoltaic Power Systems Programme.',
    image: '/images/founders/mohammad-nazri-mizayauddin.png',
    headCentre: 0.532,
    headScale: 0.97,
  },
]

/**
 * Where to sit a portrait so its FACE lands on the middle of the block, rather
 * than its file's midpoint landing on the middle of the column.
 *
 * Two corrections, and they are in different units on purpose:
 *
 *  · the head correction is a percentage, because a translate percentage on an
 *    image resolves against that image's own width — so it holds at any render
 *    size without knowing what that size is
 *  · the rake correction is half the lean, because the block's centreline runs
 *    from +lean/2 at its top edge to −lean/2 at its floor, and the head is at
 *    the top. Its unit has to match whatever unit that row's lean is in.
 */
const headShift = (headCentre: number) => (0.5 - headCentre) * 100

const RECORD: {
  when: string
  what: string
  detail: string
  image?: string
  alt?: string
}[] = [
  {
    when: '2022',
    what: 'Founded',
    detail: 'Tenaga Alam Sekitar Kita, Cyberjaya',
    image: '/images/events/teask-launch.png',
    alt: 'The Teask team on stage at the Product Preview & Company Launch with Cyberview.',
  },
  {
    when: '2024',
    what: 'Cradle CIP Spark',
    detail: 'Cyberview Living Lab',
    image: '/images/events/cradle.png',
    alt: 'The Teask team at Cradle, marking selection into the CIP Spark programme.',
  },
  {
    // 25 September 2025, per the award cheque: Category 3 Renewable Energy,
    // sub-category Renewable Energy Enabler Technology, runner-up, RM15,000,
    // for TEASK Station 3 (Moveable Energy Station)
    when: 'September 2025',
    what: 'National Energy Award',
    detail: 'Runner-up · Renewable Energy Enabler',
    image: '/images/events/nea-2025-award.jpg',
    alt: 'Teask receiving the runner-up award for Renewable Energy Enabler Technology at the National Energy Awards 2025, presented on stage with the RM15,000 cheque and certificate.',
  },
  {
    when: '2025',
    what: 'Expo 2025 Osaka',
    detail: 'Representing Malaysia',
    image: '/images/events/expo-osaka-panel.jpg',
    alt: 'Teask on the MRANTI panel, Mission Based R&D Towards Society 5.0: Strengthening Malaysia-Japan Innovation Partnerships, at the Malaysia Pavilion, Expo 2025 Osaka.',
  },
  {
    when: 'November 2025',
    what: 'Naturenix MOU',
    detail: '3minGo! fast-charging partnership',
    image: '/images/events/naturenix-mou.jpg',
    alt: 'Teask and Naturenix representatives on stage signing the 3minGo! fast-charging MOU.',
  },
  {
    when: 'January 2026',
    what: '144 Ventures',
    detail: 'Strategic investment',
    image: '/images/events/teask-team-osaka.jpg',
    alt: 'Two Teask team members in branded shirts at the Expo 2025 Osaka venue.',
  },
  {
    // ChangeNOW x INSPIRED Challenge, EUR 20,000, announced 1 July 2026
    when: '2026',
    what: 'ChangeNOW x INSPIRED',
    detail: 'Winner · top sustainable solution',
    image: '/images/events/changenow-inspired.png',
    alt: 'James Anthony Tan presenting Teask on stage at ChangeNOW, where it won the ChangeNOW x INSPIRED Challenge.',
  },
]

export default function About() {
  return (
    <>
      {/* ── band 1 · who Teask is · copy left, video bleeding in from the right ──
          The video sits under a white gradient that is opaque where the type is
          and clears entirely on the right, so the two blend instead of sitting
          in separate boxes. If the file is missing the poster still renders, so
          the band never breaks. */}
      <section id="about" className="relative w-full overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-[64%]"
          aria-hidden="true"
        >
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/photos/l1960350.jpg"
          >
            {/* VP9/WebM: the same eight seconds at a quarter of the weight the
                H.264 master carried, and the audio track is gone entirely —
                this plays muted by definition, so it was 11MB of silence. */}
            <source src="/videos/about-hero.webm" type="video/webm" />
          </video>
          {/* wash the video out toward the copy: solid white at the type edge,
              clear at the far right. Vertical fades keep the band edges soft. */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent md:via-white/45" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white opacity-70" />
        </div>

        {/* the copy column tracks the heading's own width cap so the body text
            runs to the same measure as the title, and "Dynamic infrastructure."
            gets enough room to hold one line */}
        <div className="relative shell py-16 md:py-32">
          <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
            <SectionHeading
              as="h1"
              eyebrow="About"
              className="2xl:max-w-4xl"
              title={
                <>
                  Beyond solar.
                  <br />
                  <span className="text-teal-brand">Dynamic infrastructure.</span>
                </>
              }
            />
            <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-600 md:text-base">
              <p>
                Teask, Tenaga Alam Sekitar Kita, the energy of the nature around us, was founded to
                preserve our planet's resources: addressing environmental damage, resource scarcity
                and rising costs with innovative, sustainable solutions.
              </p>
              <p>
                The work is rapidly deployable, decentralised energy infrastructure: portable solar
                stations, modular microgrids, storage and smart-grid systems that go live in under
                30 minutes, with or without the national grid. The latest battery and charger reach
                80% charge in three minutes at 7.4 kW, and each station is engineered toward a
                future of VPPA-enabled services and local energy trading.
              </p>
              <p>
                The point was never solar charging. It is energy delivered wherever conventional
                infrastructure is slow, absent or too expensive.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Story />
      {/* ── band 4 · the founders (paper) ── */}
      <section
        className="relative w-full bg-paper pt-8 pb-24 md:pt-10 md:pb-32"
        aria-label="Leadership"
      >
        <div className="shell">
          <SectionHeading
            eyebrow="Leadership"
            title={
              <>
                Meet the people
                <br />
                <span className="text-teal-brand">behind Teask.</span>
              </>
            }
          />
          {/* ── desktop · the banded row ──────────────────────────────────
              Read off the reference: each figure is WIDER than its own block
              and laps over its neighbours, the crown breaks the top edge, and
              what is tucked in is the BOTTOM — the photograph's crop and the
              block's floor share one baseline, so nothing hangs below the
              colour and no bare band of colour shows under a cut-off body.

              So the portrait is sized off the row's HEIGHT (93% of it), which
              makes it about 1.21x its own column, and pinned to bottom-0 with
              the block. The block starts at 20% while the crown lands at 12.9%,
              leaving seven points of head — and nothing else — above the colour.

              The row itself is given an ASPECT rather than a fixed height. With
              a fixed height the figure's width would track the row while the
              column's width tracked the viewport, so the overlap would swing
              from slight at 1440 to enormous at 900. On an aspect the two scale
              together and the overlap holds steady at every width.

              That aspect is also the dial for how much of a figure its caption
              covers. The caption's height is set by its copy, so a taller row
              does not grow it — it only grows the portrait underneath. Raising
              the bio to a readable 14px pushed coverage to 49%; 26→29 brought
              it back to 44 without touching the type.

              Four equal panels, everything on show. There is no hover state:
              no expanding panel, nothing held back behind a reveal, so no
              active index and no interaction to discover. Each card carries its
              own name, role and bio permanently.

              That also settles the bio's width, which used to have to be pinned
              in px so it would not re-wrap on every frame of a resize. Nothing
              resizes now, so it simply sets to the column. */}
          <div className="mt-16 hidden aspect-[49/29] xl:flex">
            {LEADERSHIP.map((f) => {
              const fig = figurePlacement(FIG_H, BLOCK_TOP, f.headScale)
              return (
              <article key={f.name} className="relative h-full min-w-0 flex-1">
                <div
                  className="absolute inset-x-0 top-[20%] bottom-0"
                  style={{ clipPath: BLOCK_CLIP_FLUID, background: BLOCK_GRADIENT }}
                  aria-hidden="true"
                />
                {/* The wrapper is the panel's width and carries the tuck; the
                    portrait inside is sized off the row's HEIGHT, scaled so
                    every head reads the same size. h-full of a wrapper that
                    starts at fig.top is what pins the crop to the block's floor
                    and the crown above its top edge. */}
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{ top: fig.top, clipPath: fig.clip }}
                >
                  <img
                    src={f.image}
                    alt={`Portrait of ${f.name}, ${f.role}`}
                    loading="lazy"
                    style={{
                      transform: `translateX(calc(-50% + ${headShift(f.headCentre)}% + ${LEAN_PX / 2}px))`,
                    }}
                    className="absolute bottom-0 left-1/2 h-full w-auto max-w-none object-contain object-bottom contrast-[1.08]"
                  />
                </div>

                {/* Scrim + caption on a box with the SAME geometry as the block,
                    so the two rakes line up. Clipping the caption's own short
                    box instead makes the slant far steeper, because a polygon
                    leans by a proportion of its box however tall it is. Padding
                    is LEAN_PX plus a margin, in px for the same reason the clip
                    is — it has to clear the rake, not a share of the column. */}
                <div
                  className="absolute inset-x-0 top-[20%] bottom-0 z-10"
                  style={{ clipPath: BLOCK_CLIP_FLUID }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 flex flex-col items-start bg-gradient-to-t from-navy-950 from-30% via-navy-950/85 to-transparent pt-8 pb-7"
                    style={{ paddingLeft: CAPTION_PAD, paddingRight: CAPTION_PAD }}
                  >
                    {/* Two lines reserved. The caption is anchored to the floor,
                        so anything that changes its height moves its TOP edge —
                        and one name wrapping to a second line dropped that
                        card's scrim 22px below its neighbours'. Reserving the
                        pair levels the row. */}
                    <h3 className="min-h-[2.8125rem] font-display text-lg leading-tight font-medium text-white">
                      {f.name}
                    </h3>
                    <div className="mt-2 font-mono text-[11px] tracking-[0.16em] text-teal-brand uppercase">
                      {f.role}
                    </div>
                    {/* 14px. It was 12, which is a caption size, not a reading
                        size, and this is a paragraph someone is meant to read.
                        The looser 1.625 leading went with it — at 14px that
                        bought height without buying legibility, and height here
                        is portrait covered. 1.5 holds the measure comfortably. */}
                    <p className="mt-2 text-[14px] leading-normal text-white/85">{f.bio}</p>
                  </div>
                </div>
              </article>
              )
            })}
          </div>

          {/* ── phone and mid-width · captions on the paper ────────────────
              The overlay row above only works once a column is wide enough for
              the bio to set in a few lines. Measured: at a 260px column the
              open panel covers 42-49% of the figure, but at 180px the same bio
              wraps far enough to cover the whole person. So the overlay is held
              back to xl, and every width below it gets the same blocks with the
              copy simply underneath, always open — which is also what a phone
              needs, having no hover to reveal anything with. */}
          {/* tighter rows on a phone: with the bio gone each card is a third
              shorter, and a 40px gutter that suited the taller card leaves the
              two rows looking unmoored from each other */}
          <div className="mt-8 grid grid-cols-2 gap-x-1 gap-y-7 md:grid-cols-4 md:gap-y-10 xl:hidden">
            {LEADERSHIP.map((f) => {
              const fig = figurePlacementGrid(f.headScale)
              return (
              <article key={f.name} className="relative">
                {/* Same rules as the desktop row — crop tucked into the block's
                    floor, crown clear of the top edge, face centred on the
                    block, heads levelled to one size — but sized to sit just
                    inside the column rather than lapping over it: at two up the
                    neighbour is close enough that an overflowing shoulder would
                    run into the next portrait rather than over a block. */}
                <div className="relative aspect-[4/5]">
                  {/* The rake runs at every width, phone included. It costs
                      nothing to keep: the lean is a proportion of the column
                      and the block's height is a proportion of the panel, so
                      the ANGLE is the same at 166px as it is at 300px — a
                      narrow column does not steepen it. */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      top: `${BLOCK_TOP_GRID}%`,
                      background: BLOCK_GRADIENT,
                      clipPath: BLOCK_CLIP,
                    }}
                    aria-hidden="true"
                  />
                  {/* clipped on the wrapper, not the image: the image carries a
                      translate to centre the face, and a clip on the image
                      itself would slide along with it */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{ top: fig.top, clipPath: fig.clip }}
                  >
                    <img
                      src={f.image}
                      alt={`Portrait of ${f.name}, ${f.role}`}
                      loading="lazy"
                      style={{
                        transform: `translateX(calc(-50% + ${(
                          headShift(f.headCentre) + RAKE_SHIFT_GRID
                        ).toFixed(2)}%))`,
                      }}
                      className="absolute bottom-0 left-1/2 h-full w-auto max-w-none object-contain object-bottom contrast-[1.08]"
                    />
                  </div>
                </div>
                {/* Names and roles wrap to different line counts, so from md up
                    each reserves two lines — that is what keeps the BIOS on a
                    level baseline across the row.

                    On a phone the bio is hidden, so those reservations have
                    nothing left to align and only leave the role stranded ~24px
                    under a one-line name. Dropped there: the role sits straight
                    under the name and the card reads as one block. */}
                <div className="mt-3 md:mt-4">
                  <h3 className="text-[13px] leading-tight font-bold text-navy-950 md:min-h-[2.5rem]">
                    {f.name}
                  </h3>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-blue-brand uppercase md:mt-1.5 md:min-h-[1.75rem] md:tracking-[0.14em]">
                    {f.role}
                  </div>
                  {/* Hidden on a phone: at two up the bio sets to about 24
                      characters a line, so a clamped four lines says little and
                      costs a lot of column. Name and role carry the card there;
                      the bio returns from md where there is width for it. */}
                  <p className="mt-2 hidden line-clamp-4 text-[11px] leading-snug text-navy-800/80 md:block">
                    {f.bio}
                  </p>
                </div>
              </article>
              )
            })}
          </div>
        </div>
      </section>

      <Values />

      {/* ── band 5 · the record (white) ── */}
      <section className="relative w-full bg-white py-16 md:py-32" aria-label="The record">
        <div className="shell">
          <SectionHeading
            eyebrow="The record"
            title={
              <>
                Grounded,
                <br />
                <span className="text-teal-brand">and provable.</span>
              </>
            }
          />
          {/* every milestone on screen at once, alternating above and below the
              axis; hovering one scales it up in place. Replaces the carousel,
              which hid half the record behind a scroll. */}
          <RecordTimeline items={RECORD} />
        </div>
      </section>
    </>
  )
}
