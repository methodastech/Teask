import { useEffect, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'

/**
 * The descent: open on a pre-dawn sky, then fall through sunrise.
 *
 * The camera only ever travels DOWN. Nothing else in the scene moves toward it,
 * so the sun climbing out of the frame and the cloud decks rising past the lens
 * are both parallax against that single fall. That is what keeps it reading as
 * one continuous drop rather than a set of things sliding around independently.
 *
 * Three decks. The first two only mist the shot on the way through; the third is
 * the handover — the camera enters it, the screen goes white, and the hero is
 * revealed out of the other side.
 *
 * The sky is a physically-based Rayleigh/Mie single-scatter dome rather than a
 * painted gradient, which is what buys the sunrise: the same shader produces the
 * pre-dawn blue, the horizon warmth and the sun's disc as one coherent result,
 * driven by nothing but the sun's elevation. A gradient cannot do that — it has
 * to be re-authored for every moment of the climb.
 *
 * A separate scene on its own canvas rather than the station's camera flown down
 * from altitude: the hero scene is metric (1 unit = 1 metre) and its rig is
 * tuned around the copy block and the parts panel, so borrowing it for a
 * 800-unit fall would mean unpicking all of that for seven seconds of animation.
 */

const DURATION = 7200

// the fall, in world units
const Y_START = 340
const Y_END = -470
/**
 * Deck heights, passed in order on the way down.
 *
 * Not evenly spaced in DISTANCE — evenly spaced in TIME. The fall accelerates,
 * so decks at equal heights would arrive faster and faster and the descent would
 * feel like it was running out rather than opening up. The widening gaps are
 * exactly what reads as gathering speed through deepening sky.
 */
const DECKS = [150, -26, -300]
/** far enough that the dome never parallaxes against it */
const SUN_DIST = 920

/* ── the sky ──────────────────────────────────────────────────────────────
 * Rayleigh + Mie single scatter, the three.js Sky formulation. Rendered on the
 * inside of a sphere with `gl_Position.z = gl_Position.w`, which pins every
 * fragment to the far plane so the dome can never intersect anything.
 */
const SKY_VERT = `
uniform vec3 sunPosition; uniform float rayleigh; uniform float turbidity; uniform float mieCoefficient;
varying vec3 vWorldPosition; varying vec3 vSunDirection; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;
const vec3 up = vec3(0.0,1.0,0.0);
const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;
const vec3 totalRayleigh = vec3(5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5);
const vec3 MieConst = vec3(1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14);
const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;
const float EE = 1000.0;
float sunIntensity(float zenithAngleCos){
  zenithAngleCos = clamp(zenithAngleCos, -1.0, 1.0);
  return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}
vec3 totalMie(float T){ float c = (0.2 * T) * 10e-18; return 0.434 * c * MieConst; }
void main(){
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w;
  vSunDirection = normalize(sunPosition);
  vSunE = sunIntensity(dot(vSunDirection, up));
  vSunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
  float rayleighCoefficient = rayleigh - (1.0 * (1.0 - vSunfade));
  vBetaR = totalRayleigh * rayleighCoefficient;
  vBetaM = totalMie(turbidity) * mieCoefficient;
}`

const SKY_FRAG = `
varying vec3 vWorldPosition; varying vec3 vSunDirection; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;
uniform float mieDirectionalG;
const vec3 cameraPos = vec3(0.0);
const float pi = 3.141592653589793238462643383279502884197169;
const float rayleighZenithLength = 8.4e3;
const float mieZenithLength = 1.25e3;
const vec3 up = vec3(0.0,1.0,0.0);
const float sunAngularDiameterCos = 0.99993;
float rayleighPhase(float cosTheta){ return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0)); }
float hgPhase(float cosTheta, float g){
  float g2 = pow(g, 2.0);
  float inv = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
  return (1.0 / (4.0 * pi)) * ((1.0 - g2) * inv);
}
void main(){
  vec3 direction = normalize(vWorldPosition - cameraPos);
  float zenithAngle = acos(max(0.0, dot(up, direction)));
  float inv = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
  float sR = rayleighZenithLength * inv;
  float sM = mieZenithLength * inv;
  vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));
  float cosTheta = dot(direction, vSunDirection);
  float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
  vec3 betaRTheta = vBetaR * rPhase;
  float mPhase = hgPhase(cosTheta, mieDirectionalG);
  vec3 betaMTheta = vBetaM * mPhase;
  vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(0.5)),
             clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));
  vec3 L0 = vec3(0.1) * Fex;
  float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00022, cosTheta);
  L0 += (vSunE * 19000.0 * Fex) * sundisk;
  vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
  vec3 retColor = pow(texColor, vec3(1.0 / (1.2 + (1.2 * vSunfade))));
  /* Below the horizon the scattering model has nothing to integrate through, so
     extrapolating it just yields murk. Substitute luminous dawn mist instead:
     it brightens as the sun climbs and warms toward the sun's azimuth, which is
     what ground fog actually does at first light. */
  float sunUp = smoothstep(-0.10, 0.16, vSunDirection.y);
  vec3 flatDir = normalize(vec3(direction.x, 0.0, direction.z));
  vec3 flatSun = normalize(vec3(vSunDirection.x, 0.0, vSunDirection.z));
  float facing = pow(max(dot(flatDir, flatSun), 0.0), 3.0);
  vec3 mist = mix(vec3(0.62, 0.66, 0.74), vec3(1.35, 1.08, 0.82), facing * (0.35 + 0.65 * sunUp));
  mist *= (0.55 + 1.15 * sunUp);
  gl_FragColor = vec4(mix(retColor, mist, smoothstep(0.015, 0.32, -direction.y)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** soft round falloff, for the sun's bloom */
function radialTexture(stops: [number, string][], size = 512) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([p, col]) => g.addColorStop(p, col))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * The anamorphic streak a real lens draws across a low sun.
 *
 * Painted per-pixel rather than with a linear gradient, because a gradient band
 * still has to stop somewhere and that stop is a straight edge — which reads as
 * a drawn line rather than as light. A steep power falloff on BOTH axes lets the
 * flare dissolve into nothing well inside the plane's own border.
 */
function streakTexture() {
  const W = 512
  const H = 128
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const dy = Math.abs((y / H) * 2 - 1)
    const vert = Math.exp(-dy * dy * 26) // tight, smooth core
    for (let x = 0; x < W; x++) {
      const dx = Math.abs((x / W) * 2 - 1)
      const horiz = Math.pow(Math.max(0, 1 - dx), 2.6) * Math.exp(-dx * 2.2)
      const o = (y * W + x) * 4
      d[o] = 255
      d[o + 1] = 226 - dx * 34
      d[o + 2] = 186 - dx * 62
      d[o + 3] = Math.min(255, vert * horiz * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * One cloud deck: domain-warped fBm value noise, shaded as if lit from the sun
 * side, feathered to nothing at the sheet edge.
 *
 * Noise rather than scattered gradient blobs because a deck seen from directly
 * above at speed shows its structure, and blobs read as blobs. The density field
 * is built once at 384² and drawn up to 512² — the deck is a blur passing the
 * lens, so the extra resolution was never visible and the fBm is not cheap.
 *
 * The feather matters as much as the noise: a flat rectangle seen near edge-on
 * shows its far edge as a dead-straight line across the sky, which is exactly
 * the seam. Punching a radial falloff through alpha means the cloud thins into
 * the blue instead, so there is no boundary left to see.
 */
function cloudTexture(seed: number) {
  const N = 384
  const cv = document.createElement('canvas')
  cv.width = cv.height = 512
  const ctx = cv.getContext('2d')!
  let s = seed >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)

  const G = 64
  const grid = new Float32Array(G * G)
  for (let i = 0; i < grid.length; i++) grid[i] = rnd()
  const val = (x: number, y: number) => {
    const xi = Math.floor(x) % G
    const yi = Math.floor(y) % G
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const sm = (t: number) => t * t * (3 - 2 * t)
    const u = sm(xf)
    const v = sm(yf)
    const a = grid[yi * G + xi]
    const b = grid[yi * G + ((xi + 1) % G)]
    const c = grid[((yi + 1) % G) * G + xi]
    const dd = grid[((yi + 1) % G) * G + ((xi + 1) % G)]
    return a + (b - a) * u + (c - a) * v + (a - b - c + dd) * u * v
  }
  const fbm = (x: number, y: number) => {
    let f = 0
    let amp = 0.52
    let fr = 1
    for (let o = 0; o < 5; o++) {
      f += amp * val(x * fr, y * fr)
      amp *= 0.5
      fr *= 2.03
    }
    return f
  }

  const img = ctx.createImageData(N, N)
  const d = img.data
  const den = new Float32Array(N * N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = (x / N) * 5.5
      const v = (y / N) * 5.5
      const wx = fbm(u + 11.7, v + 3.1) // domain warp, so the noise is not grid-aligned
      const wy = fbm(u - 5.2, v + 9.4)
      let f = fbm(u + wx * 1.9, v + wy * 1.9)
      f = Math.max(0, f - 0.535) / 0.465 // coverage threshold
      den[y * N + x] = Math.pow(f, 1.35)
    }
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      const f = den[i]
      // pseudo-normal from the density gradient; light arrives from image top
      const gx = den[y * N + Math.min(N - 1, x + 2)] - den[y * N + Math.max(0, x - 2)]
      const gy = den[Math.min(N - 1, y + 2) * N + x] - den[Math.max(0, y - 2) * N + x]
      const lit = Math.max(0, Math.min(1, 0.55 - gy * 3.2 + gx * 0.6))
      const o = i * 4
      d[o] = 118 + lit * 137 // blue-grey in shadow …
      d[o + 1] = 128 + lit * 92
      d[o + 2] = 152 + lit * 46 // … warm gold in the light
      d[o + 3] = Math.min(212, f * 235)
    }
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = N
  tmp.getContext('2d')!.putImageData(img, 0, 0)
  ctx.drawImage(tmp, 0, 0, 512, 512)

  const mask = ctx.createRadialGradient(256, 256, 512 * 0.26, 256, 256, 256)
  mask.addColorStop(0, 'rgba(0,0,0,0)')
  mask.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, 512, 512)

  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/** a single cumulus puff: lumpy soft blob, feathered edge, billboarded in the scene */
function puffTexture(seed: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 256
  const ctx = cv.getContext('2d')!
  let s = seed >>> 0
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
  for (let i = 0; i < 15; i++) {
    const a = rnd() * Math.PI * 2
    const r = rnd() * 62
    const x = 128 + Math.cos(a) * r
    const y = 132 + Math.sin(a) * r * 0.55 - 8
    const rad = 34 + rnd() * 46
    const al = 0.22 + rnd() * 0.3
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, `rgba(255,255,255,${al})`)
    g.addColorStop(0.6, `rgba(244,246,250,${al * 0.5})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  const mask = ctx.createRadialGradient(128, 128, 66, 128, 128, 128)
  mask.addColorStop(0, 'rgba(0,0,0,0)')
  mask.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, 256, 256)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/** the vertical light column a low sun casts up off a cloud deck */
function pillarTexture() {
  const W = 64
  const H = 512
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    const dy = Math.abs((y / H) * 2 - 1)
    const vert = Math.pow(Math.max(0, 1 - dy), 1.7)
    for (let x = 0; x < W; x++) {
      const dx = Math.abs((x / W) * 2 - 1)
      const o = (y * W + x) * 4
      d[o] = 255
      d[o + 1] = 214
      d[o + 2] = 150
      d[o + 3] = Math.min(255, vert * Math.exp(-dx * dx * 9) * 190)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

/** clamped smoothstep between two marks on the timeline */
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function HeroIntroFlight({ onDone }: { onDone: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const logoWrapRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // the scattering shader outputs real radiance, so it needs a film curve —
    // clamping it to sRGB directly blows the sun and the horizon to flat white
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.42
    renderer.outputColorSpace = SRGBColorSpace
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
    mount.appendChild(renderer.domElement)

    /**
     * Pre-dawn starfield.
     *
     * A 2D canvas over the sky rather than geometry in it: the stars never move
     * relative to the camera during the fall and they are gone by 40% of the
     * timeline, so points in the scene would cost a draw call and a depth sort
     * to produce something a static bitmap already gives for free.
     */
    const stars = document.createElement('canvas')
    stars.width = 1280
    stars.height = 720
    Object.assign(stars.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    })
    {
      const sctx = stars.getContext('2d')!
      for (let n = 0; n < 170; n++) {
        const x = Math.random() * 1280
        // squeezed toward the top of the frame: that is where the sky still is
        const y = Math.pow(Math.random(), 1.6) * 470
        const r = Math.random() < 0.88 ? 0.6 + Math.random() * 0.7 : 1.3 + Math.random() * 0.9
        sctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`
        sctx.beginPath()
        sctx.arc(x, y, r, 0, Math.PI * 2)
        sctx.fill()
      }
    }
    mount.appendChild(stars)

    const scene = new Scene()
    const camera = new PerspectiveCamera(48, 1, 0.1, 3000)

    const disposables: { dispose: () => void }[] = []
    const track = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x)
      return x
    }

    // ── sky ───────────────────────────────────────────────────────
    const sunPosition = new Vector3(0, -40, -SUN_DIST)
    const skyUniforms = {
      turbidity: { value: 7.5 },
      rayleigh: { value: 2.6 },
      mieCoefficient: { value: 0.009 },
      mieDirectionalG: { value: 0.82 },
      sunPosition: { value: sunPosition },
    }
    const sky = new Mesh(
      track(new SphereGeometry(1500, 32, 20)),
      track(
        new ShaderMaterial({
          uniforms: skyUniforms,
          vertexShader: SKY_VERT,
          fragmentShader: SKY_FRAG,
          side: BackSide,
          depthWrite: false,
        }),
      ),
    )
    scene.add(sky)

    // ── the sun ───────────────────────────────────────────────────
    // The disc itself belongs to the sky shader. These two only add what a lens
    // does on top of it, which is why there is no flat quad and no corona spokes.
    const bloom = new Mesh(
      track(new PlaneGeometry(640, 640)),
      track(
        new MeshBasicMaterial({
          map: track(
            radialTexture([
              [0, 'rgba(255,250,238,0.95)'],
              [0.22, 'rgba(255,216,150,0.6)'],
              [0.55, 'rgba(255,170,86,0.2)'],
              [1, 'rgba(255,140,60,0)'],
            ]),
          ),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      ),
    )
    scene.add(bloom)

    const streak = new Mesh(
      track(new PlaneGeometry(1700, 95)),
      track(
        new MeshBasicMaterial({
          map: track(streakTexture()),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0.28,
        }),
      ),
    )
    scene.add(streak)

    const pillar = new Mesh(
      track(new PlaneGeometry(95, 760)),
      track(
        new MeshBasicMaterial({
          map: track(pillarTexture()),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      ),
    )
    scene.add(pillar)

    // ── cloud decks ───────────────────────────────────────────────
    const decks = DECKS.map((y, i) => {
      const m = new Mesh(
        // 3400, not 2600: the texture fades out over its outer third, so the
        // sheet has to be wider to cover the same sky. Costs nothing — the deck
        // is clipped to the viewport either way, so fill is unchanged.
        track(new PlaneGeometry(3400, 3400)),
        track(
          new MeshBasicMaterial({
            map: track(cloudTexture(1000 + i * 7919)),
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
            opacity: 0.4,
          }),
        ),
      )
      m.rotation.x = -Math.PI / 2 // lie flat, so the camera drops through them
      m.rotation.z = i * 1.7 // and never repeat the same noise orientation
      m.position.set(0, y, -700 * 0.35)
      scene.add(m)
      return m
    })

    /**
     * Volumetric relief.
     *
     * A flat sheet has no thickness, so passing through one is instantaneous —
     * you are above it, then below it. Clustering billboarded puffs around each
     * deck gives the crossing a duration and real parallax, which is the whole
     * reason the descent reads as falling through weather rather than through a
     * stack of decals.
     */
    const puffMaps = [track(puffTexture(11)), track(puffTexture(313)), track(puffTexture(9241))]
    const puffs: Mesh[] = []
    {
      let ps = 424242 >>> 0
      const prnd = () => ((ps = (ps * 1664525 + 1013904223) >>> 0), ps / 4294967296)
      DECKS.forEach((cy, li) => {
        for (let n = 0; n < 66; n++) {
          const mat = track(
            new MeshBasicMaterial({
              map: puffMaps[(li + n) % 3],
              transparent: true,
              depthWrite: false,
              opacity: 0.4 + prnd() * 0.42,
            }),
          )
          const warm = prnd()
          mat.color = new Color().setRGB(
            0.86 + warm * 0.14,
            0.84 + warm * 0.1,
            0.84 - warm * 0.04,
          )
          const p = new Mesh(track(new PlaneGeometry(1, 1)), mat)
          const side = prnd() < 0.5 ? -1 : 1
          p.position.set(
            side * (40 + prnd() * 1150),
            cy - 30 + prnd() * 96,
            -(150 + prnd() * 1600),
          )
          const w = 95 + prnd() * 520
          p.scale.set(w, w * (0.42 + prnd() * 0.34), 1)
          scene.add(p)
          puffs.push(p)
        }
      })
    }

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
     * Pitch: hold near the horizon through the cruise so the sunrise stays in
     * frame where it can be watched, then commit to a real nose-down dive into
     * the cloud punches. It ends steep on purpose — the hero opens looking down
     * on the station, so the handover is between two matching viewpoints rather
     * than a cut between unrelated ones.
     *
     * Positive rotation.x looks up in three, negative looks down.
     */
    const PITCH: [number, number][] = [
      [0.0, 0.1], // a little above the horizon, on the sun
      [0.32, -0.18], // easing over
      [0.7, -0.42], // committed to the descent
      [1.0, -0.6], // nose down, into the last deck
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

      /**
       * The sun climbs from 3.4° below the horizon to 6.5° above as we descend.
       * Pre-dawn glow through to full sunrise is nothing but this one number
       * moving — the scattering shader derives every colour in the sky from it.
       */
      const elev = ((-3.4 + 9.9 * smooth(t)) * Math.PI) / 180
      const sy = Math.sin(elev) * SUN_DIST
      const sz = -Math.cos(elev) * SUN_DIST
      sunPosition.set(0, sy, sz)
      bloom.position.set(0, y + sy, sz)
      streak.position.set(0, y + sy, sz + 1)

      const swell = 0.68 + 0.5 * smooth(t)
      bloom.scale.setScalar(swell * (1 + Math.sin(now / 620) * 0.03))
      streak.scale.set(swell, swell * 0.8, 1)
      streak.material.opacity = 0.07 + 0.18 * smooth(t)

      decks.forEach((cl, n) => {
        cl.rotation.z += 0.00016 * (n + 1)
      })
      puffs.forEach((p) => p.quaternion.copy(camera.quaternion))

      // the pillar only exists around sunrise itself: it fades in as the sun
      // reaches the horizon and is gone once the sun is properly clear of it
      const eDeg = (elev * 180) / Math.PI
      const pIn = Math.max(0, Math.min(1, (eDeg + 1.2) / 2.4))
      const pOut = 1 - Math.max(0, Math.min(1, (eDeg - 4) / 4))
      pillar.material.opacity = 0.2 * pIn * pOut
      pillar.position.set(0, y + sy * 0.45, sz + 2)

      // micro drift: an aircraft sways, a tripod does not
      camera.rotation.z = Math.sin(now / 2600) * 0.005
      camera.position.x = Math.sin(now / 3400) * 2.5

      // the world brightens and the lens tightens as we descend
      renderer.toneMappingExposure = 0.36 + 0.12 * smooth(t)
      const fovNow = 51 - 5 * smooth(t)
      if (Math.abs(camera.fov - fovNow) > 0.01) {
        camera.fov = fovNow
        camera.updateProjectionMatrix()
      }
      stars.style.opacity = String(1 - ss(0.06, 0.4, t))

      /**
       * The mark rides ABOVE the weather. It blurs in as the sun crests, holds
       * through the cruise, and lifts away before the dive — letting cloud wash
       * across it was the earlier behaviour and it muddied the one moment the
       * brand is on screen by itself.
       */
      const aIn = ss(0.18, 0.32, t)
      const aOut = 1 - ss(0.6, 0.74, t)
      const logoA = Math.min(aIn, aOut)
      if (logoWrapRef.current) {
        logoWrapRef.current.style.opacity = String(logoA)
        if (logoRef.current) {
          logoRef.current.style.transform =
            `scale(${(1.12 - 0.12 * aIn).toFixed(4)}) ` +
            `translateY(${((1 - aIn) * 16 - (1 - aOut) * 34).toFixed(2)}px)`
          logoRef.current.style.filter =
            `blur(${(9 * (1 - aIn) + 8 * (1 - aOut)).toFixed(2)}px)` +
            ` drop-shadow(0 0 24px rgba(255,244,214,${(0.5 * logoA).toFixed(3)}))` +
            ` drop-shadow(0 2px 60px rgba(255,214,150,${(0.35 * logoA).toFixed(3)}))`
        }
        if (haloRef.current) {
          haloRef.current.style.opacity = String(
            0.55 * logoA * (0.92 + 0.08 * Math.sin(now / 480)),
          )
        }
        if (tagRef.current) {
          const tA = ss(0.26, 0.4, t) * aOut
          tagRef.current.style.opacity = String(tA)
          // the tracking closes as it resolves, so the line settles into place
          tagRef.current.style.letterSpacing = `${(0.64 - 0.2 * tA).toFixed(3)}em`
        }
      }

      /**
       * One clean approach to white.
       *
       * The upper decks only ever mist the shot — capped at 0.22 — and solely
       * the last one ramps monotonically to full. Driving all three off distance
       * gave three separate flashes, which read as the animation stuttering
       * rather than as passing through cloud.
       */
      let white = 0
      for (let n = 0; n < DECKS.length - 1; n++) {
        white = Math.max(white, Math.max(0, 1 - Math.abs(y - DECKS[n]) / 80) * 0.22)
      }
      const ramp = Math.min(1, Math.max(0, (DECKS[2] + 170 - y) / 170))
      white = Math.max(white, ramp * ramp)
      // inside the last deck and still falling: hold white, the hero has it now
      if (y < DECKS[2]) white = 1
      if (fadeRef.current) fadeRef.current.style.opacity = String(Math.min(1, white))

      renderer.render(scene, camera)

      if (white >= 0.995) finish()
      if (t < 1) raf = requestAnimationFrame(frame)
      else finish()
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      decks.forEach((d) => scene.remove(d))
      puffs.forEach((p) => scene.remove(p))
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      if (stars.parentNode === mount) mount.removeChild(stars)
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div ref={mountRef} className="absolute inset-0" />
      {/* corner falloff — keeps the eye on the sun rather than the frame edge */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 58%, rgba(10,14,26,0.20) 100%)',
        }}
      />
      {/* the cloud you end up inside; the parent fades this away to reveal the
          hero, so the arrival reads as dropping out of overcast */}
      <div
        ref={fadeRef}
        className="pointer-events-none absolute inset-0 bg-white"
        style={{ opacity: 0 }}
      />
      <div
        ref={logoWrapRef}
        className="pointer-events-none absolute inset-0 select-none"
        style={{ opacity: 0, display: 'grid', placeItems: 'center' }}
      >
        <div
          ref={haloRef}
          style={{
            position: 'absolute',
            width: '74vmin',
            height: '74vmin',
            borderRadius: '50%',
            opacity: 0,
            background:
              'radial-gradient(circle, rgba(255,236,200,0.5) 0%, rgba(255,214,150,0.18) 42%, rgba(255,200,130,0) 70%)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <img
            ref={logoRef}
            src="/brand/teask-logo-hd.png"
            alt=""
            style={{ width: 'min(46vw, 520px)', minWidth: '260px', willChange: 'transform, filter' }}
          />
          <div
            ref={tagRef}
            className="font-mono uppercase"
            style={{
              marginTop: '26px',
              opacity: 0,
              fontSize: '11px',
              letterSpacing: '0.64em',
              // the tracking is applied to the right of each glyph, so without a
              // matching left pad the line sits visibly off-centre
              paddingLeft: '0.64em',
              color: 'rgba(255,255,255,0.88)',
              textShadow: '0 1px 24px rgba(10,18,32,0.65)',
            }}
          >
            Tenaga Alam Sekitar Kita
          </div>
        </div>
      </div>
    </div>
  )
}
