import { useEffect, useRef } from 'react'
import { OVERLAY_EVENT } from '../lib/overlay'

interface Particle {
  x: number
  y: number
  r: number
  baseAlpha: number
  vy: number
  swayAmp: number
  swayFreq: number
  swayPhase: number
  twinkleFreq: number
  twinklePhase: number
  color: string
  depth: number
}

// teal, pale blue, white, matches the brand palette in index.css
// dust motes tuned for the light theme: teal, brand blue and deep navy ink
const COLORS = ['59, 177, 227', '0, 132, 214', '34, 49, 99']

function makeParticles(w: number, h: number): Particle[] {
  const density = w < 768 ? 30000 : 21000
  const count = Math.min(90, Math.round((w * h) / density))
  return Array.from({ length: count }, () => {
    const depth = Math.random()
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + depth * 1.3,
      baseAlpha: 0.06 + depth * 0.2,
      vy: 6 + depth * 14,
      swayAmp: 5 + Math.random() * 14,
      swayFreq: 0.25 + Math.random() * 0.5,
      swayPhase: Math.random() * Math.PI * 2,
      twinkleFreq: 0.9 + Math.random() * 1.4,
      twinklePhase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      depth,
    }
  })
}

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Particle[] = []
    let raf = 0
    let last = performance.now()
    let elapsed = 0
    // pointer parallax, heavily damped so it reads as depth, not tracking
    let targetMx = 0
    let targetMy = 0
    let mx = 0
    let my = 0

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = makeParticles(window.innerWidth, window.innerHeight)
    }

    const drawFrame = (dt: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      elapsed += dt
      mx += (targetMx - mx) * 0.03
      my += (targetMy - my) * 0.03

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (const p of particles) {
        p.y -= p.vy * dt
        if (p.y < -12) {
          p.y = h + 12
          p.x = Math.random() * w
        }
        const x =
          p.x +
          Math.sin(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp +
          mx * p.depth * 12
        const y = p.y + my * p.depth * 8
        const twinkle = 0.65 + 0.35 * Math.sin(elapsed * p.twinkleFreq + p.twinklePhase)
        const alpha = p.baseAlpha * twinkle

        // soft halo behind each dot
        ctx.fillStyle = `rgba(${p.color}, ${alpha * 0.22})`
        ctx.beginPath()
        ctx.arc(x, y, p.r * 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${p.color}, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      drawFrame(dt)
      raf = requestAnimationFrame(loop)
    }

    /**
     * Held while something opaque is covering the viewport — in practice the
     * hero's opening descent, which paints over the whole screen for seven
     * seconds.
     *
     * Not a micro-optimisation: this is a full-viewport 2D canvas clearing and
     * compositing ~180 arcs per frame on the main thread, and during the
     * descent not one of those pixels can be seen. It was competing for frames
     * with the animation hiding it.
     */
    let covered = false

    const start = () => {
      cancelAnimationFrame(raf)
      raf = 0
      resize()
      // paint immediately, rAF may not fire for a while (hidden/background tab)
      drawFrame(0)
      if (!reducedMotion.matches && !covered) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }

    const onOverlay = (e: Event) => {
      const next = !!(e as CustomEvent<boolean>).detail
      if (next === covered) return
      covered = next
      cancelAnimationFrame(raf)
      raf = 0
      if (!covered && !reducedMotion.matches) {
        // resume from now, so the held seconds do not arrive as one jump
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      targetMx = (e.clientX / window.innerWidth) * 2 - 1
      targetMy = (e.clientY / window.innerHeight) * 2 - 1
    }

    start()
    window.addEventListener('resize', start)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener(OVERLAY_EVENT, onOverlay)
    reducedMotion.addEventListener('change', start)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', start)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener(OVERLAY_EVENT, onOverlay)
      reducedMotion.removeEventListener('change', start)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30"
    />
  )
}
