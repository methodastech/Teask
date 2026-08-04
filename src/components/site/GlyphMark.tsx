/**
 * GlyphMark — the house icon set.
 *
 * Thin, solid line-art marks (uniform stroke, round caps, monochrome) in the
 * spirit of the reference sheet, but each mark is drawn to READ as its concept:
 * a sun for solar, a battery for storage, a network for the grid, and so on.
 * Rendered light on a flat dark tile so the linework stays crisp on any
 * section background.
 */

export type MarkName =
  | 'solar' // solar generation — sun + rays
  | 'battery' // energy storage — battery with charge bars
  | 'network' // smart-grid controller — connected nodes
  | 'exchange' // P2P / VPPA trading — two-way arrows
  | 'bolt' // EV charging / the T Station — lightning
  | 'stack' // modular microgrid / modular — stacked layers
  | 'pulse' // smart energy layer / monitoring — waveform
  | 'plug' // grid-tied / independent — linked rings
  | 'move' // movable — four-way arrows
  | 'target' // sited by need / anywhere — target

export const MARK_NAMES: MarkName[] = [
  'solar',
  'battery',
  'network',
  'exchange',
  'bolt',
  'stack',
  'pulse',
  'plug',
  'move',
  'target',
]

const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** the geometry of each mark, drawn in a 48×48 box, stroked in currentColor */
function Shapes({ name, sw }: { name: MarkName; sw: number }) {
  switch (name) {
    case 'solar':
      return (
        <g {...S} strokeWidth={sw}>
          <circle cx="24" cy="24" r="6" />
          <g className="gmk-anim gmk-solar">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6
              const r1 = 9.5
              const r2 = 15
              return (
                <line
                  key={i}
                  x1={24 + r1 * Math.cos(a)}
                  y1={24 + r1 * Math.sin(a)}
                  x2={24 + r2 * Math.cos(a)}
                  y2={24 + r2 * Math.sin(a)}
                />
              )
            })}
          </g>
        </g>
      )
    case 'battery':
      return (
        <g {...S} strokeWidth={sw}>
          <rect x="8" y="16" width="28" height="16" rx="3" />
          <line x1="39" y1="21" x2="39" y2="27" strokeWidth={sw + 1} />
          <line x1="15" y1="20" x2="15" y2="28" className="gmk-bar" style={{ animationDelay: '0s' }} />
          <line x1="21" y1="20" x2="21" y2="28" className="gmk-bar" style={{ animationDelay: '0.3s' }} />
          <line x1="27" y1="20" x2="27" y2="28" className="gmk-bar" style={{ animationDelay: '0.6s' }} />
        </g>
      )
    case 'network': {
      const nodes = [
        [13, 13],
        [35, 13],
        [13, 35],
        [35, 35],
      ]
      return (
        <g {...S} strokeWidth={sw}>
          {/* mesh: square edges + diagonals through the hub */}
          <rect x="13" y="13" width="22" height="22" rx="1.5" />
          <line x1="13" y1="13" x2="35" y2="35" />
          <line x1="35" y1="13" x2="13" y2="35" />
          <circle cx="24" cy="24" r="3.6" fill="currentColor" stroke="none" />
          {nodes.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.2"
              fill="currentColor"
              stroke="none"
              className="gmk-anim gmk-node"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </g>
      )
    }
    case 'exchange':
      return (
        <g {...S} strokeWidth={sw}>
          <g className="gmk-arrow-r">
            <line x1="12" y1="19" x2="34" y2="19" />
            <polyline points="30,15 34,19 30,23" />
          </g>
          <g className="gmk-arrow-l">
            <line x1="36" y1="29" x2="14" y2="29" />
            <polyline points="18,25 14,29 18,33" />
          </g>
        </g>
      )
    case 'bolt':
      return (
        <g {...S} strokeWidth={sw}>
          <path className="gmk-anim gmk-bolt" d="M26 8 L14 27 L22 27 L20 40 L34 20 L26 20 Z" />
        </g>
      )
    case 'stack': {
      const rhombus = (cy: number) => `24,${cy - 6.5} 37,${cy} 24,${cy + 6.5} 11,${cy}`
      return (
        <g {...S} strokeWidth={sw}>
          <polygon points={rhombus(15)} className="gmk-layer" style={{ animationDelay: '0s' }} />
          <polygon points={rhombus(24)} className="gmk-layer" style={{ animationDelay: '0.3s' }} />
          <polygon points={rhombus(33)} className="gmk-layer" style={{ animationDelay: '0.6s' }} />
        </g>
      )
    }
    case 'pulse':
      return (
        <g {...S} strokeWidth={sw}>
          <polyline
            className="gmk-anim gmk-wave"
            points="8,24 16,24 20,14 25,34 29,20 32,24 40,24"
          />
        </g>
      )
    case 'plug':
      return (
        <g {...S} strokeWidth={sw}>
          <circle cx="19" cy="24" r="8.5" className="gmk-anim gmk-ring" style={{ animationDelay: '0s' }} />
          <circle cx="29" cy="24" r="8.5" className="gmk-anim gmk-ring" style={{ animationDelay: '1.1s' }} />
        </g>
      )
    case 'move':
      return (
        <g {...S} strokeWidth={sw} className="gmk-anim gmk-move">
          <line x1="24" y1="9" x2="24" y2="39" />
          <line x1="9" y1="24" x2="39" y2="24" />
          <polyline points="20,13 24,9 28,13" />
          <polyline points="20,35 24,39 28,35" />
          <polyline points="13,20 9,24 13,28" />
          <polyline points="35,20 39,24 35,28" />
        </g>
      )
    case 'target':
      return (
        <g {...S} strokeWidth={sw}>
          <circle cx="24" cy="24" r="13" className="gmk-anim gmk-ping" />
          <circle cx="24" cy="24" r="13" />
          <circle cx="24" cy="24" r="6.5" />
          <circle cx="24" cy="24" r="1.6" fill="currentColor" stroke="none" />
          <line x1="24" y1="6" x2="24" y2="11" />
          <line x1="24" y1="37" x2="24" y2="42" />
          <line x1="6" y1="24" x2="11" y2="24" />
          <line x1="37" y1="24" x2="42" y2="24" />
        </g>
      )
  }
}

export default function GlyphMark({
  name,
  size = 36,
  tile = false,
  className = 'text-blue-brand',
}: {
  name: MarkName
  /** outer size in px (glyph box, or tile edge when tile=true) */
  size?: number
  /** wrap in the dark tile, or render bare (default) inheriting text color */
  tile?: boolean
  /** wrapper/svg classes — set the icon colour here (default brand blue) */
  className?: string
}) {
  const glyph = size * (tile ? 0.6 : 1)

  const svg = (
    <svg
      width={glyph}
      height={glyph}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={tile ? '' : className}
      style={tile ? { color: '#e9eef7' } : undefined}
    >
      <Shapes name={name} sw={2} />
    </svg>
  )

  if (!tile) return svg

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%] bg-gradient-to-br from-navy-900 to-navy-950 shadow-[0_8px_22px_-10px_rgba(5,7,14,0.7)] ring-1 ring-inset ring-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      {svg}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28%] bg-gradient-to-b from-white/[0.08] to-transparent"
        aria-hidden="true"
      />
    </span>
  )
}
