import {
  BackSide,
  Box3,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  EquirectangularReflectionMapping,
  TextureLoader,
  type Texture,
  Vector2,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODELS_BASE } from '../lib/station3Parts'
import { breathe } from '../lib/breathe'

/**
 * Thrown when the scene is torn down while the build is paused between stages.
 * A named class so the caller can tell "the visitor navigated away" apart from
 * "the environment failed to build", and stay quiet about the first.
 */
export class AbortError extends Error {
  constructor() {
    super('environment build aborted')
    this.name = 'AbortError'
  }
}

/**
 * The world the T Station sits in: a marked parking lot on a landscaped campus,
 * ringed by low-poly offices and planting — Cyberjaya, roughly half built and
 * half green.
 *
 * Art direction is an **architectural scale model**, not game art. Faceted
 * geometry, painted window grids and saturated greens all read as "video game",
 * which is wrong for a deep-tech brand. So: smooth normals, a near-monochrome
 * palette of model whites and desaturated planting, glazing expressed as a
 * recessed shadow line rather than a texture, and the product left as the only
 * saturated object in frame. Restraint is what reads as expensive here.
 *
 * Two constraints drive the layout:
 *
 *  1. The camera orbits a full 360°, so the world must be complete in every
 *     direction — there is no "behind the set".
 *  2. Nothing may come between the camera and the unit. The camera orbits at
 *     ~12 units, so anything with height lives beyond SAFE_R (14): on the
 *     camera's own side it falls behind the lens, everywhere else it reads as
 *     background. Inside that radius only the flat lot surface and
 *     ankle-height detail are allowed, so the ground is never bare and the
 *     product is never occluded.
 */

/** deterministic PRNG, so the world is laid out identically on every load */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// The lot, in world units. The station is fitted to 6 units on its longest
// axis and its published footprint is "two standard parking bays", so a bay is
// exactly 3 units wide: the unit straddles the pair either side of x = 0 and
// the bay grid runs through it unbroken, like any other vehicle in the lot.
const BAY_W = 3.0
const BAY_D = 5.6
// The ring road has to clear the lot's *corners*, not its sides, so the lot's
// diagonal sets how close the road can possibly come. Narrowing the lot from 21
// to 15 pulls that diagonal in from 26.2 to 21.6 and lets the road move in with
// it — which is the only way to get passing traffic reading at this framing.
// The depth is not free to change: three bay rows need every unit of it.
const LOT_X = 15
const LOT_Z = 15
/**
 * Where the truck's stainless shell stops and its glass begins, as a fraction of
 * the body's own height. The windows are not separate geometry in the supplied
 * FBX, so they can only be found by shape.
 */
const TRUCK_GLASS_FROM = 0.58
/** nothing with height inside this radius — see note 2 above */
const SAFE_R = 14
/** z-extent of each bay row; the middle row is the one the station stands in */
const ROWS: Array<[number, number]> = [
  [-BAY_D * 2.6, -BAY_D * 1.6],
  [-BAY_D / 2, BAY_D / 2],
  [BAY_D * 1.6, BAY_D * 2.6],
]

/** asphalt with painted bays, baked once for the whole lot */
function lotTexture(): CanvasTexture {
  const PX = 24 // pixels per world unit
  const W = Math.round(LOT_X * 2 * PX)
  const H = Math.round(LOT_Z * 2 * PX)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const rng = makeRng(31337)

  // asphalt, mottled so it isn't a dead flat grey
  ctx.fillStyle = '#8e9298'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 9000; i++) {
    const a = 0.03 + rng() * 0.05
    ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
    ctx.beginPath()
    ctx.arc(rng() * W, rng() * H, 1 + rng() * 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // world → texture pixel
  const px = (x: number) => (x + LOT_X) * PX
  const py = (z: number) => (z + LOT_Z) * PX

  ctx.strokeStyle = 'rgba(252,251,248,0.92)'
  ctx.lineWidth = 0.14 * PX
  ctx.lineCap = 'butt'
  const line = (x1: number, z1: number, x2: number, z2: number) => {
    ctx.beginPath()
    ctx.moveTo(px(x1), py(z1))
    ctx.lineTo(px(x2), py(z2))
    ctx.stroke()
  }

  // Rows of bays with driving aisles between. The grid is uniform and runs
  // straight through the station's own bays — a parking space is a space,
  // whether a car or a charging unit is standing in it.
  ROWS.forEach(([z0, z1]) => {
    // dividers, snapped to multiples of BAY_W so x = 0 is always a bay edge
    const first = Math.ceil(-LOT_X / BAY_W) * BAY_W
    for (let x = first; x <= LOT_X + 1e-6; x += BAY_W) {
      line(x, z0, x, z1)
    }
    // the head-end line each bay is parked up to
    line(first, z0, Math.floor(LOT_X / BAY_W) * BAY_W, z0)
    line(first, z1, Math.floor(LOT_X / BAY_W) * BAY_W, z1)
  })

  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

export interface PhotorealEnv {
  sun: DirectionalLight
  /** advance the traffic on the ring road; dt in seconds */
  update: (dt: number) => void
  dispose: () => void
}

/**
 * Async, and deliberately so.
 *
 * Nothing here needs to await anything — every stage is synchronous work. It is
 * async so that it can PAUSE between stages, because this runs while the intro
 * descent is animating on the same thread and built as one unbroken task it made
 * the descent skip. See `breathe` for why that shows up as a jump rather than a
 * slowdown. The stage boundaries below are the `// ── section ──` comments that
 * were already there; each one now ends with a chance for the browser to paint.
 */
export async function buildPhotorealEnvironment({
  scene,
  renderer,
  groundY,
  radius = 6,
  detail = 'model',
  aborted,
}: {
  scene: Scene
  renderer: WebGLRenderer
  groundY: number
  radius?: number
  /**
   * Checked after every pause. The build now spans many frames, so the component
   * can unmount half-way through it — without this the remaining stages would go
   * on adding meshes to a scene that is already being torn down.
   */
  aborted?: () => boolean
  /**
   * 'model' is the architectural maquette: faceted planting, flat materials,
   * a monochrome palette. 'realistic' builds the same site to the standard of
   * the station model — surfaces get microstructure, geometry gets its real
   * segment count, and the palette stops being a deliberate abstraction.
   *
   * One world unit is one metre throughout, and that is not a coincidence: a
   * bay is 3.0 × 5.6 and the station spans two of them, which is its published
   * footprint. Every dimension below is a real one.
   */
  detail?: 'model' | 'realistic'
}): Promise<PhotorealEnv> {
  const REAL = detail === 'realistic'
  const root = new Group()
  root.position.y = groundY
  scene.add(root)

  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x)
    return x
  }
  const rng = makeRng(9081)

  /**
   * End of a build stage: let a frame through, then bail out if the scene went
   * away while we were waiting. Throwing rather than returning early keeps every
   * call site a single line — the caller treats an abort as a rejected build.
   */
  const stage = async () => {
    await breathe()
    if (aborted?.()) throw new AbortError()
  }

  // ── sky ───────────────────────────────────────────────────────────
  const skyCan = document.createElement('canvas')
  skyCan.width = 32
  skyCan.height = 512
  {
    const ctx = skyCan.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0.0, '#57a6dd')
    g.addColorStop(0.4, '#8cc6e8')
    g.addColorStop(0.72, '#c2e2f2')
    g.addColorStop(1.0, '#eaf4f8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 512)
  }
  const skyTex = track(new CanvasTexture(skyCan))
  skyTex.colorSpace = SRGBColorSpace
  const skyGeo = track(new SphereGeometry(400, 32, 20))
  const skyMat = track(new MeshBasicMaterial({ map: skyTex, side: BackSide, fog: false, depthWrite: false }))
  scene.add(new Mesh(skyGeo, skyMat))

  const cloudCan = document.createElement('canvas')
  cloudCan.width = cloudCan.height = 512
  {
    const ctx = cloudCan.getContext('2d')!
    ctx.clearRect(0, 0, 512, 512)
    const r2 = makeRng(4242)
    for (let p = 0; p < 12; p++) {
      const cx = r2() * 512
      const cy = 80 + r2() * 260
      for (let i = 0; i < 16; i++) {
        const x = cx + (r2() - 0.5) * 150
        const y = cy + (r2() - 0.5) * 34
        const r = 20 + r2() * 40
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
        grd.addColorStop(0, 'rgba(255,255,255,0.62)')
        grd.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  const cloudTex = track(new CanvasTexture(cloudCan))
  cloudTex.colorSpace = SRGBColorSpace
  cloudTex.wrapS = cloudTex.wrapT = RepeatWrapping
  cloudTex.repeat.set(3, 2)
  const cloudGeo = track(new SphereGeometry(360, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.46))
  const cloudMat = track(
    new MeshBasicMaterial({ map: cloudTex, side: BackSide, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }),
  )
  scene.add(new Mesh(cloudGeo, cloudMat))

  /**
   * A tiling normal map built from value noise, so flat surfaces stop reading as
   * plastic. This is the single biggest difference between the maquette and the
   * realistic build: a maquette *should* look like smooth painted card, but real
   * asphalt and concrete scatter light at a scale you can see, and without that
   * micro-structure no amount of geometry reads as a photograph.
   *
   * `bump` is the surface's roughness in millimetres, so the callers below can
   * ask for asphalt (coarse) and concrete (fine) in terms that mean something.
   */
  const noiseNormal = (bump: number, repeat: number) => {
    const N = 256
    const c = document.createElement('canvas')
    c.width = c.height = N
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(N, N)
    const h = new Float32Array(N * N)
    // a couple of octaves of value noise, wrapped so the tile is seamless
    for (let oct = 0, amp = 1, step = 8; oct < 3; oct++, amp *= 0.5, step *= 2) {
      const g = new Float32Array(step * step)
      for (let i = 0; i < g.length; i++) g[i] = rng()
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const fx = (x / N) * step
          const fy = (y / N) * step
          const x0 = Math.floor(fx) % step
          const y0 = Math.floor(fy) % step
          const x1 = (x0 + 1) % step
          const y1 = (y0 + 1) % step
          const tx = fx - Math.floor(fx)
          const ty = fy - Math.floor(fy)
          const sx = tx * tx * (3 - 2 * tx)
          const sy = ty * ty * (3 - 2 * ty)
          const a = g[y0 * step + x0] * (1 - sx) + g[y0 * step + x1] * sx
          const b = g[y1 * step + x0] * (1 - sx) + g[y1 * step + x1] * sx
          h[y * N + x] += (a * (1 - sy) + b * sy) * amp
        }
      }
    }
    // slope of the height field becomes the normal
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const l = h[y * N + ((x - 1 + N) % N)]
        const r = h[y * N + ((x + 1) % N)]
        const u = h[((y - 1 + N) % N) * N + x]
        const d = h[((y + 1) % N) * N + x]
        const i = (y * N + x) * 4
        img.data[i] = 128 + (l - r) * bump * 127
        img.data[i + 1] = 128 + (u - d) * bump * 127
        img.data[i + 2] = 255
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(repeat, repeat)
    return track(t)
  }

  const asphaltNormal = REAL ? noiseNormal(2.2, 26) : null
  const concreteNormal = REAL ? noiseNormal(1.1, 14) : null

  /**
   * Upgrade a material in place from the procedural stand-in to a real scanned
   * PBR set (Poly Haven, CC0). Applied asynchronously and on top of a material
   * that already looks right, so a missing or slow file costs nothing but the
   * upgrade — the scene is never blocked and never breaks.
   *
   * The diffuse map is the part that cannot be faked: procedural noise can
   * imitate how a surface scatters light, but not the stains, patch repairs and
   * aggregate of a road that has been driven on.
   */
  const texLoader = REAL ? new TextureLoader() : null
  /**
   * `diffuse: false` keeps the material's existing colour map. The lot needs
   * this: its map is the painted bay grid, and a scanned albedo laid over the
   * top would erase every line on the car park.
   */
  const applyPbr = (
    mat: MeshStandardMaterial,
    name: string,
    repeat: number,
    { diffuse = true }: { diffuse?: boolean } = {},
  ) => {
    if (!texLoader) return
    const setup = (t: Texture, srgb = false) => {
      t.wrapS = t.wrapT = RepeatWrapping
      t.repeat.set(repeat, repeat)
      if (srgb) t.colorSpace = SRGBColorSpace
      track(t)
      return t
    }
    if (diffuse) {
      texLoader.load(`/textures/${name}_diff.jpg`, (t) => {
        mat.map = setup(t, true)
        // the scanned albedo already carries the surface's own colour
        mat.color.setHex(0xffffff)
        mat.needsUpdate = true
      })
    } else {
      // no albedo of its own, so darken toward real tarmac instead of staying
      // the pale grey the maquette wanted
      mat.color.setHex(0x8e9095)
    }
    texLoader.load(`/textures/${name}_nor.jpg`, (t) => {
      mat.normalMap = setup(t)
      mat.normalScale.set(1, 1)
      mat.needsUpdate = true
    })
    texLoader.load(`/textures/${name}_rough.jpg`, (t) => {
      mat.roughnessMap = setup(t)
      mat.needsUpdate = true
    })
  }

  await stage()

  // ── lighting ──────────────────────────────────────────────────────
  // Realistic drops the sun a little and warms it: 3.2 at 26 m up is a midday
  // light that flattens everything, where a lower angle rakes across the paving
  // and lets the canopy actually cast the unit onto its own bay.
  const sun = new DirectionalLight(0xfff2df, REAL ? 2.85 : 3.2)
  sun.position.set(-18, REAL ? 19 : 26, -8)
  sun.castShadow = true
  /**
   * 1024 for the maquette, down from 2048.
   *
   * The map is spread over the frustum below, so at S = max(24, radius*6) ≈ 36 a
   * 1024 map is a ~70 mm texel. That is finer than the softening PCF already
   * applies, which is why the drop is not visible: the blur was hiding the extra
   * resolution before it reached the screen. It quarters both the memory and the
   * fill cost of every shadow render — and with 3.4 million triangles of parked
   * bikes in the casting set, that pass is not cheap.
   *
   * The realistic build keeps 4096: it runs a tighter frustum (S = 30) and is
   * meant to hold up to scrutiny rather than to run smoothly.
   */
  sun.shadow.mapSize.set(REAL ? 4096 : 1024, REAL ? 4096 : 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 120
  // Shadow resolution is the map spread over this frustum, so the frustum is the
  // real lever — but it also has a hard edge, and anything outside it simply
  // stops being shadowed. Pulled in to 16 that edge fell straight across the
  // grass as a visible diagonal. It now covers the lot and its whole verge; at
  // 4096 that is still a ~14 mm texel, which is finer than the maquette ever got.
  const S = REAL ? 30 : Math.max(24, radius * 6)
  sun.shadow.camera.left = -S
  sun.shadow.camera.right = S
  sun.shadow.camera.top = S
  sun.shadow.camera.bottom = -S
  sun.shadow.bias = REAL ? -0.00035 : -0.0006
  sun.shadow.normalBias = REAL ? 0.018 : 0.035
  scene.add(sun, sun.target)
  // The maquette needs a hemisphere to keep its shaded sides readable. Realistic
  // gets its sky light from the HDRI instead, so this drops to a trace — leaving
  // it at 0.85 was lifting every shadow off the ground.
  scene.add(new HemisphereLight(0xd2ecff, 0x8a7a5a, REAL ? 0.12 : 0.85))

  await stage()

  // ── ground: grass campus + the parking lot ────────────────────────
  const grassGeo = track(new PlaneGeometry(420, 420))
  const grassMat = track(new MeshStandardMaterial({ color: 0xa9b992, roughness: 1, metalness: 0 }))
  /**
   * Turf, procedurally.
   *
   * A flat colour over 420 units is the one surface big enough that its
   * flatness is unmissable — it reads as a green card the buildings are
   * standing on. Mottling it at 46 repeats puts variation at roughly a
   * two-metre wavelength, which is the scale real mown grass actually varies
   * at, and the short strokes give the tiles a grain so the repeat does not
   * announce itself as a grid.
   *
   * Its own PRNG, seeded independently, on purpose: this runs in the middle of
   * the build and every placement after it draws from the scene's `rng`. Taking
   * even one number from that stream here would shift every tree, building and
   * parked car in the scene.
   */
  {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 512
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#8fa851'
    ctx.fillRect(0, 0, 512, 512)
    let s = 90210
    const grnd = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296)
    for (let i = 0; i < 260; i++) {
      const px = grnd() * 512
      const py = grnd() * 512
      const pr = 18 + grnd() * 70
      const pa = 0.05 + grnd() * 0.13
      const tone = grnd()
      const col = tone < 0.45 ? '122,140,66' : tone < 0.8 ? '156,178,88' : '140,158,72'
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr)
      g.addColorStop(0, `rgba(${col},${pa})`)
      g.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fill()
    }
    // blades: barely visible individually, but they are what stops the mottling
    // from reading as smoke
    ctx.strokeStyle = 'rgba(96,116,50,0.16)'
    ctx.lineWidth = 1
    for (let i = 0; i < 900; i++) {
      const bx = grnd() * 512
      const by = grnd() * 512
      const bl = 2 + grnd() * 4
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + (grnd() - 0.5) * 2, by - bl)
      ctx.stroke()
    }
    const tex = track(new CanvasTexture(cv))
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(46, 46)
    tex.colorSpace = SRGBColorSpace
    grassMat.map = tex
    // the tint now lives in the texture; leaving the old colour on would
    // multiply through it and drag the whole campus olive
    grassMat.color.setHex(0xffffff)
    // noiseNormal already tracks what it returns
    grassMat.normalMap = noiseNormal(1.0, 44)
    grassMat.normalScale.set(0.5, 0.5)
    grassMat.needsUpdate = true
  }
  const grass = new Mesh(grassGeo, grassMat)
  grass.rotation.x = -Math.PI / 2
  grass.receiveShadow = true
  root.add(grass)

  const lotTex = track(lotTexture())
  const lotGeo = track(new PlaneGeometry(LOT_X * 2, LOT_Z * 2))
  const lotMat = track(
    new MeshStandardMaterial({
      map: lotTex,
      // asphalt is not uniformly matte — it polishes where tyres run and stays
      // coarse elsewhere, which is why a single roughness value reads as vinyl
      roughness: REAL ? 0.82 : 0.96,
      metalness: 0,
      ...(asphaltNormal ? { normalMap: asphaltNormal, normalScale: new Vector2(0.85, 0.85) } : {}),
    }),
  )
  const lot = new Mesh(lotGeo, lotMat)
  lot.rotation.x = -Math.PI / 2
  lot.position.y = 0.02
  lot.receiveShadow = true
  root.add(lot)

  // The lot is 30 m square and asphalt aggregate reads at roughly 2 m, so the
  // scan tiles 15 times across it. Getting this ratio wrong is the give-away
  // that separates a textured plane from a road. Surface only — the bay grid
  // stays the colour map.
  if (REAL) applyPbr(lotMat, 'asphalt', 15, { diffuse: false })

  // kerb around the lot — 220 mm upstand, which is a real kerb face
  const kerbMat = track(
    new MeshStandardMaterial({
      color: 0xe4e3df,
      roughness: REAL ? 0.78 : 0.9,
      metalness: 0,
      ...(concreteNormal ? { normalMap: concreteNormal, normalScale: new Vector2(0.5, 0.5) } : {}),
    }),
  )
  // kerbs are cast concrete units about a metre long, so the scan tiles densely
  if (REAL) applyPbr(kerbMat, 'concrete', 20)
  const kerbLR = track(new BoxGeometry(0.5, 0.22, LOT_Z * 2 + 1))
  const kerbTB = track(new BoxGeometry(LOT_X * 2 + 1, 0.22, 0.5))
  ;[-1, 1].forEach((s) => {
    const m = new Mesh(kerbLR, kerbMat)
    m.position.set(s * (LOT_X + 0.25), 0.11, 0)
    m.receiveShadow = true
    root.add(m)
    const n = new Mesh(kerbTB, kerbMat)
    n.position.set(0, 0.11, s * (LOT_Z + 0.25))
    n.receiveShadow = true
    root.add(n)
  })

  // A tight contact darkening right under the footprint. The sun already casts
  // the real shadow; anything wider than the unit itself reads as a grey slab
  // floating on the asphalt rather than as ambient occlusion.
  const aoCan = document.createElement('canvas')
  aoCan.width = aoCan.height = 256
  {
    const ctx = aoCan.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 126)
    g.addColorStop(0, 'rgba(10,12,14,0.3)')
    g.addColorStop(0.6, 'rgba(10,12,14,0.08)')
    g.addColorStop(1, 'rgba(10,12,14,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
  }
  const aoTex = track(new CanvasTexture(aoCan))
  const aoGeo = track(new PlaneGeometry(radius * 1.9, radius * 1.3))
  const aoMat = track(new MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }))
  const ao = new Mesh(aoGeo, aoMat)
  ao.rotation.x = -Math.PI / 2
  ao.position.y = 0.05
  root.add(ao)

  // Access road looping outside the lot. Its inner edge sits just clear of the
  // lot's 21.6-unit diagonal; see the note on LOT_X for why that number governs.
  // Widened from 22.5–26.5 to a full 14-unit carriageway, and up to 96 segments
  // so the inner kerb reads as a curve rather than a polygon at the camera's
  // closest approach. The extra width is what lets the ring read as a road the
  // campus is built along instead of a painted track around it.
  const roadGeo = track(new RingGeometry(20.5, 34.5, 96))
  const roadMat = track(new MeshStandardMaterial({ color: 0x9fa3a8, roughness: 0.92, metalness: 0 }))
  // the ring carries no markings of its own, so it takes the full scanned set
  if (REAL) applyPbr(roadMat, 'asphalt', 9)
  const road = new Mesh(roadGeo, roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.y = 0.01
  root.add(road)
  // dead centre of the new carriageway (20.5 + 34.5) / 2
  const lineGeo = track(new RingGeometry(27.42, 27.58, 96))
  const lineMat = track(new MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.85, metalness: 0 }))
  const centreLine = new Mesh(lineGeo, lineMat)
  centreLine.rotation.x = -Math.PI / 2
  centreLine.position.y = 0.02
  root.add(centreLine)

  await stage()

  // ── low-poly kit ──────────────────────────────────────────────────
  const dummy = new Object3D()
  const tmpColor = new Color()

  // Smooth, not faceted. Flat shading on chunky primitives is *the* tell that
  // reads as game art; the same silhouettes rendered with smooth normals and a
  // near-neutral palette read as an architect's site model instead — precise,
  // expensive, and quiet enough that the product is the only thing with colour.
  // Planting is faceted, per the low-poly tree references: visible flat planes,
  // brown trunks, clustered canopy blobs. The *buildings* stay smooth and white
  // (the isometric-city reference) — that split is deliberate. Faceted foliage
  // reads as craft; faceted architecture is what read as game art.
  // Realistic subdivides the same shapes rather than replacing them: the planting
  // scheme and its sizes are already right, and a 3-subdivision icosahedron with
  // smooth normals reads as a real canopy at this distance. Faceting is the whole
  // maquette conceit, so it is exactly what has to go.
  // The faceting is gone from the planting in BOTH builds. It was the maquette
  // conceit and it is what stopped the hero reading as a place — a two-subdivision
  // crown with smooth normals costs almost nothing at this instance count and is
  // the single change that moves the campus from game art to site model.
  const canopyGeo = track(new IcosahedronGeometry(1, 2))
  const pineGeo = track(new ConeGeometry(1, 1, REAL ? 24 : 7))
  const trunkGeo = track(new CylinderGeometry(0.13, 0.2, 1, 10))
  const rockGeo = track(new IcosahedronGeometry(1, REAL ? 2 : 1))
  const boxGeo = track(new BoxGeometry(1, 1, 1))

  /**
   * Car bodywork, by pushing the top face of a box around.
   *
   * Everything here is instanced, so the shapes have to be unit geometries that
   * a per-instance matrix can scale — which rules out modelling a car and rules
   * in deforming the one box every instance already shares. Narrowing the top
   * face alone (`taper`) turns a rectangle into a greenhouse; adding z segments
   * and giving each one its own height turns it into a bonnet, a roofline and a
   * boot. It is three lines of vertex maths and it is the difference between a
   * car park of crates and a car park of cars.
   *
   * `profile` is keyed off the vertex's own z, so the caller writes the
   * silhouette front-to-back and does not have to know the segment count.
   */
  const shapeTop = (geo: BufferGeometry, taper: number, profile: (z: number) => number) => {
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) <= 0) continue // the floor pan stays a rectangle
      pos.setX(i, pos.getX(i) * taper)
      pos.setY(i, profile(pos.getZ(i)))
    }
    geo.computeVertexNormals()
    return geo
  }

  // a saloon's greenhouse: narrower than the body, and set back off the bonnet
  const cabinGeo = track(
    (() => {
      const g = new BoxGeometry(1, 1, 1)
      const pos = g.attributes.position
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) <= 0) continue
        pos.setX(i, pos.getX(i) * 0.82)
        pos.setZ(i, pos.getZ(i) * 0.72 - 0.06)
      }
      g.computeVertexNormals()
      return g
    })(),
  )
  // the pickup: a raked screen, a flat cab roof and a bed dropped behind it
  const truckCabinGeo = track(
    shapeTop(new BoxGeometry(1, 1, 1, 1, 1, 4), 0.66, (z) =>
      z > 0.45 ? -0.25 : z > 0.2 ? 0.29 : z < -0.45 ? 0.1 : z < -0.2 ? 0.29 : 0.5,
    ),
  )

  const leafMat = track(new MeshStandardMaterial({ roughness: 0.85, metalness: 0 }))
  const trunkMat = track(
    new MeshStandardMaterial({
      color: 0x7d5a3c,
      roughness: 0.95,
      metalness: 0,
      ...(concreteNormal ? { normalMap: concreteNormal, normalScale: new Vector2(0.7, 0.7) } : {}),
    }),
  )
  /**
   * Wind, in the vertex shader.
   *
   * The planting is instanced — thousands of crowns in three draw calls — so
   * swaying it on the CPU would mean rewriting every instance matrix each frame.
   * Instead the displacement happens per-vertex on the GPU and costs nothing per
   * tree; the only per-frame work is advancing one float.
   *
   * The phase deliberately runs at a LOW spatial frequency (~35m wavelength). A
   * broadleaf is not one object: it is a trunk plus three or four separate
   * canopy blobs pushed off-centre by up to ~1.5m. Phase is derived from each
   * instance's own position, so a high frequency would give those blobs
   * different phases and the crown would visibly pull itself apart. At 0.18 the
   * phase difference across one tree is ~0.25rad — a relative drift of a few
   * centimetres, invisible — while trees at opposite ends of the campus are
   * comfortably out of step.
   *
   * Two sine terms at unrelated frequencies keep it from reading as a metronome.
   */
  const wind = { value: 0 }
  const applyWind = (mat: MeshStandardMaterial) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = wind
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            {
              vec3 iPos = instanceMatrix[3].xyz;
              // horizontal scale of this instance; the offset is divided by it so
              // the sway is a fixed distance in metres rather than growing with
              // the tree. Column 0 is the x axis, which for every planting type
              // here carries the same scale as z.
              float sx = max(length(instanceMatrix[0].xyz), 0.0001);
              float sy = length(instanceMatrix[1].xyz);
              // Height of THIS VERTEX above the ground — not of the instance
              // origin. That distinction is the whole trick: a trunk's origin
              // sits at half its height and a crown's at its centre, so keying
              // the bend to the origin made the crown swing four times further
              // than the trunk top it is supposed to be sitting on. Keyed to the
              // vertex, the profile is continuous across the junction and the
              // tree bends as one piece.
              float wy = max(iPos.y + position.y * sy, 0.0);
              float ph = iPos.x * 0.18 + iPos.z * 0.14;
              float gust = sin(uWind * 1.24 + ph) * 0.62 + sin(uWind * 0.37 + ph * 1.9) * 0.38;
              // >1 exponent: a cantilever bends little near the base and most at
              // the tip, and it pins the offset to zero at ground level so trunks
              // stay planted instead of sliding across the grass
              float bend = pow(clamp(wy / 6.0, 0.0, 1.6), 1.4);
              // ~70% further than before: at the old amplitude the canopy read as
              // still in a wide shot, which made the whole campus look frozen
              transformed.xz += vec2(gust * 0.34 * bend, gust * 0.16 * bend) / sx;
            }
          #endif`,
        )
    }
    mat.customProgramCacheKey = () => 'wind'
  }
  applyWind(leafMat)
  applyWind(trunkMat)

  const rockMat = track(
    new MeshStandardMaterial({ roughness: 0.9, metalness: 0, flatShading: !REAL }),
  )
  // rooftop PV, straight off the reference city — and on-brand for an energy company
  const pvMat = track(new MeshStandardMaterial({ color: 0x3f4a5c, roughness: 0.3, metalness: 0.5 }))
  const plainMat = track(new MeshStandardMaterial({ roughness: 0.65, metalness: 0.05 }))
  const carMat = track(new MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 }))
  const glassMat = track(new MeshStandardMaterial({ color: 0x64707d, roughness: 0.25, metalness: 0.45 }))
  const tyreMat = track(new MeshStandardMaterial({ color: 0x3c3f45, roughness: 0.85, metalness: 0 }))
  // recessed glazing for the model buildings: a thin dark inset, not a texture
  const bandMat = track(new MeshStandardMaterial({ color: 0x7b8794, roughness: 0.35, metalness: 0.35 }))

  type Placement = { m: Matrix4; c: Color }
  const canopies: Placement[] = []
  const pines: Placement[] = []
  const trunks: Placement[] = []
  const rocks: Placement[] = []
  const plains: Placement[] = []
  const carBodies: Placement[] = []
  const carCabins: Placement[] = []
  const truckCabins: Placement[] = []
  const wheels: Placement[] = []
  /** where each parked car ended up, so the real model can be seated there later */
  const parkedSpots: Array<{ x: number; z: number; r: number }> = []

  const push = (arr: Placement[], pos: Vector3, scale: Vector3, rotY: number, color: Color) => {
    dummy.position.copy(pos)
    dummy.scale.copy(scale)
    dummy.rotation.set(0, rotY, 0)
    dummy.updateMatrix()
    arr.push({ m: dummy.matrix.clone(), c: color.clone() })
  }

  // Model-shop greens with the chroma turned back up about halfway: enough life
  // that the campus feels planted rather than embalmed, still far short of the
  // primary greens that read as cartoon. Value range stays tight so the canopy
  // holds together as one mass.
  const GREENS = [0x7c9c63, 0x89a870, 0x6d8c58, 0x95b27b, 0x5f7d4e]
  // the reference trees are two-tone: a darker main mass with lighter clusters
  // catching the light on top. That contrast is what gives them their character.
  const LIGHT_GREENS = [0x9dbb7d, 0xa8c489, 0x93b273]
  const greenAt = (t: number) => tmpColor.setHex(GREENS[Math.floor(t * GREENS.length) % GREENS.length])
  const lightGreenAt = (t: number) =>
    tmpColor.setHex(LIGHT_GREENS[Math.floor(t * LIGHT_GREENS.length) % LIGHT_GREENS.length])

  const broadleaf = (x: number, z: number, s: number) => {
    const h = (2.6 + rng() * 1.8) * s
    push(trunks, new Vector3(x, h * 0.5, z), new Vector3(s, h, s), rng() * Math.PI, tmpColor.setHex(0x7d5a3c))
    // one dominant mass, then two or three smaller clusters pushed off-centre and
    // upward in a lighter green — the silhouette in the reference packs
    const main = (1.55 + rng() * 0.5) * s
    push(
      canopies,
      new Vector3(x, h + main * 0.55, z),
      new Vector3(main, main * (0.82 + rng() * 0.2), main),
      rng() * Math.PI,
      greenAt(rng()),
    )
    const clusters = 2 + Math.floor(rng() * 2)
    for (let i = 0; i < clusters; i++) {
      const r = main * (0.42 + rng() * 0.3)
      const a = rng() * Math.PI * 2
      const reach = main * (0.5 + rng() * 0.4)
      push(
        canopies,
        new Vector3(
          x + Math.cos(a) * reach,
          h + main * (0.75 + rng() * 0.6),
          z + Math.sin(a) * reach,
        ),
        new Vector3(r, r * (0.85 + rng() * 0.25), r),
        rng() * Math.PI,
        rng() > 0.35 ? lightGreenAt(rng()) : greenAt(rng()),
      )
    }
  }

  const conifer = (x: number, z: number, s: number) => {
    const h = (3.0 + rng() * 2.2) * s
    push(trunks, new Vector3(x, h * 0.28, z), new Vector3(s * 0.8, h * 0.56, s * 0.8), 0, tmpColor.setHex(0x6d4e34))
    for (let i = 0; i < 3; i++) {
      const t = i / 3
      const r = (1.7 - t * 0.6) * s
      const th = (2.0 - t * 0.4) * s
      push(pines, new Vector3(x, h * 0.45 + i * th * 0.46, z), new Vector3(r, th, r), rng() * Math.PI, greenAt(rng() * 0.6))
    }
  }

  const rock = (x: number, z: number, s: number) => {
    const g = 0.55 + rng() * 0.22
    push(rocks, new Vector3(x, s * 0.34, z), new Vector3(s, s * (0.6 + rng() * 0.4), s * (0.8 + rng() * 0.5)), rng() * Math.PI, tmpColor.setRGB(g * 0.98, g, g * 1.03))
  }

  const shrub = (x: number, z: number, s: number) => {
    push(canopies, new Vector3(x, s * 0.5, z), new Vector3(s, s * (0.62 + rng() * 0.3), s), rng() * Math.PI, greenAt(0.35 + rng() * 0.6))
  }

  /**
   * A parked car: body, cabin, four wheels.
   *
   * Roughly a third come out as the taller, longer pickup silhouette. A car park
   * where every vehicle is the same box is the kind of detail nobody consciously
   * notices and everybody reads as CG, and the two profiles are far enough apart
   * in height and length to break the row up from any angle.
   *
   * Every spot is also recorded, because once the real vehicle model finishes
   * loading these boxes are thrown away and a clone is seated at each of these
   * positions instead — see the loader below.
   */
  const CAR_COLORS = [0xf2f3f4, 0xe4e7ea, 0xd3d8dd, 0xb9c0c7, 0xf7f8f9, 0x9aa4ad, 0x8896a3]
  const car = (x: number, z: number, rotY: number) => {
    parkedSpots.push({ x, z, r: rotY })
    const truck = rng() < 0.32
    const col = truck
      ? tmpColor.setRGB(0.8, 0.82, 0.85).clone()
      : tmpColor.setHex(CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)]).clone()
    const s = Math.sin(rotY)
    const c = Math.cos(rotY)
    /** the bays run down the lot's z axis, so body parts are offset along local z */
    const at = (ox: number, oz: number, y: number) =>
      new Vector3(x + ox * c - oz * s, y, z + ox * s + oz * c)

    let dx: number
    let dz: number
    if (truck) {
      push(carBodies, at(0, 0, 0.62), new Vector3(2, 0.58, 5.2), rotY, col)
      // in body colour, not glass: the cabin is the shape that says pickup
      push(truckCabins, at(0, 0, 1.12), new Vector3(1.9, 0.62, 3.4), rotY, col)
      dx = 0.92
      dz = 1.75
    } else {
      push(carBodies, at(0, 0, 0.48), new Vector3(1.82, 0.52, 4.25), rotY, col)
      // bonnet and boot: two shallow slabs either end, which is all it takes to
      // stop the profile reading as a single extruded rectangle
      push(carBodies, at(0, 1.52, 0.8), new Vector3(1.76, 0.2, 1.05), rotY, col)
      push(carBodies, at(0, -1.62, 0.79), new Vector3(1.76, 0.18, 0.85), rotY, col)
      push(carCabins, at(0, -0.15, 1.02), new Vector3(1.6, 0.55, 2.1), rotY, col)
      dx = 0.82
      dz = 1.45
    }
    const wheelY = truck ? 0.36 : 0.32
    const wheelS = truck ? 0.38 : 0.32
    ;[[-dx, -dz], [dx, -dz], [-dx, dz], [dx, dz]].forEach(([ox, oz]) => {
      push(
        wheels,
        at(ox, oz, wheelY),
        new Vector3(wheelS, wheelS, wheelS),
        rotY,
        tmpColor.setHex(0x1c1d20),
      )
    })
  }

  await stage()

  // ── buildings ─────────────────────────────────────────────────────
  // Three archetypes, each its own instanced draw so the window grid stays the
  // right density for the block's height. Per-instance colour supplies the
  // warm Cyberjaya palette; the punched windows stay dark through the tint.
  // clean architectural whites and cool greys — a modern tech park, not a
  // pastel toy town. The terracotta and sage tones read cheap at this scale.
  // A tight, near-monochrome range of model whites. Painted-on window grids are
  // what made these read as toy town; a clean volume with a crisp recessed
  // glazing line is how an architectural model states "office building".
  const FACADES = [0xf6f5f2, 0xefeeea, 0xe7e6e2, 0xdedddA, 0xe3e5e6, 0xd6d8da]
  const bands: Placement[] = []
  const pvs: Placement[] = []

  const building = (x: number, z: number, rotY: number, kind: 'low' | 'mid' | 'tower') => {
    const facade = tmpColor.setHex(FACADES[Math.floor(rng() * FACADES.length)]).clone()
    let w: number, d: number, h: number
    if (kind === 'low') {
      w = 9 + rng() * 5
      d = 9 + rng() * 5
      h = 6 + rng() * 4
    } else if (kind === 'mid') {
      w = 9 + rng() * 4
      d = 9 + rng() * 4
      h = 13 + rng() * 7
    } else {
      w = 8 + rng() * 4
      d = 8 + rng() * 4
      // 18–30, down from 24–44. The tallest blocks were crossing the headline
      // and competing with the unit for the top of the frame.
      h = 18 + rng() * 12
    }
    push(plains, new Vector3(x, h / 2, z), new Vector3(w, h, d), rotY, facade)

    // continuous glazing, inset a hair so it reads as a shadow line in the
    // facade rather than a stripe painted on it
    const floors = Math.max(2, Math.round(h / 3.6))
    const band = tmpColor.setHex(0x8c98a4).clone()
    for (let i = 0; i < floors; i++) {
      const y = (h / floors) * (i + 0.55)
      if (y > h - 0.8) break
      push(bands, new Vector3(x, y, z), new Vector3(w * 0.985, (h / floors) * 0.34, d * 0.985), rotY, band)
    }

    // parapet and a stepped upper volume on some blocks — the silhouette does
    // the work now that the surface is quiet
    push(plains, new Vector3(x, h + 0.18, z), new Vector3(w * 1.03, 0.36, d * 1.03), rotY, tmpColor.setHex(0xf2f1ee))
    if (rng() > 0.55) {
      const h2 = h * (0.16 + rng() * 0.22)
      push(plains, new Vector3(x, h + h2 / 2 + 0.36, z), new Vector3(w * 0.52, h2, d * 0.52), rotY, facade)
    }
    push(
      plains,
      new Vector3(x + (rng() - 0.5) * w * 0.25, h + 0.9, z + (rng() - 0.5) * d * 0.25),
      new Vector3(w * 0.2, 1.1, d * 0.2),
      rotY,
      tmpColor.setHex(0xe2e1dd),
    )

    // rooftop PV arrays on roughly half the blocks. In the reference city they
    // are what stops a field of white boxes reading as blank — and on this site
    // they quietly say the whole district runs the way the product does.
    if (rng() > 0.45) {
      const rows = 1 + Math.floor(rng() * 2)
      for (let r = 0; r < rows; r++) {
        push(
          pvs,
          new Vector3(x + (r - (rows - 1) / 2) * d * 0.28, h + 0.5, z + (rng() - 0.5) * d * 0.2),
          new Vector3(w * 0.42, 0.12, d * 0.2),
          rotY,
          tmpColor.setHex(0x3f4a5c),
        )
      }
    }
  }

  await stage()

  // ── the world ─────────────────────────────────────────────────────
  // 1 · cars in the outer bays only (a car near the camera would fill the frame)
  ROWS.forEach(([z0, z1]) => {
    const zc = (z0 + z1) / 2
    const first = Math.ceil(-LOT_X / BAY_W) * BAY_W
    for (let x = first; x <= LOT_X - BAY_W; x += BAY_W) {
      const cx = x + BAY_W / 2 // park in the middle of the bay, not on a line
      if (Math.hypot(cx, zc) < SAFE_R) continue
      if (rng() > 0.5) continue
      car(cx, zc, 0)
    }
  })

  // 2 · planted verges down the outside of the lot.
  //
  // These were positioned as `LOT_X - 3 - rng() * 4`, written when the lot was
  // 21 wide. Narrowing it to 15 to bring the road in turned that into 8-to-13 —
  // so the "islands" moved onto the asphalt and put mature trees inside the car
  // park, one of them right beside the unit. A radius check against SAFE_R let
  // them through because distance from the centre was never the problem.
  //
  // Now they sit on the grass beyond the kerb (15.25) and short of the road
  // (22.5), placed along a side rather than a diagonal — the corners have no
  // verge to speak of, since that is exactly where the lot reaches furthest.
  for (let i = 0; i < 6; i++) {
    const onXAxis = i % 2 === 0
    const sign = i < 3 ? -1 : 1
    const out = sign * (17 + rng() * 4) // clear of the kerb, short of the road
    const along = (rng() - 0.5) * 26 // anywhere down that side of the lot
    const x = onXAxis ? out : along
    const z = onXAxis ? along : out
    broadleaf(x, z, 0.8 + rng() * 0.4)
    shrub(x + (rng() - 0.5) * 3, z + (rng() - 0.5) * 2, 0.5)
  }

  // 3 · the campus ring: alternating built and planted plots, ~50/50
  const PLOTS = 30
  for (let i = 0; i < PLOTS; i++) {
    const a = (i / PLOTS) * Math.PI * 2 + (rng() - 0.5) * 0.1
    // follows the road inward, so the campus still lines it rather than
    // floating off on its own
    // pushed out from 31–55 to 46–72: the road is 8 units wider now, and at the
    // old radius the near buildings were standing on its outer edge
    const rr = 46 + rng() * 26
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr
    // keep the headline side lower and greener
    const headlineSide = x < -14 && rr < 52

    // every sixth plot built rather than every second: at 50/50 the ring closed
    // into a continuous wall of blocks that hid the skyline behind it
    if (!headlineSide && i % 6 === 0) {
      const n = 1 + Math.floor(rng() * 2)
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * (15 + rng() * 6)
        building(
          x + Math.cos(a + Math.PI / 2) * off,
          z + Math.sin(a + Math.PI / 2) * off,
          -a + (rng() - 0.5) * 0.3,
          rng() > 0.55 ? 'mid' : 'low',
        )
      }
      for (let k = 0; k < 3; k++) {
        broadleaf(
          x + Math.cos(a + Math.PI / 2) * (rng() - 0.5) * 20 - Math.cos(a) * (9 + rng() * 4),
          z + Math.sin(a + Math.PI / 2) * (rng() - 0.5) * 20 - Math.sin(a) * (9 + rng() * 4),
          0.85 + rng() * 0.45,
        )
      }
    } else {
      const n = 4 + Math.floor(rng() * 3)
      for (let k = 0; k < n; k++) {
        const s = (0.85 + rng() * 0.8) * (headlineSide ? 0.72 : 1)
        const px2 = x + (rng() - 0.5) * 18
        const pz2 = z + (rng() - 0.5) * 18
        if (rng() > 0.3) broadleaf(px2, pz2, s)
        else conifer(px2, pz2, s)
      }
    }
  }

  // 4 · skyline, hazing into the sky, with canopy between so it isn't a wall
  // 10 towers, not 24: with the ring thinned out these are what the eye now
  // reads as the far city, and 24 of them put a horizon of blocks behind the unit
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2
    const rr = 74 + rng() * 48
    building(Math.cos(a) * rr, Math.sin(a) * rr, rng() * Math.PI, 'tower')
  }
  for (let i = 0; i < 44; i++) {
    const a = rng() * Math.PI * 2
    const rr = 68 + rng() * 54
    broadleaf(Math.cos(a) * rr, Math.sin(a) * rr, 1.4 + rng() * 1.0)
  }

  // 5 · verge detail between the lot and the road — ankle height only.
  // Bounded by the road's inner edge at 22.5; the band used to run to 26 and
  // would now be scattering shrubs across the asphalt.
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2
    const rr = 15.5 + rng() * 6.5
    const x = Math.cos(a) * rr
    const z = Math.sin(a) * rr
    if (Math.abs(x) < LOT_X + 1 && Math.abs(z) < LOT_Z + 1) continue // stay off the asphalt
    // Strictly what the heading says. This branch used to plant a broadleaf one
    // roll in five — a 2-to-5 metre tree, 15 m out, inside the band the occlusion
    // rule reserves for ankle height. That is the tree that kept standing in
    // front of the product. Trees start at the campus ring and no closer.
    const roll = rng()
    if (roll < 0.62) shrub(x, z, 0.45 + rng() * 0.5)
    else rock(x, z, 0.3 + rng() * 0.45)
  }

  // 6 · distant hills
  const hillGeo = track(new IcosahedronGeometry(1, 1))
  const hillMat = track(new MeshStandardMaterial({ color: 0xb4c1ab, roughness: 1, metalness: 0 }))
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2
    const rr = 165 + rng() * 85
    const s = 28 + rng() * 42
    const h = new Mesh(hillGeo, hillMat)
    h.position.set(Math.cos(a) * rr, -s * 0.35, Math.sin(a) * rr)
    h.scale.set(s, s * (0.4 + rng() * 0.3), s)
    root.add(h)
  }

  await stage()

  // ── traffic on the ring road ──────────────────────────────────────
  // One vehicle circulating is the cheapest possible sign of life; a completely
  // static world reads as a diorama no matter how well it's lit. More than one
  // starts competing with the product for attention, which is the opposite of
  // what the hero is for. It's a real mesh rather than an instance because it
  // moves each frame.
  //
  // The asphalt ring runs from r=22.5 to r=26.5, so the lane sits at 23.8. The
  // body is 1.8 wide, but it rides tangent to the curve, so it's the inner front
  // corner that comes closest to the kerb — about 23.0 out, not 22.9. Anything
  // much inside that band is driving across the grass.
  const LANE_R = 23.8
  const traffic: Array<{ g: Group; a: number; speed: number; r: number }> = []
  const carSlots: Array<{ g: Group }> = []
  {
    // This one is a real mesh rather than an instance, so unlike the parked cars
    // it can afford a shaped body outright: bonnet, roofline and a dropped tail
    // in one geometry.
    const bodyGeo = track(
      shapeTop(new BoxGeometry(2, 1.2, 5.2, 1, 1, 4), 0.66, (z) =>
        z > 2.3 ? -0.3 : z > 1 ? 0.35 : z < -2.3 ? 0.12 : z < -1 ? 0.35 : 0.6,
      ),
    )
    const roofGeo = track(new BoxGeometry(1.52, 0.34, 2.3))
    const tw = track(new CylinderGeometry(0.36, 0.36, 0.34, 12))
    tw.rotateZ(Math.PI / 2)
    const g = new Group()
    // A fixed near-mirror silver rather than one of the parked-car pastels. It is
    // the only moving thing in the scene, so it is the only one that picks up a
    // travelling highlight off the sky — which is what makes it read as moving
    // from a distance where the actual displacement is a few pixels a second.
    const paint = track(
      new MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.22, metalness: 0.75 }),
    )
    const body = new Mesh(bodyGeo, paint)
    body.position.y = 1.02
    body.castShadow = true
    g.add(body)
    const cabin = new Mesh(roofGeo, glassMat)
    cabin.position.set(0, 1.36, 0.1)
    cabin.castShadow = true
    g.add(cabin)
    // Lamp bars. Emissive, so they hold their brightness on the shadowed side of
    // the ring where the body itself goes dark and the car would otherwise
    // disappear into the treeline for half of every lap.
    const headMat = track(
      new MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.1,
      }),
    )
    const lampGeo = track(new BoxGeometry(1.16, 0.06, 0.05))
    const head = new Mesh(lampGeo, headMat)
    head.position.set(0, 0.92, 2.62)
    g.add(head)
    const tailMat = track(
      new MeshStandardMaterial({
        color: 0xff0033,
        emissive: 0xcc0021,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.1,
      }),
    )
    const tail = new Mesh(lampGeo, tailMat)
    tail.position.set(0, 1.14, -2.62)
    g.add(tail)
    ;[[-0.92, -1.75], [0.92, -1.75], [-0.92, 1.75], [0.92, 1.75]].forEach(([ox, oz]) => {
      const w = new Mesh(tw, tyreMat)
      w.position.set(ox, 0.36, oz)
      g.add(w)
    })
    root.add(g)
    traffic.push({
      g,
      a: rng() * Math.PI * 2,
      // a lap of the ring in a little over a minute. At 0.055 the car was slow
      // enough that a viewer had to watch for several seconds to be sure it was
      // moving at all, which defeats the point of having it.
      speed: 0.09,
      r: LANE_R,
    })
    carSlots.push({ g })
  }

  // Swap the placeholder boxes for a real vehicle if one is present in /models.
  // Loading is optional and asynchronous: a missing or broken file simply leaves
  // the low-poly cars on the road rather than emptying it, so the scene never
  // depends on an asset that may not be there.
  {
    /** Drop `src` into every traffic slot, normalised onto the road. */
    const adopt = (src: Object3D) => {
      // An authoring-tool export carries the whole scene, not just the vehicle.
      // Three kinds of passenger have to come off before anything is measured:
      //
      //  · lights and cameras — cloned once per car they blow past
      //    MAX_TEXTURE_IMAGE_UNITS and the material stops compiling;
      //  · rig control shapes — zero-volume helper meshes the animation rig
      //    draws its handles from, invisible but counted;
      //  · a studio backdrop — one enormous plane the vehicle was rendered
      //    against, which otherwise sets the scale for everything.
      const strays: Object3D[] = []
      src.traverse((o) => {
        if ((o as { isLight?: boolean }).isLight || (o as { isCamera?: boolean }).isCamera) {
          strays.push(o)
        }
      })
      strays.forEach((o) => o.removeFromParent())

      const extent = (o: Object3D) => {
        const s = new Box3().setFromObject(o).getSize(new Vector3())
        return Math.max(s.x, s.y, s.z)
      }
      let solids: Mesh[] = []
      src.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        if (extent(m) < 1e-6) m.visible = false // rig handle, nothing to draw
        else solids.push(m)
      })
      // Backdrops are recognised by being wildly out of proportion with the
      // model itself rather than by name, which no exporter agrees on. Peel off
      // the largest part while it dwarfs the next one down; a real vehicle's
      // panels are all within a few times each other, so this stops on its own.
      solids.sort((a, b) => extent(b) - extent(a))
      while (solids.length > 1 && extent(solids[0]) > extent(solids[1]) * 3) {
        solids[0].removeFromParent()
        solids = solids.slice(1)
      }

      // The FBX carries no usable texture paths, and a bare stainless body is
      // both true to the vehicle and consistent with the monochrome scale-model
      // look of the rest of the site — so every surface gets one steel material.
      // `side: DoubleSide` throughout is belt and braces alongside the winding fix
      // below: game-ready vehicle meshes often have genuinely single-sided panels,
      // which have no back face to show at all. Drawing both sides costs nothing
      // meaningful for one vehicle and guarantees no holes.
      //
      // Three materials rather than one. The single grey shell made a metal that
      // could not behave like metal — 0.42 roughness at 0.65 metalness has too
      // little reflection to read as steel and too much to read as paint, so it
      // landed on grey plastic. Real stainless is nearly a mirror: it looks like
      // metal by reflecting its surroundings, which is why it needs the low
      // roughness and why it only comes alive in V2, where there is a captured sky
      // for it to pick up.
      // A metal has no colour of its own — it is only what it reflects. At 0.94
      // metalness that is correct in V2, where a captured sky gives it something
      // to reflect, and catastrophic in V1, where the painted dome gives it almost
      // nothing: the truck rendered black. So the finish follows the world it is
      // standing in. V1 gets a light, mostly-diffuse panel that belongs in a
      // monochrome scale model; V2 gets the near-mirror stainless.
      const steel = track(
        new MeshStandardMaterial({
          color: REAL ? 0xc4c9d0 : 0xd7dbe1,
          roughness: REAL ? 0.2 : 0.52,
          metalness: REAL ? 0.94 : 0.12,
          side: DoubleSide,
        }),
      )
      const rubber = track(
        new MeshStandardMaterial({
          color: 0x14161a,
          roughness: 0.88, // tyres are the least reflective thing on a car
          metalness: 0.03,
          side: DoubleSide,
        }),
      )
      const glass = track(
        new MeshStandardMaterial({
          // same reasoning as the steel: reflective glazing needs something to
          // reflect, so V1 uses a plainly dark panel instead of a mirror
          color: REAL ? 0x0a0c10 : 0x2b313b,
          roughness: REAL ? 0.09 : 0.4,
          metalness: REAL ? 0.5 : 0.08,
          side: DoubleSide,
        }),
      )

      // Bake the vehicle into plain static meshes rather than cloning the file's
      // own hierarchy. The export is rigged, and its panels are skinned meshes
      // driven by an armature: `clone()` copies a skinned mesh without rebinding
      // it to a skeleton, so the copies keep correct bounds — which is why they
      // measure fine — while drawing nothing at all. Folding each mesh's world
      // matrix into its geometry drops the rig entirely and leaves a rigid model,
      // which is all a car circling in the background needs to be.
      src.updateMatrixWorld(true)
      const proto = new Group()
      solids.forEach((m) => {
        const g2 = track(m.geometry.clone())
        g2.applyMatrix4(m.matrixWorld)

        // Vehicle models are almost always built one side and mirrored, and a
        // mirror is a negative scale. Folding that matrix into the geometry
        // reverses the triangle winding on every mirrored panel, so those faces
        // end up pointing inward: back-face culling then removes them and one
        // whole side of the truck goes missing. Re-reverse the winding on the
        // affected meshes and rebuild their normals to match.
        if (m.matrixWorld.determinant() < 0) {
          const idx = g2.getIndex()
          if (idx) {
            for (let i = 0; i < idx.count; i += 3) {
              const a = idx.getX(i)
              idx.setX(i, idx.getX(i + 2))
              idx.setX(i + 2, a)
            }
            idx.needsUpdate = true
          } else {
            // non-indexed: an index is the cheapest way to express the new order
            const n = g2.attributes.position.count
            const order: number[] = []
            for (let i = 0; i < n; i += 3) order.push(i + 2, i + 1, i)
            g2.setIndex(order)
          }
          g2.computeVertexNormals()
        }

        // Wheels carry their own name in this export ("WBL_b1", "WBL_b1002"…),
        // so rubber can be assigned outright.
        const isWheel = /^wbl/i.test(m.name)

        // Glass cannot. This FBX has exactly eight solid meshes — four wheels,
        // three bumpers and one "body" — so the windows are not separate geometry
        // and no material assignment can reach them. What *is* true of this
        // vehicle is that its greenhouse is the upper wedge of the shell, so the
        // body is split by height: the top band becomes glass, the rest steel.
        // A shape-based split like this only works because the Cybertruck has no
        // curved roof to speak of; on a conventional car it would blacken the roof.
        let mat: MeshStandardMaterial | MeshStandardMaterial[] = isWheel ? rubber : steel
        if (!isWheel && /body/i.test(m.name)) {
          g2.computeBoundingBox()
          const bb = g2.boundingBox!
          const span = bb.max.y - bb.min.y || 1
          const pos = g2.attributes.position
          const idx = g2.getIndex()
          const order = idx
            ? Array.from(idx.array as ArrayLike<number>)
            : Array.from({ length: pos.count }, (_, i) => i)
          const lower: number[] = []
          const upper: number[] = []
          for (let t = 0; t < order.length; t += 3) {
            const a = order[t]
            const b = order[t + 1]
            const c = order[t + 2]
            const yc = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3
            ;((yc - bb.min.y) / span > TRUCK_GLASS_FROM ? upper : lower).push(a, b, c)
          }
          g2.setIndex([...lower, ...upper])
          g2.clearGroups()
          g2.addGroup(0, lower.length, 0)
          g2.addGroup(lower.length, upper.length, 1)
          mat = [steel, glass]
        }

        const baked = new Mesh(g2, mat)
        baked.castShadow = true
        baked.receiveShadow = true
        proto.add(baked)
      })

      // normalise: drop it on the road, nose along +z, scaled to ~4.6 long
      const box = new Box3().setFromObject(proto)
      const size = box.getSize(new Vector3())
      const centre = box.getCenter(new Vector3())
      const longest = Math.max(size.x, size.z) || 1
      const scale = 5.22 / longest
      carSlots.forEach((t) => {
        // Two wrappers: one scales the model and seats it on the road surface,
        // the one outside turns it. Splitting them keeps the turn from swinging
        // the centring offset out with it.
        const seat = new Group()
        seat.add(proto.clone(true))
        seat.scale.setScalar(scale)
        // offsets live in the parent's space, so they are expressed in scaled units
        seat.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale)

        const holder = new Group()
        holder.add(seat)
        // Traffic drives along its group's local +z, so a model laid out down the
        // x axis needs a quarter turn. Which way to turn depends on which end of
        // that axis the nose is on, and nothing in the file records it — this one
        // faces −x, so the turn goes anticlockwise. Flip the sign if a future
        // model arrives driving in reverse.
        if (size.x > size.z) holder.rotation.y = -Math.PI / 2
        t.g.clear()
        t.g.add(holder)
      })

      // The car park gets the real vehicle too, not just the one on the road.
      // The lot is the closest ground to the camera and the boxes were legible
      // as boxes there; one static clone per bay is cheap next to the 3.4M
      // triangles of parked bikes already in the frame.
      parkedSpots.forEach((spot) => {
        const seat = new Group()
        seat.add(proto.clone(true))
        seat.scale.setScalar(scale)
        seat.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale)
        const holder = new Group()
        holder.add(seat)
        holder.position.set(spot.x, 0, spot.z)
        holder.rotation.y = spot.r + (size.x > size.z ? -Math.PI / 2 : 0)
        root.add(holder)
      })
      // and the placeholders they replace never get built — this runs before the
      // instanced draws are assembled, and an empty list makes no InstancedMesh
      carBodies.length = 0
      carCabins.length = 0
      truckCabins.length = 0
      wheels.length = 0
    }

    // FBX first (the supplied Cybertruck), then glTF, so either format works.
    //
    // Awaited, where it used to be fire-and-forget. `adopt` now empties the
    // parked-car placement lists, and that only means anything if it happens
    // before the instanced draws are assembled below — otherwise the boxes get
    // built anyway and the real vehicles are seated on top of them. Every path
    // out of here resolves, including both failures, so a missing model delays
    // the build by one failed request rather than hanging it.
    await new Promise<void>((done) => {
      new FBXLoader().load(
        `${MODELS_BASE}/cybertruck.fbx`,
        (fbx) => {
          adopt(fbx)
          done()
        },
        undefined,
        () => {
          new GLTFLoader().load(
            `${MODELS_BASE}/car.glb`,
            (gltf) => {
              adopt(gltf.scene)
              done()
            },
            undefined,
            // no vehicle model present: the placeholder cars stay
            () => done(),
          )
        },
      )
    })
  }

  const updateTraffic = (dt: number) => {
    traffic.forEach((t) => {
      t.a += t.speed * dt
      t.g.position.set(Math.cos(t.a) * t.r, 0, Math.sin(t.a) * t.r)
      // the body's long axis is local +z; face it along the tangent of travel
      t.g.rotation.y = t.speed > 0 ? -t.a : -t.a + Math.PI
    })
  }
  updateTraffic(0)

  await stage()

  // ── instanced draws ───────────────────────────────────────────────
  const mkInstanced = (geo: BufferGeometry, mat: MeshStandardMaterial, list: Placement[]) => {
    if (!list.length) return null
    const im = new InstancedMesh(geo, mat, list.length)
    list.forEach((p, i) => {
      im.setMatrixAt(i, p.m)
      im.setColorAt(i, p.c)
    })
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.castShadow = true
    im.receiveShadow = true
    im.frustumCulled = false
    root.add(im)
    return im
  }
  const wheelGeo = track(new CylinderGeometry(1, 1, 0.9, 8))
  wheelGeo.rotateZ(Math.PI / 2)

  const instanced = [
    mkInstanced(canopyGeo, leafMat, canopies),
    mkInstanced(pineGeo, leafMat, pines),
    mkInstanced(trunkGeo, trunkMat, trunks),
    mkInstanced(rockGeo, rockMat, rocks),
    mkInstanced(boxGeo, plainMat, plains),
    mkInstanced(boxGeo, carMat, carBodies),
    mkInstanced(cabinGeo, glassMat, carCabins),
    mkInstanced(truckCabinGeo, carMat, truckCabins),
    mkInstanced(wheelGeo, tyreMat, wheels),
    mkInstanced(boxGeo, bandMat, bands),
    mkInstanced(boxGeo, pvMat, pvs),
  ].filter(Boolean) as InstancedMesh[]

  await stage()

  // ── image-based lighting from the sky ─────────────────────────────
  let envDispose = () => {}
  try {
    const pmrem = new PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envScene = new Scene()
    envScene.add(new Mesh(skyGeo, skyMat), new Mesh(cloudGeo, cloudMat))
    const rt = pmrem.fromScene(envScene, 0.04)
    scene.environment = rt.texture
    envDispose = () => {
      scene.environment = null
      rt.dispose()
    }

    // Realistic swaps that painted dome for a captured sky. A real HDRI carries
    // the full dynamic range and the directional structure of actual daylight,
    // which is what lets metal and glass reflect something that looks
    // photographed rather than shaded. Loaded only in this mode and only after
    // the scene is already standing, so Blueprint and Model pay nothing for it
    // and the first frame never waits on a megabyte of sky.
    if (REAL) {
      new RGBELoader().load(
        '/env/sky_1k.hdr',
        (hdr) => {
          hdr.mapping = EquirectangularReflectionMapping
          const real = pmrem.fromEquirectangular(hdr)
          scene.environment = real.texture
          // A clear-sky HDRI is genuinely bright, and at full strength it floods
          // the scene with skylight from every direction — the same flattening
          // the fill lights were causing. Held back so it reads as sky bounce
          // filling the shadows, not as a second sun.
          scene.environmentIntensity = 0.55
          hdr.dispose()
          rt.dispose()
          envDispose = () => {
            scene.environment = null
            real.dispose()
          }
          pmrem.dispose()
        },
        undefined,
        () => {
          // no HDRI on disk: the painted dome above is still lighting the scene
          pmrem.dispose()
        },
      )
    } else {
      pmrem.dispose()
    }
  } catch {
    /* IBL is an enhancement; the scene still lights correctly without it */
  }

  return {
    sun,
    update: (dt: number) => {
      updateTraffic(dt)
      // one float per frame drives every crown and trunk in the scene
      wind.value += dt
    },
    dispose: () => {
      envDispose()
      instanced.forEach((im) => im.dispose())
      scene.remove(root, sun, sun.target)
      disposables.forEach((d) => d.dispose())
    },
  }
}
