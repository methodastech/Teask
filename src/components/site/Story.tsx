import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { EASE, SectionHeading } from './Section'

/**
 * The story · why Teask exists, in the founders' own words.
 *
 * Modelled on the IAQ About arc, which opens on origin and founder voice before
 * it says anything about product. A company that only states what it sells
 * reads as a supplier; one that says why it started reads as a business with a
 * position.
 *
 * Both quotes are the founders' own published words from teask.asia, tidied
 * only for obvious typos and sentence punctuation. Nothing here is invented.
 */
const QUOTES: { quote: string; name: string; role: string }[] = [
  {
    quote:
      'I believe that the most valuable national resource is the potential of its people. Regardless of where you come from, you can make a difference. As a population, we must move forward. Malaysia is ready. The only question is whether we are.',
    name: 'James Anthony Tan',
    role: 'Chief Executive Officer',
  },
  {
    quote:
      'The way forward for our world is to adopt a new way of living. Sustainable, affordable and green are the three components that help us achieve that goal. We provide these services to society so that no one is left behind.',
    name: 'Kiu Yik Khong',
    role: 'Chief Operating Officer',
  },
]

export default function Story() {
  const [storyOpen, setStoryOpen] = useState(false)
  return (
    <section id="story" className="relative w-full bg-white py-16 md:py-32" aria-label="The story">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-20">
          <div className="max-w-2xl">
            <SectionHeading
              eyebrow="The story"
              title={
                <>
                  Why we
                  <br />
                  <span className="text-teal-brand">started this.</span>
                </>
              }
            />
            {/* Phone opens on the first paragraph only; the other two are behind
                Read more. All three stay in the DOM at every width so the copy
                is always crawlable and always there for search — it is the
                disclosure that is conditional, not the content. */}
            <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-600 md:text-base">
              <p>
                Teask began in Cyberjaya in 2022 with a passion and an unwavering desire to make a
                positive impact for a better tomorrow. The company was founded to preserve our
                planet&rsquo;s resources, addressing environmental damage, resource scarcity and
                rising costs with innovative, sustainable solutions.
              </p>
              <div
                id="story-more"
                hidden={!storyOpen}
                className="space-y-5 md:!block"
                // `hidden` is overridden from md up by the `!block` above, so the
                // attribute only governs the phone
              >
                <p>
                  The conviction underneath it is simple: energy access should not depend on how
                  close you happen to be to a grid connection. Where infrastructure is slow, absent
                  or too expensive, people wait. That wait is what Teask was built to remove.
                </p>
                <p>
                  The ambition now runs past Malaysia. The goal is to become one of the largest and
                  most reputable affordable energy service providers in ASEAN, building an
                  interconnected energy ecosystem that enriches lives across the region.
                </p>
              </div>
            </div>

            {/* its own row, not sharing a line with anything else */}
            <button
              type="button"
              onClick={() => setStoryOpen((o) => !o)}
              aria-expanded={storyOpen}
              aria-controls="story-more"
              className="mt-4 flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-teal-brand transition-colors hover:text-blue-brand md:hidden"
            >
              {storyOpen ? 'Read less' : 'Read more'}
              <ChevronDown
                size={15}
                aria-hidden="true"
                className={`transition-transform duration-300 ${storyOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* the founders, in their own words */}
          <div className="space-y-5">
            {QUOTES.map((q, i) => (
              <motion.figure
                key={q.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
                className="border-l-2 border-teal-brand bg-paper p-7"
              >
                <blockquote className="text-sm leading-relaxed text-navy-950 md:text-base">
                  &ldquo;{q.quote}&rdquo;
                </blockquote>
                {/* No portrait here. The quote is the point, and the same four
                    faces already carry the Leadership band directly above. */}
                <figcaption className="mt-5">
                  <span className="block text-sm font-bold text-navy-950">{q.name}</span>
                  <span className="mt-0.5 block font-mono text-[10px] tracking-[0.15em] text-gray-500 uppercase">
                    {q.role}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
