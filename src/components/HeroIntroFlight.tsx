import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

/**
 * The descent: open on the sun, then fall.
 *
 * The camera only ever travels DOWN. Nothing else in the scene moves toward it,
 * so the sun climbing out of the top of the frame and the cloud decks rising
 * past the lens are both parallax against that single fall. That is what keeps
 * it reading as one continuous drop rather than a set of things sliding around
 * independently.
 *
 * Three decks. The first two only fog the shot on the way through; the third is
 * the handover — the camera enters it, the screen goes white, and the hero is
 * revealed out of the other side.
 *
 * A separate scene on its own canvas rather than the station's camera flown down
 * from altitude: the hero scene is metric (1 unit = 1 metre) and its rig is
 * tuned around the copy block and the parts panel, so borrowing it for a
 * 600-metre fall would mean unpicking all of that for four seconds of animation.
 */

const DURATION = 7000

// the fall, in world units
const Y_START = 320
const Y_END = -470
/**
 * Deck heights, passed in order on the way down.
 *
 * Not evenly spaced in DISTANCE — evenly spaced in TIME. The fall accelerates,
 * so decks at equal heights would arrive faster and faster and the descent would
 * feel like it was running out rather than opening up. Spacing them 131 / 215 /
 * 318 units apart puts the crossings at a steady ~1.75s, and the widening gaps
 * are exactly what reads as gathering speed through deepening sky.
 */
const DECKS = [150, -26, -300]
const SUN = { y: 55, z: -700 }

/** soft round falloff, for the glow */
function radialTexture(stops: [number, string][]) {
  const S = 512
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/** the corona, drawn once and simply rotated */
function rayTexture() {
  const S = 512
  const cv = document.createElement('canvas')
  cv.width = S
  cv.height = S
  const ctx = cv.getContext('2d')!
  ctx.translate(S / 2, S / 2)
  const spikes = 16
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2
    // alternate long and short so it does not read as a cog
    const len = i % 2 === 0 ? S * 0.46 : S * 0.33
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len)
    g.addColorStop(0, 'rgba(255,238,200,0.85)')
    g.addColorStop(1, 'rgba(255,200,90,0)')
    ctx.strokeStyle = g
    ctx.lineWidth = i % 2 === 0 ? 13 : 8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * S * 0.12, Math.sin(a) * S * 0.12)
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len)
    ctx.stroke()
  }
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * One cloud deck: scattered soft puffs on a transparent sheet.
 *
 * 512 and 80 puffs, not 1024 and 150. Three of these are built synchronously at
 * mount, on the same thread that is parsing the hero's model, and a radial
 * gradient fill is not cheap — the old settings meant 450 gradient fills over
 * 3 megapixels before the first frame could draw. At this size the deck is a
 * blur passing the lens at speed; the detail was never visible.
 */
function deckTexture(seed: number) {
  const W = 512
  const H = 512
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < 80; i++) {
    const x = rnd() * W
    const y = rnd() * H
    const r = 20 + rnd() * 75
    const a = 0.16 + rnd() * 0.4
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  /**
   * Feather the sheet to nothing before it reaches its own border. A deck is a
   * flat rectangle, and a flat rectangle seen near edge-on from above shows its
   * far edge as a dead-straight line running the full width of the sky — which
   * is exactly the seam. Punching a radial falloff through the alpha means the
   * cloud simply thins out into the blue, so there is no boundary left to see.
   */
  const fade = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.5)
  fade.addColorStop(0, 'rgba(0,0,0,0)')
  fade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, W, H)

  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/** sky, dark at altitude and paling toward the ground the hero opens on */
function skyTexture() {
  const cv = document.createElement('canvas')
  cv.width = 4
  cv.height = 512
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#0a2f63') // high altitude
  g.addColorStop(0.34, '#2f7ab8')
  g.addColorStop(0.62, '#9ccbe8')
  g.addColorStop(0.82, '#dbe9f3')
  g.addColorStop(1, '#f3f5f8') // the hero's own paper
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 512)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

export default function HeroIntroFlight({ onDone }: { onDone: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hazeRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: true })
    } catch {
      // no WebGL: hand over rather than showing a dead canvas
      doneRef.current()
      return
    }
    /**
     * Capped at 1.5, not the usual 2. This scene is almost pure overdraw — a sky
     * sphere, three full-screen transparent cloud decks and two additive sun
     * quads all stacked — so cost scales with pixels, not triangles, and DPR 2
     * means four times the fill of DPR 1. At 1.5 a soft gradient sky is
     * indistinguishable and the frame budget roughly halves.
     */
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
    mount.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(48, 1, 0.1, 3000)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x)
      return x
    }

    // ── sky ───────────────────────────────────────────────────────
    const sky = new Mesh(
      track(new SphereGeometry(1500, 16, 12)),
      track(new MeshBasicMaterial({ map: track(skyTexture()), side: BackSide, depthWrite: false })),
    )
    scene.add(sky)

    // ── the sun ───────────────────────────────────────────────────
    const glow = new Mesh(
      track(new PlaneGeometry(520, 520)),
      track(
        new MeshBasicMaterial({
          map: track(
            radialTexture([
              [0, 'rgba(255,255,245,1)'],
              [0.22, 'rgba(255,226,150,0.95)'],
              [0.5, 'rgba(255,178,60,0.35)'],
              [1, 'rgba(255,150,40,0)'],
            ]),
          ),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    )
    glow.position.set(0, SUN.y, SUN.z)
    scene.add(glow)

    const rays = new Mesh(
      track(new PlaneGeometry(760, 760)),
      track(
        new MeshBasicMaterial({
          map: track(rayTexture()),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0.75,
        }),
      ),
    )
    rays.position.set(0, SUN.y, SUN.z - 1)
    scene.add(rays)

    const core = new Mesh(
      track(new SphereGeometry(52, 32, 24)),
      track(new MeshBasicMaterial({ color: 0xfff6e0 })),
    )
    core.position.set(0, SUN.y, SUN.z)
    scene.add(core)

    // ── cloud decks ───────────────────────────────────────────────
    const decks = DECKS.map((y, i) => {
      const m = new Mesh(
        // 3400, not 2600: the texture now fades out over its outer third, so
        // the sheet has to be wider to cover the same sky. Costs nothing —
        // the deck is clipped to the viewport either way, so fill is unchanged.
        track(new PlaneGeometry(3400, 3400)),
        track(
          new MeshBasicMaterial({
            map: track(deckTexture(1000 + i * 7919)),
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
            opacity: 0.95,
          }),
        ),
      )
      m.rotation.x = -Math.PI / 2 // lie flat, so the camera drops through them
      m.position.set(0, y, SUN.z * 0.35)
      scene.add(m)
      return m
    })

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // ── the fall ──────────────────────────────────────────────────
    /**
     * Speed: accelerate for most of the drop, then BRAKE into the arrival. The
     * deceleration is the half of a Google Earth fly-to that people actually
     * recognise — without it a descent merely stops. 86% of the distance is
     * covered in the first 78% of the time; the rest is the approach.
     */
    const BRAKE_AT = 0.78
    const BRAKE_DIST = 0.86
    const ease = (t: number) =>
      t < BRAKE_AT
        ? Math.pow(t / BRAKE_AT, 2) * BRAKE_DIST
        : BRAKE_DIST + (1 - BRAKE_DIST) * (1 - Math.pow(1 - (t - BRAKE_AT) / (1 - BRAKE_AT), 2))

    /**
     * Pitch: up at the sun, over to look down at the ground rushing up, then
     * back to level for the arrival. That rotation from overhead to horizon is
     * the other half of the Google Earth signature, and it leaves the camera at
     * roughly the angle the hero holds — so the handover is between two
     * matching viewpoints rather than a cut between unrelated ones.
     *
     * Positive rotation.x looks up in three, negative looks down.
     */
    const PITCH: [number, number][] = [
      [0.0, 0.1], // the sun, a little above
      [0.34, -0.95], // tipped over, ground below
      [0.72, -0.8], // holding the descent
      [1.0, -0.22], // levelled out, hero angle
    ]
    const smooth = (x: number) => x * x * (3 - 2 * x)
    const pitchAt = (t: number) => {
      for (let i = 0; i < PITCH.length - 1; i++) {
        const [t0, p0] = PITCH[i]
        const [t1, p1] = PITCH[i + 1]
        if (t <= t1) return p0 + (p1 - p0) * smooth((t - t0) / (t1 - t0))
      }
      return PITCH[PITCH.length - 1][1]
    }

    let raf = 0
    let start = 0
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      doneRef.current()
    }

    const frame = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / DURATION)
      const y = Y_START + (Y_END - Y_START) * ease(t)

      camera.position.set(0, y, 0)
      camera.rotation.set(pitchAt(t), 0, 0)
      sky.position.y = y // a backdrop, not a place

      // the sun breathes and its corona turns
      glow.scale.setScalar(1 + Math.sin(now / 620) * 0.035)
      core.scale.setScalar(1 + Math.sin(now / 430) * 0.02)
      rays.rotation.z = now / 9000
      rays.scale.setScalar(1 + Math.sin(now / 800) * 0.05)

      /**
       * Fog is driven by the distance to each deck, not by the clock, so a slow
       * frame cannot slide a cloud pass away from the moment the lens is inside
       * it. All three now only FOG — the handover is no longer deck three,
       * because the point of the new ending is that you break out of the last
       * cloud and see the ground before you arrive.
       */
      /**
       * The mark rides ABOVE the weather, not under it. It sits over the haze in
       * the stack, holds at full through every deck, and dissolves on its own
       * just before the white closes. Letting cloud wash across it was the
       * earlier behaviour and it muddied the one moment the brand is on screen
       * by itself.
       *
       *   up by       y=285    1.24s  (clear of deck one's fog, which starts 230)
       *   holds clear          3.30s
       *   dissolves   y=-150 to -260, gone at 5.05s
       *   white closes y=-300  5.22s
       */
      if (logoRef.current) {
        const rise = Math.min(1, Math.max(0, (315 - y) / (315 - 285)))
        const fall = Math.min(1, Math.max(0, (y + 260) / (-150 + 260)))
        logoRef.current.style.opacity = String(Math.min(rise, fall))
      }

      let haze = 0
      DECKS.forEach((dy, i) => {
        // the last deck is the handover, so it closes all the way to white
        const reach = i === DECKS.length - 1 ? 150 : 80
        const near = Math.max(0, 1 - Math.abs(y - dy) / reach)
        haze = Math.max(haze, i === DECKS.length - 1 ? near : near * 0.72)
      })
      // inside the last deck and still falling: hold white, the hero has it now
      if (y < DECKS[DECKS.length - 1]) haze = 1
      const wash = haze
      if (hazeRef.current) hazeRef.current.style.opacity = String(Math.min(1, haze))

      renderer.render(scene, camera)

      if (wash >= 0.995) finish()
      if (t < 1) raf = requestAnimationFrame(frame)
      else finish()
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      decks.forEach((d) => scene.remove(d))
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div ref={mountRef} className="absolute inset-0" />
      {/* the cloud you end up inside; the parent fades this away to reveal the
          hero, so the arrival reads as dropping out of overcast */}
      <div
        ref={hazeRef}
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ opacity: 0 }}
      />
      {/* above the haze on purpose: the mark stays clear through every deck and
          dissolves under its own steam rather than being taken by cloud */}
      <img
        ref={logoRef}
        src="/brand/teask-logo-hd.png"
        alt=""
        className="pointer-events-none absolute top-1/2 left-1/2 w-[46%] max-w-[520px] -translate-x-1/2 -translate-y-1/2 select-none"
        style={{ opacity: 0 }}
      />
    </div>
  )
}
