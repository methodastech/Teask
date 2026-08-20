import { useEffect, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
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
  const sm = (t: number) => t * t * (3 - 2 * t)
  /**
   * `%` in JavaScript keeps the sign of its left operand, and one of the two
   * warp fields is sampled from x = -5.2 — so `Math.floor(x) % G` handed back
   * negative lattice columns. Wherever the row index also landed on a multiple
   * of G, the pair indexed BEFORE the start of the array: `grid[-6]` is
   * `undefined`, the arithmetic yields NaN, and the pixel silently fell out of
   * the cloud as a hole.
   *
   * The cost was the larger half of it. A Float32Array read that returns
   * `undefined` drops off V8's fast path and poisons the load site for every
   * subsequent call — this one function was 7% of the page's entire main-thread
   * time, at roughly a microsecond a call for what is a dozen flops. Wrapping
   * into range fixes the holes and puts the loop back on the fast path.
   */
  const wrap = (n: number) => ((n % G) + G) % G
  const val = (x: number, y: number) => {
    const fx = Math.floor(x)
    const fy = Math.floor(y)
    const xi = wrap(fx)
    const yi = wrap(fy)
    const xi1 = xi + 1 === G ? 0 : xi + 1
    const yi1 = yi + 1 === G ? 0 : yi + 1
    const u = sm(x - fx)
    const v = sm(y - fy)
    const a = grid[yi * G + xi]
    const b = grid[yi * G + xi1]
    const c = grid[yi1 * G + xi]
    const dd = grid[yi1 * G + xi1]
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

  /**
   * The two domain-warp fields, on a coarse grid.
   *
   * They are broad by construction — they displace the sample point, so detail
   * in them finer than the displacement itself cannot reach the result. Running
   * them per-pixel put two thirds of this build into fields that are smooth
   * across several pixels. Sampled at 96² and bilinearly interpolated instead:
   * the same fields, the same clouds, in well under half the time.
   *
   * Worth caring about because of WHEN it runs — three times, synchronously,
   * on the frame the descent is mounted. Every millisecond here is a millisecond
   * the page is locked before the fall has started.
   */
  const WG = 96
  const warpX = new Float32Array(WG * WG)
  const warpY = new Float32Array(WG * WG)
  const uMax = ((N - 1) / N) * 5.5
  for (let j = 0; j < WG; j++)
    for (let i = 0; i < WG; i++) {
      const u = (i / (WG - 1)) * uMax
      const v = (j / (WG - 1)) * uMax
      warpX[j * WG + i] = fbm(u + 11.7, v + 3.1) // so the noise is not grid-aligned
      warpY[j * WG + i] = fbm(u - 5.2, v + 9.4)
    }
  const warpAt = (f: Float32Array, gx: number, gy: number) => {
    const i = Math.min(WG - 2, gx | 0)
    const j = Math.min(WG - 2, gy | 0)
    const fx = gx - i
    const fy = gy - j
    const a = f[j * WG + i]
    const b = f[j * WG + i + 1]
    const c = f[(j + 1) * WG + i]
    const dd = f[(j + 1) * WG + i + 1]
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + dd) * fx * fy
  }

  const img = ctx.createImageData(N, N)
  const d = img.data
  const den = new Float32Array(N * N)
  for (let y = 0; y < N; y++) {
    const gy = (y / (N - 1)) * (WG - 1)
    for (let x = 0; x < N; x++) {
      const u = (x / N) * 5.5
      const v = (y / N) * 5.5
      const wx = warpAt(warpX, (x / (N - 1)) * (WG - 1), gy)
      const wy = warpAt(warpY, (x / (N - 1)) * (WG - 1), gy)
      let f = fbm(u + wx * 1.9, v + wy * 1.9)
      f = Math.max(0, f - 0.535) / 0.465 // coverage threshold
      den[y * N + x] = Math.pow(f, 1.35)
    }
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
      renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' })
    } catch {
      // no WebGL: hand over rather than showing a dead canvas
      doneRef.current()
      return
    }
    /* Capped at 1.5, not 2: everything here is soft-focus cloud and glow, so the
       extra resolution bought nothing visible — but the scene is pure fill (a
       sky dome, three full-screen transparent decks, ~200 billboards), and fill
       is exactly what makes integrated GPUs drop frames. */
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(dpr)
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
    /**
     * Batched, one InstancedMesh per puff texture.
     *
     * These ~200 puffs were ~200 Meshes, each with its own geometry and its own
     * material, so every single frame paid 200 world-matrix rebuilds, 200
     * frustum tests, a depth sort across the lot and 200 draw calls — all of it
     * to draw one quad two hundred times. Three batches now carry the same
     * scene, and the billboarding moved into the vertex shader below, so the
     * instance matrices upload once and are never touched again.
     *
     * Instances draw in buffer order rather than being sorted per frame, so
     * each batch is pre-sorted back-to-front here. The camera only ever travels
     * in y and the puffs never move, so that order holds for the whole descent
     * — and it is steadier than a per-frame sort, which reorders neighbours as
     * they pass each other and pops.
     */
    const puffBatches: InstancedMesh[] = []
    {
      let ps = 424242 >>> 0
      const prnd = () => ((ps = (ps * 1664525 + 1013904223) >>> 0), ps / 4294967296)
      type Puff = { map: number; x: number; y: number; z: number; w: number; h: number; a: number; c: Color }
      const spec: Puff[] = []
      // the draw ORDER out of prnd is the cloud layout — every value below is
      // pulled in exactly the sequence the per-mesh version used, so batching
      // rearranges nothing
      DECKS.forEach((cy, li) => {
        for (let n = 0; n < 66; n++) {
          const a = 0.4 + prnd() * 0.42
          const warm = prnd()
          const side = prnd() < 0.5 ? -1 : 1
          const x = side * (40 + prnd() * 1150)
          const y = cy - 30 + prnd() * 96
          const z = -(150 + prnd() * 1600)
          const w = 95 + prnd() * 520
          const h = w * (0.42 + prnd() * 0.34)
          spec.push({
            map: (li + n) % 3,
            x,
            y,
            z,
            w,
            h,
            a,
            c: new Color().setRGB(0.86 + warm * 0.14, 0.84 + warm * 0.1, 0.84 - warm * 0.04),
          })
        }
      })

      const m4 = new Matrix4()
      puffMaps.forEach((map, mi) => {
        const list = spec.filter((s) => s.map === mi).sort((a, b) => a.z - b.z)
        const mat = track(
          new MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
        )
        /**
         * Per-instance alpha, and camera-facing without touching the CPU.
         *
         * MeshBasicMaterial is patched rather than replaced by a ShaderMaterial
         * so the map decode, the film curve and the output transform stay
         * exactly the ones the rest of the scene is using — a hand-written
         * shader here would have to reproduce all three to match, and any drift
         * would show as these puffs alone sitting at the wrong exposure.
         */
        mat.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              '#include <common>\nattribute float aPuffAlpha;\nvarying float vPuffAlpha;',
            )
            /* The instance matrix carries a position and a size, no rotation.
               Spreading the quad across the view plane here is precisely what
               `quaternion.copy(camera.quaternion)` did per puff per frame, and
               it costs nothing: the camera's own rotation is already baked into
               modelViewMatrix. */
            .replace(
              '#include <project_vertex>',
              `vPuffAlpha = aPuffAlpha;
  vec4 mvPosition = modelViewMatrix * vec4( instanceMatrix[ 3 ].xyz, 1.0 );
  mvPosition.xy += transformed.xy * vec2( length( instanceMatrix[ 0 ].xyz ), length( instanceMatrix[ 1 ].xyz ) );
  gl_Position = projectionMatrix * mvPosition;`,
            )
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vPuffAlpha;')
            .replace(
              '#include <alphamap_fragment>',
              '#include <alphamap_fragment>\n  diffuseColor.a *= vPuffAlpha;',
            )
        }

        // one geometry per batch, not per puff: the instanced alpha attribute
        // lives on the geometry, so the three batches cannot share a single one
        const geo = track(new PlaneGeometry(1, 1))
        const alphas = new Float32Array(list.length)
        const im = new InstancedMesh(geo, mat, list.length)
        list.forEach((s, i) => {
          m4.makeScale(s.w, s.h, 1)
          m4.setPosition(s.x, s.y, s.z)
          im.setMatrixAt(i, m4)
          im.setColorAt(i, s.c)
          alphas[i] = s.a
        })
        geo.setAttribute('aPuffAlpha', new InstancedBufferAttribute(alphas, 1))
        im.instanceMatrix.needsUpdate = true
        if (im.instanceColor) im.instanceColor.needsUpdate = true
        scene.add(im)
        puffBatches.push(im)
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
    /* 0.84, not the old 0.86: the brake is now a Hermite segment that takes over
       at the EXACT speed the acceleration hands it, and 0.84 is the most
       distance that entry speed can be absorbed over while the cubic stays
       monotone. The old pair of quadratics shed 42% of the camera's speed in a
       single frame at the joint — a visible jerk right where the dive begins. */
    const BRAKE_DIST = 0.84
    const ease = (t: number) => {
      if (t < BRAKE_AT) return Math.pow(t / BRAKE_AT, 2) * BRAKE_DIST
      const u = (t - BRAKE_AT) / (1 - BRAKE_AT)
      // entry slope carried across the joint, in the brake segment's own time
      const v = ((2 * BRAKE_DIST) / BRAKE_AT) * (1 - BRAKE_AT)
      return BRAKE_DIST + (1 - BRAKE_DIST) * (3 - 2 * u) * u * u + v * u * (1 - u) * (1 - u)
    }

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
    /* One continuous nose-over: a C¹ cubic through the knots, with tangents
       averaged from the neighbouring secants and zeroed at the ends (ease in,
       settle out). Interpolating each segment with its own smoothstep meant the
       pitch RATE fell to zero at every interior knot — the camera visibly
       nodded, paused, and nodded again on the way down. The knot data is
       monotone with near-equal secants, so the averaged tangents cannot
       overshoot. */
    const secant = (a: number, b: number) => (PITCH[b][1] - PITCH[a][1]) / (PITCH[b][0] - PITCH[a][0])
    const P_M = PITCH.map((_, i) =>
      i === 0 || i === PITCH.length - 1 ? 0 : (secant(i - 1, i) + secant(i, i + 1)) / 2,
    )
    const pitchAt = (t: number) => {
      for (let i = 0; i < PITCH.length - 1; i++) {
        const [t0, p0] = PITCH[i]
        const [t1, p1] = PITCH[i + 1]
        if (t <= t1 || i === PITCH.length - 2) {
          const h = t1 - t0
          const u = Math.min(1, Math.max(0, (t - t0) / h))
          const u2 = u * u
          const u3 = u2 * u
          return (
            (2 * u3 - 3 * u2 + 1) * p0 +
            (u3 - 2 * u2 + u) * h * P_M[i] +
            (3 * u2 - 2 * u3) * p1 +
            (u3 - u2) * h * P_M[i + 1]
          )
        }
      }
      return PITCH[PITCH.length - 1][1]
    }

    /* Pay the sky shader's compile and every texture upload BEFORE the clock
       starts. Left to the first animated frame, they cost a triple-digit-ms
       stall with `start` already ticking — the fall opened by visibly jumping
       over its own first moments. */
    camera.position.set(0, Y_START, 0)
    camera.rotation.set(pitchAt(0), 0, 0)
    renderer.render(scene, camera)

    let raf = 0
    let start = 0
    let last = 0
    let frameAvg = 0
    let dropAt = 0
    let finished = false
    /* Last value written to each animated style, so a frame that would restate
       what is already there writes nothing. Worth the bookkeeping only for the
       properties that cost a repaint to change — `filter` above all, which
       re-rasterises a blur and two wide shadows over a 520px mark every time
       the string differs. */
    let lastFilter = ''
    let lastStars = ''
    let lastFade = ''
    const setStyle = (el: HTMLElement, prop: 'opacity' | 'filter', v: string, prev: string) => {
      if (v === prev) return prev
      el.style.setProperty(prop, v)
      return v
    }
    const finish = () => {
      if (finished) return
      finished = true
      doneRef.current()
    }

    const frame = (now: number) => {
      if (!start) start = now
      /* If the machine still can't hold the frame rate, shed resolution rather
         than smoothness — the eye forgives softer clouds far more readily than
         a stuttering fall. A long gap is a backgrounded tab, not load: reset
         the average instead of reacting to it. */
      const dt = now - last
      if (last && dt < 250) {
        frameAvg = frameAvg ? frameAvg * 0.9 + dt * 0.1 : dt
        /* In 0.2 steps, not 0.35: a third of the resolution shed in one go is
           itself a visible event — the whole frame goes soft mid-fall, which
           reads as the glitch it was trying to prevent. Small steps settle onto
           the level the machine can actually hold, and each one costs a
           framebuffer reallocation, so the cooldown stays generous. */
        if (frameAvg > 26 && dpr > 0.75 && now - dropAt > 700) {
          dpr = Math.max(0.75, dpr - 0.2)
          renderer.setPixelRatio(dpr)
          resize()
          frameAvg = 0
          dropAt = now
        }
      } else frameAvg = 0
      last = now
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

      // set from elapsed time, not incremented per frame: the old += drifted
      // twice as fast on a 120Hz display and slowed down under every frame drop
      decks.forEach((cl, n) => {
        cl.rotation.z = n * 1.7 + (now - start) * 0.0000096 * (n + 1)
      })
      // the puffs turn to face the camera in their own vertex shader, so there
      // is deliberately nothing to do for them here

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
      lastStars = setStyle(stars, 'opacity', (1 - ss(0.06, 0.4, t)).toFixed(3), lastStars)

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
          // transform is compositor work and can move every frame for free
          logoRef.current.style.transform =
            `scale(${(1.12 - 0.12 * aIn).toFixed(4)}) ` +
            `translateY(${((1 - aIn) * 16 - (1 - aOut) * 34).toFixed(2)}px)`
          /* Quantised — a quarter-pixel of blur and a fiftieth of shadow alpha,
             both well under what the eye resolves on a soft glow. What it buys
             is the hold between the blur-in and the blur-out, a third of the
             flight, where the mark is fully resolved and every frame used to
             hand the compositor a *new* filter string describing the identical
             result. Those frames now write nothing at all. */
          const blur = (Math.round((9 * (1 - aIn) + 8 * (1 - aOut)) * 4) / 4).toFixed(2)
          const g1 = (Math.round(0.5 * logoA * 50) / 50).toFixed(2)
          const g2 = (Math.round(0.35 * logoA * 50) / 50).toFixed(2)
          lastFilter = setStyle(
            logoRef.current,
            'filter',
            `blur(${blur}px) drop-shadow(0 0 24px rgba(255,244,214,${g1}))` +
              ` drop-shadow(0 2px 60px rgba(255,214,150,${g2}))`,
            lastFilter,
          )
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
      if (fadeRef.current) {
        lastFade = setStyle(fadeRef.current, 'opacity', Math.min(1, white).toFixed(3), lastFade)
      }

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
      puffBatches.forEach((p) => {
        scene.remove(p)
        p.dispose() // the instance buffers, which `disposables` never held
      })
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
