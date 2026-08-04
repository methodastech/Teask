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
const LEADERSHIP: { name: string; role: string; bio: string; image: string }[] = [
  {
    name: 'James Anthony Tan',
    role: 'Co-Founder · Chief Executive Officer',
    bio: 'Honorary Captain and Guinness World Record holder (2013): the youngest person, and the first Malaysian, to circumnavigate the world solo by aircraft. James leads vision, strategic partnerships, technology commercialisation and long-term growth.',
    image: '/images/founders/james-anthony-tan.png',
  },
  {
    name: 'Kiu Yik Khong',
    role: 'Co-Founder · Chief Operating Officer',
    bio: 'Formerly business development at a Japanese M&A multinational and commercial lead in agriculture. Khong leads operations, business development and commercial execution, overseeing the deployment and scaling of every station.',
    image: '/images/founders/kiu-yik-khong.png',
  },
  {
    name: 'Alexchandar Anbalagan',
    role: 'Chief Strategy Officer',
    bio: 'Over 20 years in strategy, finance, governance, enterprise risk and internal audit with Global Fashion Group, Rolls-Royce, DHL Supply Chain, Chubb and KPMG across Asia Pacific. FCCA, Certified Internal Auditor and an Oxford Executive Leadership alumnus.',
    image: '/images/founders/alexchandar-anbalagan.png',
  },
  {
    name: 'Ts. Mohammad Nazri Mizayauddin',
    role: 'Advisor · Governance & Sustainability',
    bio: 'Formerly Chief Strategy Officer at SEDA Malaysia, with over 25 years in corporate strategy, renewable energy, ESG and investment. Director of SUS Environment (Shanghai) and a national ExCo member of the IEA Photovoltaic Power Systems Programme.',
    image: '/images/founders/mohammad-nazri-mizayauddin.png',
  },
]

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
          {/* Portrait cards: the photograph is the card, the name always reads,
              and the role and bio are held back until you ask for them. Kept to
              two across on a phone so the cards stay big enough to read, four
              across from md. No width cap: four is exactly the row, so letting
              it run the full shell gives ~318px cards at 1440 and ~366px at 2K
              rather than stranding half the band in empty paper. */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:mt-16 md:grid-cols-4 md:gap-6">
            {LEADERSHIP.map((f) => (
              /**
               * tabIndex + focus-within, not just hover: a touch screen has no
               * hover, and a tap on a focusable element gives it focus — so the
               * same rule that serves the mouse reveals the bio on a phone and
               * to a keyboard, with no state and no separate mobile control.
               */
              <article
                key={f.name}
                tabIndex={0}
                className="group relative aspect-[3/4] overflow-hidden bg-teal-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-950"
              >
                <img
                  src={f.image}
                  alt={`Portrait of ${f.name}, ${f.role}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-within:scale-[1.04]"
                />
                {/* resting scrim, only deep enough to carry the name. Deep teal
                    rather than navy so it reads as the card darkening into
                    itself, not a separate band laid over the top. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-teal-deep via-teal-deep/70 to-transparent" />
                {/* on reveal the whole frame darkens, so the bio has something
                    even to sit on rather than fighting the photograph */}
                <div className="pointer-events-none absolute inset-0 bg-teal-deep/0 transition-colors duration-500 ease-out group-hover:bg-teal-deep/85 group-focus-within:bg-teal-deep/85" />

                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6">
                  <h3 className="text-[13px] leading-tight font-bold text-white sm:text-xl">
                    {f.name}
                  </h3>
                  {/* 0fr to 1fr animates to the copy's own height. A max-height
                      transition would need a guessed ceiling, which either
                      clips the longer bio or eases against dead space. */}
                  <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      {/* white, not teal-brand: the accent that reads on navy
                          elsewhere on the site drops to ~3.9:1 once the surface
                          under it is teal too, which is under AA at this size */}
                      <div className="mt-1.5 font-mono text-[9px] tracking-[0.14em] text-white/75 uppercase sm:mt-2 sm:text-[11px] sm:tracking-[0.2em]">
                        {f.role}
                      </div>
                      {/* Clamped at every width, not just the phone. The card
                          is overflow-hidden, so a bio longer than the portrait
                          does not spill — it gets silently sliced off the top.
                          A clamp fails visibly instead, and 9 lines is what a
                          318px card has room for once the name and role are in. */}
                      <p className="mt-1.5 line-clamp-5 text-[11px] leading-snug text-white/80 sm:mt-2 sm:line-clamp-9 sm:text-sm sm:leading-relaxed">
                        {f.bio}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
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
