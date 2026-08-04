/**
 * Official Teask wordmark, taken from teask.asia (Teask-Logo-1.png, 208x53).
 *
 * That PNG is the only artwork Teask publishes, there is no vector version on
 * the site. 208x53 is comfortable up to ~110px wide (roughly 2x for a 28px-tall
 * nav lockup) but goes soft when rendered large, which is why the intro pairs a
 * vector diamond with the wordmark at close to native size rather than scaling
 * the PNG up. Drop in an SVG when Teask supplies one and this file is the only
 * place that changes.
 */

import type { CSSProperties } from 'react'

interface LogoProps {
  className?: string
  /**
   * rendered height in px. The source PNG is only 208x53, so ~28 is the last
   * size that still has 2x pixels behind it; beyond that it softens on retina.
   * The nav deliberately runs at 38 for prominence, swap in an SVG to fix.
   */
  height?: number
  /** overlay a live 3D spinning diamond over the wordmark's "A" */
  animated?: boolean
}

// the client's final wordmark (2835×789, transparent), crisp at any nav size
const MARK = '/brand/teask-logo-hd.png'
const RATIO = 2835 / 789
const maskBase: CSSProperties = {
  position: 'absolute',
  inset: 0,
  WebkitMaskImage: `url(${MARK})`,
  maskImage: `url(${MARK})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'left center',
  maskPosition: 'left center',
}

/**
 * The wordmark rebuilt as a metallic 3D lockup: the PNG is used only as a mask,
 * so the letters are filled with a brushed-metal gradient (with a dark extrude
 * shadow behind for depth) and a specular glint sweeps across on a loop. The
 * diamond in the "A" is the live spinning 3D gem.
 */
export default function Logo({ className = '', height = 26, animated = false }: LogoProps) {
  const width = RATIO * height

  // static (footer, etc.) keeps the plain crisp PNG
  if (!animated) {
    return (
      <img
        src={MARK}
        alt="Teask"
        width={width}
        height={height}
        style={{ height, width: 'auto', display: 'block' }}
        className={className}
      />
    )
  }

  return (
    <span
      className={`relative inline-block ${className}`}
      style={{ width, height }}
      role="img"
      aria-label="Teask"
    >
      {/* extrude shadow, a dark copy nudged down/right for depth */}
      <span
        aria-hidden="true"
        style={{ ...maskBase, background: '#060c18', transform: 'translate(1px, 1.5px)' }}
      />
      {/* brushed-metal fill */}
      <span
        aria-hidden="true"
        style={{
          ...maskBase,
          background:
            'linear-gradient(178deg, #ffffff 0%, #cfd9ea 38%, #ffffff 52%, #a9b8d2 78%, #dbe4f2 100%)',
        }}
      />
      {/* sweeping specular glint, clipped to the letters */}
      <span
        aria-hidden="true"
        style={{
          ...maskBase,
          background:
            'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.95) 49%, rgba(180,225,255,0.9) 51%, transparent 60%)',
          backgroundSize: '250% 100%',
          backgroundRepeat: 'no-repeat',
          animation: 'logo-shine 5s ease-in-out infinite',
        }}
      />
      {/* the live 3D diamond in the "A" */}
      <SpinningDiamond
        size={height * 0.34}
        style={{
          position: 'absolute',
          left: width * 0.475,
          top: height * 0.52,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </span>
  )
}

/**
 * The brand diamond as a lightweight 3D gem: two rhombus facets set at right
 * angles and spun on the vertical axis. One facet is always presenting width,
 * so it reads as a solid rotating diamond rather than a flipping card.
 */
export function SpinningDiamond({ size = 12, style }: { size?: number; style?: CSSProperties }) {
  const height = size * 1.55
  const face: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg,#8FEFFA 0%,#3FC9F0 30%,#2E7FE0 55%,#1E48C8 80%,#5AA9EA 100%)',
    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  }
  return (
    <span
      style={{ display: 'inline-block', width: size, height, perspective: 90, ...style }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          animation: 'gem-spin 4.5s linear infinite',
        }}
      >
        <span style={face} />
        <span style={{ ...face, transform: 'rotateY(90deg)' }} />
      </span>
    </span>
  )
}

/**
 * The diamond from the logo's "A", redrawn as vector so it can be used large
 * (intro, section marks) and animated without resolution loss.
 */
export function TeaskDiamond({
  className,
  id = 'teask-diamond',
}: {
  className?: string
  id?: string
}) {
  return (
    <svg viewBox="0 0 40 80" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5AA9EA" />
          <stop offset="0.44" stopColor="#1E48C8" />
          <stop offset="0.5" stopColor="#2E7FE0" />
          <stop offset="0.74" stopColor="#3FC9F0" />
          <stop offset="1" stopColor="#8FEFFA" />
        </linearGradient>
      </defs>
      <path d="M20 0 L40 40 L20 80 L0 40 Z" fill={`url(#${id})`} />
    </svg>
  )
}
