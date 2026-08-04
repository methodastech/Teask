import { motion } from 'framer-motion'
import { Check, Construction, HardHat, Moon, Move, PlugZap, Sun, Timer, X, type LucideIcon } from 'lucide-react'
import HouseIcon from './HouseIcon'
import { EASE, SectionHeading } from './Section'

/**
 * The comparison the whole business case rests on.
 *
 * Structured so it can be read at a glance rather than parsed: every criterion
 * carries an icon so the rows are identifiable without reading, the Teask
 * column is lifted into a highlighted panel with its own border and header
 * badge, and the verdict marks are opposed (filled teal tick vs hollow grey
 * cross) instead of the near-identical tick/dash that made all three columns
 * scan the same weight.
 *
 * Only the Teask column states specifics: those are Teask's own published
 * figures. The other two describe the shape of each alternative rather than
 * inventing numbers for third-party infrastructure we cannot evidence.
 */
type Row = {
  icon: LucideIcon
  label: string
  teask: string
  grid: string
  fixed: string
}

const ROWS: Row[] = [
  {
    icon: Timer,
    label: 'Time to first charge',
    teask: 'Under 30 minutes',
    grid: 'Permits, then civil works',
    fixed: 'Install plus supply upgrade',
  },
  {
    icon: HardHat,
    label: 'Civil works',
    teask: 'None, no trenching',
    grid: 'Trenching and reinstatement',
    fixed: 'Groundworks and cabling',
  },
  {
    icon: PlugZap,
    label: 'Grid connection',
    teask: 'Optional, runs standalone',
    grid: 'Required',
    fixed: 'Required',
  },
  {
    icon: Sun,
    label: 'Generates its own energy',
    teask: 'Bifacial solar canopy',
    grid: 'No',
    fixed: 'No',
  },
  {
    icon: Moon,
    label: 'Works after dark',
    teask: 'On-board battery buffer',
    grid: 'Grid supplied',
    fixed: 'Grid supplied',
  },
  {
    icon: Move,
    label: 'If demand moves',
    teask: 'Relocates with it',
    grid: 'Stranded asset',
    fixed: 'Stranded asset',
  },
  {
    icon: Construction,
    label: 'Disruption to the site',
    teask: 'Two parking bays',
    grid: 'Car park works',
    fixed: 'Bay closure during install',
  },
]

/** `compact` shrinks the mark and the text for the stacked phone layout, where
 *  the value shares its row with a label and has ~200px to sit in */
type MarkProps = { children: string; compact?: boolean }

/** the winning mark: solid, brand-coloured, unmistakably positive */
function Yes({ children, compact }: MarkProps) {
  return (
    <span className={`flex items-start ${compact ? 'gap-2' : 'gap-2.5'}`}>
      <span
        className={`mt-px grid shrink-0 place-items-center rounded-full bg-teal-brand text-white ${
          compact ? 'h-4 w-4' : 'h-5 w-5'
        }`}
      >
        <Check size={compact ? 10 : 12} strokeWidth={3} aria-hidden="true" />
      </span>
      <span className={`font-semibold text-navy-950 ${compact ? 'text-[13px] leading-snug' : 'text-base'}`}>
        {children}
      </span>
    </span>
  )
}

/** the losing mark: hollow, grey, visibly the opposite shape */
function No({ children, compact }: MarkProps) {
  return (
    <span className={`flex items-start ${compact ? 'gap-2' : 'gap-2.5'}`}>
      <span
        className={`mt-px grid shrink-0 place-items-center rounded-full border border-gray-300 text-gray-400 ${
          compact ? 'h-4 w-4' : 'h-5 w-5'
        }`}
      >
        <X size={compact ? 9 : 11} strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className={`text-gray-500 ${compact ? 'text-[13px] leading-snug' : 'text-base'}`}>{children}</span>
    </span>
  )
}

export default function Comparison() {
  return (
    <section
      id="comparison"
      className="relative w-full bg-white py-16 md:py-32"
      aria-label="How the T Station compares"
    >
      <div className="shell">
        <SectionHeading
          eyebrow="The alternative"
          title={
            <>
              Against the
              <br />
              <span className="text-teal-brand">conventional answer.</span>
            </>
          }
          intro="Adding charging usually means extending the grid or bolting in a fixed charger. Both are slow, both need digging, and both stay where you put them."
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-14"
        >
          {/* Phone: the four-column table is 832px wide, so it could only be read
              by swiping — and the criterion column scrolled away with it, leaving
              three columns of ticks with nothing to label them. Below sm each
              criterion becomes its own block instead, read top to bottom. */}
          <div className="space-y-3 sm:hidden">
            {ROWS.map(({ icon: Icon, label, teask, grid, fixed }) => (
              <div key={label} className="border border-navy-950/10">
                <div className="flex items-center gap-2.5 border-b border-navy-950/10 bg-navy-950/[0.02] px-3.5 py-2">
                  <HouseIcon icon={Icon} size={18} />
                  <span className="text-[15px] font-semibold text-navy-950">{label}</span>
                </div>
                <div className="divide-y divide-navy-950/[0.07]">
                  <div className="flex items-start gap-3 border-l-2 border-l-teal-brand bg-teal-brand/[0.07] px-3.5 py-2">
                    <span className="w-[72px] shrink-0 pt-0.5 font-mono text-[9px] leading-[1.5] tracking-[0.12em] text-teal-brand uppercase">
                      T Station
                    </span>
                    <Yes compact>{teask}</Yes>
                  </div>
                  <div className="flex items-start gap-3 px-3.5 py-2">
                    <span className="w-[72px] shrink-0 pt-0.5 font-mono text-[9px] leading-[1.5] tracking-[0.12em] text-gray-500 uppercase">
                      Grid ext.
                    </span>
                    <No compact>{grid}</No>
                  </div>
                  <div className="flex items-start gap-3 px-3.5 py-2">
                    <span className="w-[72px] shrink-0 pt-0.5 font-mono text-[9px] leading-[1.5] tracking-[0.12em] text-gray-500 uppercase">
                      Fixed
                    </span>
                    <No compact>{fixed}</No>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* sm and up keeps the real table; it still scrolls on a narrow tablet */}
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">
              Teask T Station compared with grid extension and fixed chargers
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-[26%] pb-4">
                  <span className="sr-only">Criterion</span>
                </th>
                {/* the recommended column: bordered, tinted, badged */}
                <th
                  scope="col"
                  className="w-[26%] rounded-t-lg border-x border-t border-teal-brand/30 bg-teal-brand/[0.07] px-6 pt-5 pb-4 align-bottom"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-brand px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.15em] text-white uppercase">
                    Teask
                  </span>
                  <span className="mt-3 block font-display text-xl font-medium tracking-normal text-navy-950">
                    T Station
                  </span>
                </th>
                <th scope="col" className="w-[24%] px-6 pt-5 pb-4 align-bottom">
                  <span className="font-display text-lg font-medium tracking-normal text-gray-500">
                    Grid extension
                  </span>
                </th>
                <th scope="col" className="w-[24%] px-6 pt-5 pb-4 align-bottom">
                  <span className="font-display text-lg font-medium tracking-normal text-gray-500">
                    Fixed charger
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ icon: Icon, label, teask, grid, fixed }, i) => {
                const last = i === ROWS.length - 1
                return (
                  <tr key={label} className="group/row align-top">
                    <th
                      scope="row"
                      className="border-t border-navy-950/10 py-5 pr-6 transition-colors group-hover/row:bg-navy-950/[0.02]"
                    >
                      <span className="flex items-center gap-3">
                        <HouseIcon icon={Icon} size={22} />
                        <span className="text-base font-semibold text-navy-950">{label}</span>
                      </span>
                    </th>
                    <td
                      className={`border-x border-t border-teal-brand/30 bg-teal-brand/[0.07] px-6 py-5 ${
                        last ? 'rounded-b-lg border-b' : ''
                      }`}
                    >
                      <Yes>{teask}</Yes>
                    </td>
                    <td className="border-t border-navy-950/10 px-6 py-5 transition-colors group-hover/row:bg-navy-950/[0.02]">
                      <No>{grid}</No>
                    </td>
                    <td className="border-t border-navy-950/10 px-6 py-5 transition-colors group-hover/row:bg-navy-950/[0.02]">
                      <No>{fixed}</No>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
