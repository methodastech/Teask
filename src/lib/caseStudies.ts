/**
 * Deployment case studies.
 *
 * Rule for this file: **nothing here is invented.** Every sentence below is
 * either a fact the site already publishes (the product specs, the "Malaysia's
 * first" claim, the DPULZE deployment) or a framing of the problem the product
 * is sold against. Anything that would need the client's sign-off — headline
 * numbers, dates, named quotes — is left empty and listed in `pending`, and the
 * page simply does not render those blocks until they are filled.
 *
 * A case study with plausible-looking invented metrics is worse than no case
 * study: it is the document a prospect will quote back at you, and the one a
 * client will ask where the number came from.
 */
export interface CaseStudy {
  slug: string
  client: string
  location: string
  sector: string
  badge?: string
  /** one-line summary used on the card and in meta description */
  summary: string
  hero: { image: string; alt: string }
  /** headline outcomes. Rendered only when non-empty — see the rule above. */
  metrics: { value: string; label: string }[]
  challenge: { heading: string; body: string[] }
  solution: { heading: string; body: string[] }
  outcome: { heading: string; body: string[] }
  /** client testimonial. Rendered only when present. */
  quote?: { text: string; name: string; role: string }
  /** what Teask still needs to supply before this is a complete case study */
  pending: string[]
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'dpulze-cyberjaya',
    client: 'DPULZE Shopping Centre',
    location: 'Cyberjaya, Selangor',
    sector: 'Retail & mixed-use',
    badge: 'Malaysia’s first T Station',
    summary:
      'Malaysia’s first portable solar EV and e-motorcycle charging station, deployed in a working shopping centre car park without trenching, a substation or a grid upgrade.',
    hero: {
      image:
        'https://d2ol7oe51mr4n9.cloudfront.net/user_3FP46Emobin1BeouoYpzom4YJCr/897e4763-ec01-42ac-8b44-f3b57b68ad16.jpg',
      alt: 'The T Station installed at DPULZE Shopping Centre in Cyberjaya, sheltering electric motorcycles.',
    },

    // Left deliberately empty. See `pending`.
    metrics: [],

    challenge: {
      heading: 'The problem: charging demand arrives faster than grid capacity',
      body: [
        'Cyberjaya concentrates exactly the demand that electrification creates first: delivery riders clustering around food and retail at peak hours, campus traffic, and a tenant mix that increasingly expects charging on site. The vehicles arrived before the infrastructure did.',
        'The conventional answer is a fixed charger fed by a grid upgrade, and that answer is slow and expensive. Adding capacity to a live retail site means an application queue, civil works across a trading car park, and a capital commitment that is bolted to one location for its whole life. For a shopping centre, the disruption lands on the tenants and the shoppers before a single vehicle is charged.',
        'It also assumes the demand stays exactly where you predicted. If rider routes shift or the tenant mix changes, a trenched-in charger cannot follow.',
      ],
    },

    solution: {
      heading: 'The intervention: a station that installs like equipment, not construction',
      body: [
        'Teask deployed a T Station into two standard parking bays. Because the unit carries its own generation and storage, and stands on a levelling base, the installation required no trenching, no substation and no civil works. The site did not have to be dug up, and the car park did not have to close around it.',
        'The unit arrives already charged and reaches operation in under 30 minutes, so the deployment fits inside a normal trading day rather than a construction programme. Bifacial PV on the dual-pitch canopy generates on site, an on-board battery buffers that generation so charging continues after dark, and a smart-grid controller balances draw and load.',
        'The canopy does double duty: it shelters the bays it stands on, which for two-wheelers is a real amenity in Malaysian weather rather than a styling detail.',
      ],
    },

    outcome: {
      heading: 'The outcome: first of its kind, and relocatable',
      body: [
        'The station went live as Malaysia’s first portable solar EV and e-motorcycle charging station, serving EVs and e-motorcycles across six simultaneous charge points. On supported e-motorcycle platforms, Teask’s fast-charging system reaches 80% in about three minutes at 7.4 kW, fast enough that a stop behaves like refuelling rather than parking, which is the difference that matters to a rider earning per delivery.',
        'Because nothing was trenched in, the commercial risk profile is different from a fixed installation: the asset remains relocatable. If demand moves, the station moves with it, and the car park returns to two ordinary parking bays.',
        'The deployment is now the reference case for the same pattern at other malls, campuses and fleet hubs.',
      ],
    },

    // No quote until a named person at DPULZE has approved one.
    quote: undefined,

    pending: [
      'Go-live date (month and year)',
      'Headline numbers: charging sessions to date, kWh delivered, vehicles or riders served',
      'Uptime or availability figure since commissioning',
      'Actual install duration on the day, if it was recorded',
      'CO₂ avoided, if you want a sustainability metric',
      'A named quote from DPULZE (name + role) with their sign-off',
      'Confirmation that DPULZE is happy to be named in a public case study',
    ],
  },
]

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug)
