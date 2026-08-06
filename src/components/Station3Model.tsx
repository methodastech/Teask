import { useEffect, useRef } from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  HemisphereLight,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
// emitted as hashed assets by Vite; see setDecoderPath below for why both are
// named explicitly rather than handed a directory
import dracoWrapperUrl from 'three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js?url'
import dracoWasmUrl from 'three/examples/jsm/libs/draco/gltf/draco_decoder.wasm?url'
import { AbortError, buildPhotorealEnvironment, type PhotorealEnv } from './Station3Environment'
import { breathe } from '../lib/breathe'
import { setupPost, type PostChain } from './Station3Post'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'


/**
 * Depth of field, bloom and grade. Off on small screens: the composer costs a
 * second full scene pass for the depth buffer, which phones can't spare.
 *
 * Also off on machines that visibly aren't going to hold it. Core count is a
 * crude proxy for a GPU, but it is the only one a browser will tell us before
 * the first frame is drawn, and a four-thread machine in 2026 is a netbook or a
 * throttled tablet. Guessing wrong here costs a slightly plainer render;
 * guessing wrong the other way costs a hero that stutters, which is worse.
 */
const POST_ENABLED =
  typeof window !== 'undefined' &&
  window.innerWidth >= 900 &&
  (navigator.hardwareConcurrency ?? 8) > 4
import { PART_GROUPS, MODELS_BASE, type PartGroup } from '../lib/station3Parts'
import type { HeroStyle } from '../lib/heroStyle'
import {
  extractEmblem,
  makeEmblemMaterials,
  makeFaceMaterial,
  INK,
  GLASS_EMISSIVE,
  type Emblem,
} from '../lib/stationStyle'

/**
 * Section 1→2 · Station 3, the Orano-style experience.
 *
 * Two phases, one persistent scene:
 *  · intro  (entered=false), blueprint wireframe, wide cinematic framing,
 *    hover highlights a part. Page scroll is locked by the parent; ENTER is the
 *    only action.
 *  · explore(entered=true) , faces solidify, camera dollies in, click-and-hold
 *    flies to each part's hero angle and pops its spec. Scroll is unlocked.
 *
 * `enteredRef` is read every frame (not a prop) so toggling phase never rebuilds
 * the scene. A `solidify` value (0→1) drives the wireframe→solid crossfade.
 */

interface Station3ModelProps {
  enteredRef: React.MutableRefObject<boolean>
  labelRef: React.RefObject<HTMLDivElement>
  leaderRef: React.RefObject<SVGLineElement>
  reticleRef: React.RefObject<HTMLDivElement>
  onHoverChange: (id: string | null) => void
  onPressChange: (id: string | null) => void
  /** clicking the unit in the intro requests ENTER (zoom into section 2) */
  onEnterRequest?: () => void
  onProgress?: (loaded: number, total: number) => void
  onReady?: () => void
  /** imperative handle: the part legend calls this to focus a part (null clears) */
  selectRef?: React.MutableRefObject<((id: string | null) => void) | null>
  /** which world the unit stands in — see the HeroStyle union */
  heroStyle?: HeroStyle
  /** start overhead and fly down, to continue the intro flight seamlessly */
  arriveFromAbove?: boolean
  /**
   * Called by the parent to (re)start the descent. The arrival cannot simply
   * begin when the model finishes loading: on a warm cache that is seconds
   * before the intro hands over, so the whole move would play out behind the
   * white and the hero would be sitting still by the time anyone saw it.
   */
  arriveRef?: React.MutableRefObject<(() => void) | null>
  /** hide the blueprint floor grid — used when the unit sits on a photo backdrop */
  showGrid?: boolean
}

/**
 * The photovoltaic surface, drawn rather than shaded.
 *
 * The array is ten modules across a dual-pitch canopy, so the texture is ten
 * columns of cells with the frame gap between them. Cells are the standard
 * six-across layout with three busbars, which is what actually gives a panel its
 * texture at a distance — the fine vertical lines catch light differently from
 * the cell faces and stop the array reading as one flat sheet.
 *
 * Kept light: the real unit's canopy is pale cool grey, not the blue-black of a
 * rooftop module, and that is a fact about the product rather than a style
 * choice. This adds structure to that surface without darkening it.
 */
function pvCellTexture() {
  const W = 2048
  const H = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  ctx.fillStyle = '#c3cad3'
  ctx.fillRect(0, 0, W, H)

  const MODULES = 10 // matches the published module count
  const modW = W / MODULES
  const frame = modW * 0.055 // the aluminium rail between modules
  const COLS = 6 // cells across a module
  const ROWS = 12 // cells down its length

  for (let m = 0; m < MODULES; m++) {
    const x0 = m * modW + frame
    const x1 = (m + 1) * modW - frame
    const inner = x1 - x0
    const cellW = inner / COLS
    const cellH = (H - frame * 2) / ROWS

    // module backsheet, a touch darker than the frame so the rail reads
    ctx.fillStyle = '#b4bcc6'
    ctx.fillRect(x0, frame, inner, H - frame * 2)

    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const cx = x0 + col * cellW
        const cy = frame + r * cellH
        const pad = cellW * 0.045
        // a hint of per-cell variation — real wafers are never identical
        const tint = 196 + ((m * 31 + r * 17 + col * 7) % 11)
        ctx.fillStyle = `rgb(${tint - 8},${tint - 2},${tint + 4})`
        ctx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2)

        // three busbars per cell, the detail that says "photovoltaic"
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        for (let b = 1; b <= 3; b++) {
          ctx.fillRect(cx + (cellW * b) / 4 - 1, cy + pad, 2, cellH - pad * 2)
        }
      }
    }

    // rail highlight down each module edge
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillRect(x0 - frame, frame, frame, H - frame * 2)
    ctx.fillRect(x1, frame, frame, H - frame * 2)
  }

  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

/**
 * The canvas sets its own cursor as you move over parts, and an inline style
 * beats the stylesheet — which is why the 3D was the one place still showing the
 * plain system arrow while the rest of the site had turned blue. Pointing these
 * at the same custom properties the stylesheet uses keeps the whole site on one
 * cursor. The trailing keyword is the fallback if the SVG cannot be fetched.
 */
const CURSOR_REST = 'var(--cursor-arrow), default'
const CURSOR_ACTIVE = 'var(--cursor-arrow-brand), pointer'

const TEAL = new Color(0x3bb1e3)
// blueprint ink + cabinet colour come from the shared station style so every
// 3D showcase on the site renders the product identically
const WHITE = new Color(INK)
const TAU = Math.PI * 2

const AZ = -0.6
const DEFAULT_ELEV = 0.42
/**
 * The arrival from above, for when the intro flight hands over.
 *
 * The seam in any 'fly down to the site' intro is that you approach one thing
 * and land on another. So the last leg happens HERE, in the real scene: the
 * camera starts almost overhead and far out — the hero as seen from directly
 * above — and flies down into its normal framing. What you were descending
 * toward and what you arrive at are the same geometry, lit the same way, so
 * there is nothing to disguise.
 */
const ARRIVAL = {
  elev: 1.2, // near top-down (MAX_ELEV is 1.35)
  distMult: 3.4, // how far out the approach begins
  seconds: 2.8,
}

/**
 * The advertising display on the centre column.
 *
 * Two planes back to back rather than one double-sided plane: a DoubleSide
 * material mirrors its texture on the reverse, which is fine for a wall and
 * wrong for signage — the type would read backwards from the far bay.
 *
 * Sized and placed against the station's own fitted box, so it survives any
 * change to the unit's scale, and lit as an emissive surface so it reads as a
 * lit panel rather than a printed one.
 */
const SCREEN = {
  enabled: true,
  heightFrac: 0.34, // of the COLUMN height
  aspect: 0.55, // width / height, portrait
  lift: 0.52, // centre height as a fraction of the column height
  along: 0, // position down the long axis, -0.5 .. 0.5
  standoff: 25, // clear of the column face, in model units
}

/**
 * The twin 13A outlet boxes, one sitting on each of the two flat plates either
 * side of the mid pillar. Dimensions are in model units, which are millimetres
 * — the station measures ~5600 across. A real two-gang enclosure is about
 * 220x120x70, but at this framing that is a few pixels, so it is drawn at
 * roughly twice life size to read as what it is.
 */
const SOCKET = {
  enabled: true,
  // Height as a multiple of the plate's own thickness, so the box reads as
  // surface-mounted hardware sized to what it is bolted to rather than a
  // number that stops making sense if the CAD changes. Slightly over 1 gives
  // the small overhang a real surface box has above its backplate.
  faceOfPlate: 1.25,
  aspect: 1.78, // face width / height, matching the artwork
  standoff: 64, // how far it stands proud of the plate face
  along: 0, // slide along the plate, -0.5 .. 0.5
}

const INTRO_ELEV = 0.28
// drag-to-orbit pitch limits, MIN keeps the camera above the horizon so you
// can never look up at the unit from beneath the ground; MAX nears top-down
const MIN_ELEV = 0.12
const MAX_ELEV = 1.35
const INTRO_TARGET_Y = 0
// phone intro: multiplier on the measured copy height (see `copyFrac`). 0.8
// leaves the unit centred just under the ENTER button without pushing its base
// into the bottom white fade.
const PHONE_INTRO_DROP = 0.8
// phone explore: lifts the unit out of the bottom third, which the parts panel
// now occupies. Negative lowers the look-at, which raises the unit on screen.
const PHONE_EXPLORE_RISE = -0.34
// intro camera pull-back multiplier — larger = unit sits smaller in frame
const INTRO_DIST_MULT = 1.18
// resting rotation of the unit in the intro, grid-aligned (edges parallel to the grid)
const INTRO_SPIN = -Math.PI / 2
const viewDir = (az: number, elev: number) =>
  new Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize()
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const coterminal = (target: number, ref: number) => target + TAU * Math.round((ref - target) / TAU)

/**
 * A row of bright-yellow e-scooters parked under the canopy, matching the real
 * T Station photography. One decimated mesh (public/models/scooter.glb),
 * instanced N times. All placement is expressed relative to the station's own
 * fitted bounding box, so it survives any change to the station's scale.
 */
const SCOOTER = {
  enabled: false, // temporarily hidden while the unit is fitted to the bay
  count: 4,
  color: 0xf5b60a, // vivid Yamaha-yellow of the photographed bikes
  tyre: 0x1a1b1f, // near-black of the seat, lower fairing and tyres
  tyreFrac: 0.2, // bottom band (wheels + lower body) painted dark
  seatFrac: 0.66, // above this height fraction painted dark (seat, handlebars, mirror)
  heightRatio: 0.42, // bike height as a fraction of station height
  spanRatio: 0.62, // fraction of the canopy's long axis the row spans
  lateral: 0.34, // offset along the short axis (fraction of short size); + = forward,
  // toward the open front so the bikes sit under the beam overhang, not buried inside
  yawDeg: 180, // extra spin of every bike about Y; 180 = nose pointing inward
  lift: 0, // fine vertical nudge (fraction of station height)
}

/**
 * The single e-motorcycle parked in the bay, expressed as fractions of the
 * station's own fitted bounding box so it survives any change to the unit's
 * scale. `lateral` runs across the canopy's short axis (out toward the open
 * front), `along` runs down its long axis.
 */
const BIKES = {
  /** bikes per long side; both sides get the same number */
  perSide: 4,
  heightRatio: 0.34, // bike height as a fraction of station height
  spanRatio: 0.66, // fraction of the long axis the row spans
  lateral: 0.34, // offset out along the short axis, applied to both sides
}

const BIKE = {
  /** a textured glTF finally landed, so the bike is back */
  enabled: true,
  heightRatio: 0.34, // bike height as a fraction of station height
  // 0.32 of the 4286-unit short axis puts it in the outer half of the bay:
  // clear of the frame in the middle, and its 1.35k-unit length still finishes
  // ~120 units inside the 2143-unit half-width, so it stays under the panel.
  lateral: 0.32,
  along: -0.16, // biased into one bay rather than dead centre
  // Which end of the model is the front. No mesh format records this, so it can
  // only be set by looking: the STL we have is drawn nose-backwards, and the
  // glTF is a guess until a textured export actually turns up. If a replacement
  // parks nose-out, flip its flag — nothing else needs to change.
  flipNoseStl: true,
  flipNoseGlb: true,
  // Where the paint stops, as a fraction of the bike's height. Below the first
  // is wheels and lower fairing; above the second is seat and handlebars. Both
  // are black on the real machine, and the yellow bodywork lives between them.
  //
  // The wheels are now identified by radius from their own hubs rather than by
  // height, so this only has to cover the footboard and lower fairing — which is
  // why it can sit low enough to leave the yellow side panels their full sweep.
  lowerBlack: 0.3,
  // The seat is the highest yellow thing on the bike, and at 0.74 it was staying
  // painted. The mesh's density bump at 60-70% is the saddle; above it are the
  // bars and mirrors, all black. Cutting at 0.6 puts the boundary at the seat
  // base, which is where the rear side panel actually stops on the real machine.
  upperBlack: 0.6,
  /** how much of the bike's length counts as "the front", from the nose back */
  frontZone: 0.33,
  /** how far past the tyre's own radius bodywork has to sit to count as paint */
  fenderClear: 1.02,
  /**
   * The fender override only applies low down. Without this bound it also caught
   * the handlebars and mirrors — front of the bike, and certainly clear of the
   * tyre — and painted them yellow.
   */
  fenderMaxHeight: 0.55,
}

/**
 * The frames the display cycles. Teask's own messaging rather than invented
 * third-party advertisers: it demonstrates the surface without putting words in
 * a brand's mouth that has not bought the space.
 */
/**
 * The display runs a short loop of playout: a drinks spot, then the station's
 * own card, the way real forecourt signage alternates paid advertising with
 * house content.
 *
 * Drawn per frame rather than cycling stills, because a still cannot say
 * 'drink' at this size — the panel is barely 40px tall on screen at the hero's
 * framing, so it is the MOVEMENT (bubbles climbing, liquid rocking, the straw)
 * that carries the read, not the detail.
 *
 * 320px wide at 12fps deliberately: every draw re-uploads the whole texture to
 * the GPU, so at the full 512 and 30fps this one small panel would be pushing
 * ~28MB/s for something the size of a postage stamp.
 */
/**
 * The socket face, drawn once into a canvas: the recessed tray, two BS 1363
 * outlets and the vent grille between them. Painted rather than modelled —
 * every slot as real geometry would be ~40 extra boxes per unit for detail
 * that is under a pixel unless you are inspecting the part up close.
 */
function socketFaceTexture() {
  const W = 512
  const H = 288
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!

  const round = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }

  // the moulded lip of the enclosure
  c.fillStyle = '#f4f5f4'
  c.fillRect(0, 0, W, H)

  // the recessed well, with a shaded top-left edge so it reads as a cavity
  const pad = 34
  round(pad, pad, W - pad * 2, H - pad * 2, 26)
  c.fillStyle = '#dfe2e1'
  c.fill()
  c.strokeStyle = 'rgba(90,100,105,0.45)'
  c.lineWidth = 5
  c.stroke()

  // the two outlets
  const faceW = 150
  const faceH = 150
  const fy = (H - faceH) / 2
  for (const fx of [W / 2 - faceW - 32, W / 2 + 32]) {
    round(fx, fy, faceW, faceH, 8)
    c.fillStyle = '#fbfcfb'
    c.fill()
    c.strokeStyle = 'rgba(120,128,132,0.35)'
    c.lineWidth = 2
    c.stroke()

    // BS 1363: earth is the tall slot at top centre, live and neutral are the
    // pair below it — the layout everyone reads as "a UK plug goes here"
    c.fillStyle = '#1b1e21'
    const cx = fx + faceW / 2
    c.fillRect(cx - 9, fy + 26, 18, 44)
    c.fillRect(cx - 60, fy + 96, 40, 17)
    c.fillRect(cx + 20, fy + 96, 40, 17)
  }

  // vent grille on the divider between them
  c.fillStyle = 'rgba(70,78,82,0.5)'
  for (let gx = 0; gx < 5; gx++) {
    for (let gy = 0; gy < 5; gy++) {
      c.fillRect(W / 2 - 14 + gx * 7, H / 2 - 30 + gy * 7, 3, 3)
    }
  }

  const t = new CanvasTexture(cv)
  t.colorSpace = SRGBColorSpace
  return t
}

const SCREEN_W = 320
const SCREEN_FPS = 12
const AD_SECONDS = 7
const CARD_SECONDS = 3.5

type Bubble = { x: number; y: number; r: number; v: number }

function makeScreenPlayer(H: number) {
  const W = SCREEN_W
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!

  /**
   * The real brand assets, not a redrawn approximation. Both are dark artwork on
   * transparent, so they sit correctly on the light card. They load async and
   * the panel redraws 12 times a second, so they simply appear a frame or two
   * in — no need to block the whole display on them.
   */
  const wordmark = new Image()
  wordmark.src = '/brand/teask-logo-hd.png'
  const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0

  /**
   * The A-with-diamond, cropped straight out of the real wordmark.
   *
   * brand/teask-a-outline.png looks like the right asset from its name but is a
   * solid black A with no diamond in it and a clipped left leg. The genuine mark
   * only exists inside teask-logo-hd.png, so these are its measured bounds in
   * that file. The bounds are measured, not eyeballed: scanning left to right,
   * x=1191 is the first column whose ink no longer starts at the E's cap height,
   * so the A's own leg begins at 1200 with clearance; its ink ends at 1645
   * before the gap to the S; and the glyph runs y=86 to y=712.
   *
   * An earlier cut at x=1104 used the sparsest column between the letters, but
   * sparsest is not empty — it still carried 133px of the E, which showed up on
   * the panel as a stray mark beside the mark.
   */
  const A_CROP = { x: 1070, y: 78, w: 590, h: 646 }

  /**
   * Isolating the A cannot be done with a rectangle: the E and the A overlap in
   * x. At the top of the glyphs the E's bar runs out to x=1190 while the A's
   * left foot reaches back to x=1091, so any crop wide enough to hold the whole
   * A also holds part of the E — which is why the earlier crops either clipped
   * the leg or dragged the E in with it.
   *
   * The A's left edge is a straight line, though. Fitting the leg's outer edge
   * across six measured rows gives x = 1346.2 - 0.525y with zero residual, and
   * it predicts the rows that were not fitted exactly. So: crop wide, then erase
   * everything left of that line. The A survives untouched, the E does not.
   */
  const buildMark = () => {
    const cv = document.createElement('canvas')
    cv.width = A_CROP.w
    cv.height = A_CROP.h
    const c = cv.getContext('2d')!
    c.drawImage(wordmark, A_CROP.x, A_CROP.y, A_CROP.w, A_CROP.h, 0, 0, A_CROP.w, A_CROP.h)
    // the leg line, in crop-local coordinates, nudged 2px left so the erase
    // never nibbles the stroke it is following
    const lx = (ly: number) => 1346.2 - 0.525 * (ly + A_CROP.y) - A_CROP.x - 2
    c.globalCompositeOperation = 'destination-out'
    c.beginPath()
    c.moveTo(-40, 0)
    c.lineTo(lx(0), 0)
    c.lineTo(lx(A_CROP.h), A_CROP.h)
    c.lineTo(-40, A_CROP.h)
    c.closePath()
    c.fill()
    return cv
  }
  let markCanvas: HTMLCanvasElement | null = null

  let seed = 7717
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  // glass geometry, as fractions of the panel
  const gx = W * 0.5
  const gTop = H * 0.3
  const gBot = H * 0.72
  const gwTop = W * 0.3
  const gwBot = W * 0.22

  const bubbles: Bubble[] = Array.from({ length: 18 }, () => ({
    x: (rnd() - 0.5) * gwBot * 1.4,
    y: rnd(),
    r: 2 + rnd() * 4,
    v: 0.1 + rnd() * 0.22,
  }))

  const glassPath = (inset: number) => {
    ctx.beginPath()
    ctx.moveTo(gx - gwTop / 2 + inset, gTop + inset)
    ctx.lineTo(gx + gwTop / 2 - inset, gTop + inset)
    ctx.lineTo(gx + gwBot / 2 - inset, gBot - inset)
    ctx.lineTo(gx - gwBot / 2 + inset, gBot - inset)
    ctx.closePath()
  }

  const drawAd = (t: number) => {
    // warm ground so the spot is unmistakably not the station's own card
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#ff8a3d')
    bg.addColorStop(1, '#e5342b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // straw, angled out of the glass
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(gx + gwBot * 0.1, gBot - H * 0.02)
    ctx.lineTo(gx + gwTop * 0.62, gTop - H * 0.06)
    ctx.stroke()

    // the glass body
    ctx.save()
    glassPath(0)
    ctx.clip()
    // liquid, with a level that rocks so it reads as a fluid
    const level = gTop + (gBot - gTop) * (0.24 + Math.sin(t * 1.6) * 0.012)
    ctx.fillStyle = '#ffd34d'
    ctx.fillRect(0, level, W, H)
    // bubbles climbing through it
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    bubbles.forEach((b) => {
      const span = gBot - level
      const y = gBot - ((b.y + t * b.v) % 1) * span
      ctx.beginPath()
      ctx.arc(gx + b.x, y, b.r, 0, Math.PI * 2)
      ctx.fill()
    })
    // a highlight down one side, which is what makes glass look like glass
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(gx - gwTop * 0.42, gTop, W * 0.05, H)
    ctx.restore()

    // glass outline
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 7
    ctx.lineJoin = 'round'
    glassPath(0)
    ctx.stroke()

    // type: a slow pulse so the panel never sits completely still
    const pulse = 1 + Math.sin(t * 2.4) * 0.04
    ctx.save()
    ctx.translate(W / 2, 0)
    ctx.scale(pulse, pulse)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px Helvetica, Arial, sans-serif'
    ctx.fillText('ICE', 0, H * 0.14)
    ctx.fillText('COLD', 0, H * 0.22)
    ctx.restore()

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Helvetica, Arial, sans-serif'
    ctx.fillText('FRESH JUICE', W / 2, H * 0.85)
    ctx.font = '18px Helvetica, Arial, sans-serif'
    ctx.fillText('WHILE YOU CHARGE', W / 2, H * 0.9)
  }

  const drawCard = () => {
    ctx.fillStyle = '#eef3f7'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0084d6'
    ctx.fillRect(0, 0, W, 12)
    ctx.fillRect(0, H - 12, W, 12)

    // the mark alone, sized off the crop's own aspect so it is never stretched
    if (ready(wordmark)) {
      if (!markCanvas) markCanvas = buildMark()
      const mw = W * 0.52
      const mh = mw * (A_CROP.h / A_CROP.w)
      ctx.drawImage(markCanvas, (W - mw) / 2, (H - mh) / 2, mw, mh)
    }
  }

  const CYCLE = AD_SECONDS + CARD_SECONDS
  const draw = (elapsed: number) => {
    const phase = elapsed % CYCLE
    if (phase < AD_SECONDS) drawAd(phase)
    else drawCard()
    // scanlines, the cheapest thing that separates a screen from a poster
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
  }

  draw(0)
  return { canvas: cv, draw }
}

interface Part {
  faceMat: MeshStandardMaterial
  edgeMat: LineBasicMaterial
  glass: boolean
  anchor: Vector3
  radius: number
  view: PartGroup['view']
  focusNearest?: boolean
  /** per-file centroids in mesh-local space (captured before merge) */
  subLocal?: Vector3[]
  /** the same centroids in rig-local space (resolved in finalize) */
  subAnchors?: Vector3[]
}

export default function Station3Model({
  arriveFromAbove = false,
  arriveRef,
  enteredRef,
  labelRef,
  leaderRef,
  reticleRef,
  onHoverChange,
  onPressChange,
  onEnterRequest,
  onProgress,
  onReady,
  selectRef,
  showGrid = true,
  heroStyle = 'model',
}: Station3ModelProps) {
  // Everything below was written against a single boolean, and the distinction
  // it drew — "is there a real world out there or a wireframe one" — is still
  // the right one for lighting, fog and the grid. The realistic site is a
  // different *build* of that world, not a different kind of it.
  const PHOTOREAL = heroStyle !== 'blueprint'
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({
        // The composer renders into its own 2×-multisampled target and blits a
        // fullscreen quad to the canvas, so the canvas's own MSAA buffer is
        // never sampled — it just costs a resolve every frame. Only pay for it
        // when the scene draws straight to the canvas.
        antialias: !POST_ENABLED,
        alpha: true,
        // laptops with switchable graphics default a WebGL context to the
        // integrated GPU; this scene is not something an iGPU should be running
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    const scene = new Scene()
    // depth haze. Blueprint: fog matches the page so distant wireframes dissolve
    // into the white. Photoreal: warm horizon haze so the planting and buildings
    // recede the way they do in tropical daylight.
    scene.fog = PHOTOREAL ? new Fog(0xdbe7f0, 46, 190) : new Fog(0xffffff, 22, 68)
    // far plane must clear the sky dome (r=400) and cloud shell (r=360). At the
    // old 200 the dome was clipped entirely, and once post-processing began
    // compositing to an opaque target that left the sky rendering black.
    const camera = new PerspectiveCamera(38, 1, 0.1, 1400)
    let boundR = 4

    const defaultDist = () => {
      const vFov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      return Math.max(boundR / Math.sin(vFov / 2), boundR / Math.sin(hFov / 2)) * 1.05
    }
    const partDist = (radius: number) => {
      const vFov = (camera.fov * Math.PI) / 180
      return Math.max((radius / Math.sin(vFov / 2)) * 1.5, boundR * 0.28)
    }

    /**
     * Resolution is the one dial that moves every cost in this scene at once —
     * the main pass, the depth-of-field blur, bloom and the grade all bill per
     * pixel, and a 2× ratio quadruples all four. Retina screens were paying that
     * on top of a composer chain, which is where the frame budget was going.
     *
     * 1.5 is the ceiling now (a quarter less pixel work than 2×, and with MSAA
     * and a soft-focus background the difference does not read), and `quality`
     * below dials it further down on hardware that still can't hold the frame.
     */
    const MAX_DPR = 1.5
    const deviceDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    let quality = 1
    renderer.setPixelRatio(deviceDpr * quality)
    renderer.setClearColor(0x000000, 0)
    // The product must look the same whichever world it stands in, so tone
    // mapping and soft shadows are unconditional. Only the surroundings change.
    renderer.toneMapping = ACESFilmicToneMapping
    // realistic runs a stop darker: with the fill lights gone the sun carries the
    // exposure, and midday tarmac should sit well below white
    renderer.toneMappingExposure = heroStyle === 'realistic' ? 0.78 : 0.92
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    /**
     * The shadow map was being redrawn every single frame — a full second pass
     * over the scene's geometry into a 2048² depth buffer, sixty times a second,
     * for a picture that barely changes. The sun is fixed, the unit is bolted to
     * its site and does not rotate, and the camera cannot move a directional
     * light's ortho frustum. The only things that actually move under it are the
     * traffic and the wind in the crowns.
     *
     * So it updates on a cadence instead (see SHADOW_EVERY in the loop). A car's
     * shadow lagging a couple of frames at that distance is invisible; the third
     * of the geometry budget it gives back is not.
     */
    renderer.shadowMap.autoUpdate = false
    renderer.shadowMap.needsUpdate = true
    mount.appendChild(renderer.domElement)
    // pan-y hands every vertical swipe straight to the page, so a full-screen
    // canvas never traps the scroll on a phone; horizontal drags stay ours to
    // spin with, and arrive immediately instead of waiting on gesture detection
    Object.assign(renderer.domElement.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      touchAction: 'pan-y',
    })

    // Blueprint and Model light the product the same way: ambient plus a
    // shadowless fill opposite the key to open the near-black cabinet's shaded
    // faces, and a cool rim from behind to separate its silhouette.
    //
    // Realistic cannot use that rig. Those three lights exist to guarantee no
    // surface is ever truly dark — which is exactly what kills a photograph.
    // Stacked on top of a captured sky (which is itself a full ambient source)
    // and the environment's own sun and hemisphere, the scene was lit from six
    // directions at once: nothing could cast, nothing could fall into shade, and
    // everything sat at the same brightness. Here the sun does the shaping and
    // the HDRI does the filling, which is how real daylight actually works —
    // so the fill and rim drop to a whisper and the ambient nearly vanishes.
    const REALISTIC = heroStyle === 'realistic'
    scene.add(new AmbientLight(0xffffff, REALISTIC ? 0.05 : 0.42))
    const fill = new DirectionalLight(0xdce8f5, REALISTIC ? 0.12 : 0.85)
    fill.position.set(14, 10, 16)
    scene.add(fill)
    const rim = new DirectionalLight(0xbcd8f5, REALISTIC ? 0.3 : 1.0)
    rim.position.set(12, 7, -20)
    scene.add(rim)
    if (!PHOTOREAL) {
      // In the rendered world the key light is the environment's sun. Blueprint
      // has no environment, so it needs its own matching key or the unit would
      // sit flat and unlit against the wireframe.
      const key = new DirectionalLight(0xfff2df, 2.6)
      key.position.set(-18, 26, -8)
      scene.add(key)
      scene.add(new HemisphereLight(0xd2ecff, 0x8a7a5a, 0.6))
    }

    // ground grid, a local pool of blueprint lines under the unit only. Each
    // cell-length segment carries vertex colours that lerp from the line colour
    // to the page colour with radius, so the grid dissolves into the background
    // instead of running to the horizon. World space: the model spins on it.
    //
    // White rather than blue: against the dark backdrop the blue was reading as
    // a second brand colour competing with the logo and the CTA, where a plain
    // white line reads as drafting and lets the product keep the only blue in
    // frame. The dissolve target follows it, or the gradient would run toward a
    // colour the line never had.
    const GRID_BLUE = new Color(0xffffff)
    const PAGE = new Color(0xdfe5ec)
    const buildGridGeo = () => {
      const half = 18 // grid half-extent, world units
      const cell = 1.2
      const r0 = 4.5 // fully-inked radius around the unit
      const r1 = 15 // fully dissolved into the page by here
      const pos: number[] = []
      const col: number[] = []
      const c = new Color()
      const push = (x: number, z: number) => {
        pos.push(x, 0, z)
        const t = Math.min(Math.max((Math.hypot(x, z) - r0) / (r1 - r0), 0), 1)
        c.copy(GRID_BLUE).lerp(PAGE, t)
        col.push(c.r, c.g, c.b)
      }
      // per-cell segments (not full-length lines) so the colour gradient can
      // bend around the radius instead of interpolating end-to-end
      for (let i = -half; i <= half + 1e-6; i += cell) {
        for (let j = -half; j < half - 1e-6; j += cell) {
          push(i, j)
          push(i, j + cell) // segment along z at x = i
          push(j, i)
          push(j + cell, i) // segment along x at z = i
        }
      }
      const g = new BufferGeometry()
      g.setAttribute('position', new Float32BufferAttribute(pos, 3))
      g.setAttribute('color', new Float32BufferAttribute(col, 3))
      return g
    }
    const gridGeo = buildGridGeo()
    const gridMat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 })
    const grid = new LineSegments(gridGeo, gridMat)
    grid.visible = showGrid
    scene.add(grid)

    const rig = new Group()
    scene.add(rig)
    const pivot = new Group()
    rig.add(pivot)
    const model = new Group()
    pivot.add(model)

    const disposables: Array<{ dispose: () => void }> = []
    // intervals owned by the scene, cleared with it
    const timers: number[] = []
    disposables.push(gridGeo, gridMat)
    let photoreal: PhotorealEnv | null = null
    let post: PostChain | null = null
    let lastFrame = performance.now()
    /**
     * The canvas box, cached. `getBoundingClientRect` forces a layout flush, and
     * this was being read once per frame in the loop and again on every pointer
     * move — on a page carrying this much DOM that is a measurable main-thread
     * stall for a number that only changes when the window resizes or the page
     * scrolls. Both of those refresh it (see `measureCanvas`).
     */
    let canvasW = 0
    let canvasH = 0
    let canvasLeft = 0
    let canvasTop = 0
    const measureCanvas = () => {
      const r = mount.getBoundingClientRect()
      canvasW = r.width
      canvasH = r.height
      canvasLeft = r.left
      canvasTop = r.top
      return r
    }
    /** how often the shadow map is redrawn, in frames (see shadowMap.autoUpdate) */
    const SHADOW_EVERY = 4
    let frameNo = 0
    /** floor for the adaptive resolution below; past this it stops looking like a render */
    const MIN_QUALITY = 0.6
    let slowFrames = 0
    /** push the current `quality` through to the canvas and the composer */
    const applyQuality = () => {
      renderer.setPixelRatio(deviceDpr * quality)
      if (!canvasW || !canvasH) return
      renderer.setSize(canvasW, canvasH, false)
      post?.setSize(canvasW, canvasH)
      // the shadow map is keyed to nothing here, but the buffers behind it just
      // moved — redraw it on the next frame rather than showing a stale one
      renderer.shadowMap.needsUpdate = true
    }
    const parts = new Map<string, Part>()
    /**
     * The columns' own box, kept because the station's overall bounding box is
     * useless for mounting anything to the structure: the canopy overhangs the
     * columns by ~1700 units, so 'the front face of the unit' is 1.7m of empty
     * air in front of anything you could actually bolt a screen to.
     */
    let columnBox: { min: Vector3; max: Vector3 } | null = null
    // the two flat plates either side of the mid pillar, captured per file
    // before the group is merged — once merged they are indistinguishable from
    // the big top beam they share a group with
    const ledgeBoxes: { min: Vector3; max: Vector3 }[] = []
    const occluders: Mesh[] = []

    // ── blueprint surroundings: wireframe buildings, hedges, trees and a road,
    // placing the unit in a real campus site while staying in the drawing style.
    // Added to the scene (world space) and faded by the fog with distance; they
    // dim further as the visitor steps inside (driven by `solidify`).
    const envMats: LineBasicMaterial[] = []
    const envBase: number[] = []
    const buildEnvironment = (groundY: number) => {
      const env = new Group()
      env.visible = showGrid // the site reads with the grid; hidden with it too
      scene.add(env)
      const mk = (opacity: number) => {
        // white linework, matching the ground grid — see the note there
        const m = new LineBasicMaterial({ color: new Color(0xffffff), transparent: true, opacity })
        envMats.push(m)
        envBase.push(opacity)
        disposables.push(m)
        return m
      }
      const mBldg = mk(0.28)
      const mMid = mk(0.34)
      const mLow = mk(0.26)
      const mDetail = mk(0.16)
      const addBoxAt = (w: number, h: number, d: number, x: number, y: number, z: number, m: LineBasicMaterial) => {
        const bg = new BoxGeometry(w, h, d)
        const g = new EdgesGeometry(bg)
        bg.dispose()
        disposables.push(g)
        const ls = new LineSegments(g, m)
        ls.position.set(x, y, z)
        env.add(ls)
      }
      const addBox = (w: number, h: number, d: number, x: number, z: number, m: LineBasicMaterial) =>
        addBoxAt(w, h, d, x, groundY + h / 2, z, m)

      // a building: outline box plus floor lines and window mullions for detail
      const building = (w: number, h: number, d: number, x: number, z: number, floors: number, cols: number) => {
        addBox(w, h, d, x, z, mBldg)
        const P: number[] = []
        const hw = w / 2, hh = h / 2, hd = d / 2
        for (let f = 1; f < floors; f++) {
          const yy = -hh + (h / floors) * f // floor ring around the facade
          P.push(-hw, yy, -hd, hw, yy, -hd, hw, yy, -hd, hw, yy, hd, hw, yy, hd, -hw, yy, hd, -hw, yy, hd, -hw, yy, -hd)
        }
        for (let c = 1; c < cols; c++) {
          const xx = -hw + (w / cols) * c // vertical mullions on front + back faces
          P.push(xx, -hh, hd, xx, hh, hd, xx, -hh, -hd, xx, hh, -hd)
        }
        const colsD = Math.max(2, Math.round((cols * d) / w))
        for (let c = 1; c < colsD; c++) {
          const zz = -hd + (d / colsD) * c // mullions on the side faces
          P.push(hw, -hh, zz, hw, hh, zz, -hw, -hh, zz, -hw, hh, zz)
        }
        const dg = new BufferGeometry()
        dg.setAttribute('position', new Float32BufferAttribute(P, 3))
        disposables.push(dg)
        const detail = new LineSegments(dg, mDetail)
        detail.position.set(x, groundY + h / 2, z)
        env.add(detail)
      }
      // a campus skyline set back behind the unit
      ;(
        [
          [9, 14, 8, 15, -20, 7, 5],
          [7, 20, 7, 24, -17, 10, 4],
          [11, 11, 9, 4, -26, 5, 6],
          [6, 16, 6, -10, -23, 8, 3],
          [8, 12, 7, -21, -19, 6, 4],
          [10, 9, 8, 31, -25, 4, 5],
          [7, 24, 7, -29, -22, 12, 4],
          [9, 13, 8, 35, -14, 6, 5],
        ] as const
      ).forEach(([w, h, d, x, z, fl, co]) => building(w, h, d, x, z, fl, co))
      // clipped hedge rows in front of the buildings
      addBox(30, 1.1, 1.3, 10, -13, mLow)
      addBox(16, 1.1, 1.3, -16, -12, mLow)
      addBox(22, 1.0, 1.2, 30, -11, mLow)
      // trees — a box trunk with a faceted wireframe canopy
      const tree = (x: number, z: number, s: number) => {
        const th = 1.8 * s
        addBox(0.16 * s, th, 0.16 * s, x, z, mMid)
        const ig = new IcosahedronGeometry(1.3 * s, 1)
        const cg = new EdgesGeometry(ig)
        ig.dispose()
        disposables.push(cg)
        const canopy = new LineSegments(cg, mMid)
        canopy.position.set(x, groundY + th + 1.0 * s, z)
        env.add(canopy)
      }
      ;(
        [
          [-30, -19, 1.0],
          [-24, -14, 1.05],
          [-12, -21, 1.15],
          [2, -25, 1.1],
          [16, -19, 1.2],
          [28, -13, 1.15],
        ] as const
      ).forEach(([x, z, s]) => tree(x, z, s)) // background trees, well separated

      // midground + foreground layers so the unit reads with depth, not isolated
      ;(
        [
          [-15, -6, 0.95],
          [-5, -4, 0.85],
          [10, -5, 1.05],
          [20, -7, 1.1],
        ] as const
      ).forEach(([x, z, s]) => tree(x, z, s)) // midground trees, spaced apart
      addBox(9, 0.9, 1.2, -13, -4, mLow) // midground planters
      addBox(8, 0.9, 1.2, 15, -5, mLow)
      tree(32, 13, 2.4) // foreground trees frame the right edge, adding depth
      tree(23, 18, 2.7)

      // a paved base slab the unit sits on, so it reads as installed, not floating
      const padW = 8.5
      const padD = 4.6
      const padY = groundY + 0.015
      const pp: number[] = []
      const ring = (hw: number, hd: number) => {
        pp.push(-hw, padY, -hd, hw, padY, -hd, hw, padY, -hd, hw, padY, hd, hw, padY, hd, -hw, padY, hd, -hw, padY, hd, -hw, padY, -hd)
      }
      ring(padW / 2, padD / 2) // kerb outline
      ring(padW / 2 - 0.4, padD / 2 - 0.4) // inner edge
      for (let x = -padW / 2 + 1.1; x < padW / 2 - 0.5; x += 1.1) pp.push(x, padY, -padD / 2, x, padY, padD / 2)
      for (let z = -padD / 2 + 1.1; z < padD / 2 - 0.5; z += 1.1) pp.push(-padW / 2, padY, z, padW / 2, padY, z)
      const pg = new BufferGeometry()
      pg.setAttribute('position', new Float32BufferAttribute(pp, 3))
      disposables.push(pg)
      env.add(new LineSegments(pg, mk(0.5))) // brighter, reads as the installed base

      // the roadside — kerbs, lane markings, a crossing and street lamps
      const NEAR = 7.5
      const FAR = 11
      const rp: number[] = []
      const seg = (x1: number, z1: number, x2: number, z2: number) =>
        rp.push(x1, groundY + 0.02, z1, x2, groundY + 0.02, z2)
      seg(-40, NEAR, 40, NEAR)
      seg(-40, FAR, 40, FAR)
      seg(-40, NEAR - 0.9, 40, NEAR - 0.9) // near kerb
      seg(-40, FAR + 1.0, 40, FAR + 1.0) // pavement edge
      for (let x = -38; x < 38; x += 5) seg(x, (NEAR + FAR) / 2, x + 2.4, (NEAR + FAR) / 2) // centre dashes
      for (let z = NEAR + 0.4; z < FAR; z += 0.7) seg(2.5, z, 5.5, z) // pedestrian crossing
      const rg = new BufferGeometry()
      rg.setAttribute('position', new Float32BufferAttribute(rp, 3))
      disposables.push(rg)
      env.add(new LineSegments(rg, mMid))
      // street lamps along the pavement, arm reaching over the road
      const lamp = (x: number) => {
        const poleH = 6.5
        const topY = groundY + poleH
        addBox(0.16, poleH, 0.16, x, FAR + 1.8, mMid)
        addBoxAt(1.6, 0.12, 0.12, x - 0.7, topY - 0.15, FAR + 1.8, mMid)
        addBoxAt(0.55, 0.28, 0.34, x - 1.4, topY - 0.32, FAR + 1.8, mMid)
      }
      ;[-26, -10, 8, 24].forEach((x) => lamp(x))
    }

    let raf = 0
    let disposed = false

    const loader = new STLLoader()
    const total = PART_GROUPS.reduce((n, g) => n + g.files.length, 0)
    let loaded = 0

    const loadGeo = (url: string) =>
      new Promise<BufferGeometry>((resolve, reject) => {
        loader.load(
          url,
          (geo) => {
            geo.deleteAttribute('uv')
            geo.computeVertexNormals()
            resolve(geo)
          },
          undefined,
          reject,
        )
      })

    // the parked scooters load in parallel with the station; finalize() waits on
    // this before placing them. A GLB (not STL) so the organic body keeps its
    // smooth shared-vertex normals — an STL soup renders faceted and melted.
    let scooterGeo: BufferGeometry | null = null
    const gltfLoader = new GLTFLoader()
    /**
     * Gated on the flag. This row is currently off, and the fetch used to run
     * regardless — 4MB pulled down and parsed on every load for a mesh that is
     * never placed, with finalize() waiting on it, so the station's framing and
     * fittings were held behind a download of something nobody sees.
     */
    const scooterReady = !SCOOTER.enabled
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          gltfLoader.load(
            `${MODELS_BASE}/scooter-v4.glb`,
            (gltf) => {
              gltf.scene.traverse((o) => {
                if (!scooterGeo && (o as Mesh).isMesh)
                  scooterGeo = (o as Mesh).geometry as BufferGeometry
              })
              resolve()
            },
            undefined,
            (e) => {
              console.error('[Station3Model] scooter load failed', e)
              resolve()
            },
          )
        })

    Promise.all(
      PART_GROUPS.map(async (group) => {
        const geos = await Promise.all(
          group.files.map(async (f) => {
            const geo = await loadGeo(`${MODELS_BASE}/${f}.stl`)
            loaded += 1
            onProgress?.(loaded, total)
            return geo
          }),
        )
        if (disposed) return null
        // per-file centroids (mesh-local), used to focus the nearest sub-part
        const subLocal = geos.map((g, i) => {
          g.computeBoundingBox()
          if (group.id === 'supports' && group.files[i].startsWith('medium-support')) {
            ledgeBoxes.push({
              min: g.boundingBox!.min.clone(),
              max: g.boundingBox!.max.clone(),
            })
          }
          return g.boundingBox!.getCenter(new Vector3())
        })
        // both legs carry the embossed logo, lift it before the merge
        const emblems =
          group.id === 'legs' ? (geos.map(extractEmblem).filter(Boolean) as Emblem[]) : []
        // the merge walks every vertex of the group; the seven groups resolve
        // together, so without this they queue into one task like the loop below
        await breathe()
        if (disposed) return null
        const merged = mergeGeometries(geos, false) ?? geos[0]
        geos.forEach((g) => g.dispose())
        merged.computeBoundingBox()
        merged.computeBoundingSphere()
        return { group, merged, subLocal, emblems }
      }),
    )
      .then(async (results) => {
        if (disposed) return
        /**
         * A for-of that can await, rather than a forEach.
         *
         * Each iteration merges a group's geometry and runs EdgesGeometry over
         * it, which walks every triangle looking for silhouette edges. Seven of
         * those back to back is the second-longest block in the load, and like
         * the environment build it used to run as one task underneath the intro
         * descent. Pausing between groups costs seven frames and stops the
         * descent skipping.
         */
        for (const r of results) {
          if (disposed) return
          if (!r) continue
          const { group, merged, subLocal } = r
          disposables.push(merged)

          const faceMat = makeFaceMaterial(
            group.finish ?? (group.glass ? 'glass' : 'matte'),
            group.realColor ?? group.color,
          )
          faceMat.side = DoubleSide
          faceMat.emissiveIntensity = 0

          // The array was reading as a blank white slab. Its cell grid only
          // appeared on hover, because what showed then was the edge linework —
          // the panels themselves carried no surface detail at all.
          //
          // They can't, as loaded: STL stores triangles and nothing else, so the
          // merged geometry arrives with no UVs and no texture can bind to it.
          // The panels are flat and near-horizontal though, so projecting the
          // bounding box straight down gives a perfectly good planar unwrap —
          // the dual-pitch tilt is shallow enough that the stretch doesn't read.
          if (group.glass) {
            merged.computeBoundingBox()
            const bb = merged.boundingBox!
            const pos = merged.attributes.position
            const spanX = bb.max.x - bb.min.x || 1
            const spanZ = bb.max.z - bb.min.z || 1
            const uv = new Float32Array(pos.count * 2)
            for (let i = 0; i < pos.count; i++) {
              uv[i * 2] = (pos.getX(i) - bb.min.x) / spanX
              uv[i * 2 + 1] = (pos.getZ(i) - bb.min.z) / spanZ
            }
            merged.setAttribute('uv', new BufferAttribute(uv, 2))
            const cells = pvCellTexture()
            disposables.push(cells)
            faceMat.map = cells
            // the scanned-in cell pattern carries the tone now
            faceMat.color.setHex(0xffffff)
            faceMat.needsUpdate = true
          }
          disposables.push(faceMat)
          const faceMesh = new Mesh(merged, faceMat)
          faceMesh.frustumCulled = false
          faceMesh.userData.groupId = group.id
          model.add(faceMesh)
          occluders.push(faceMesh)

          // the lifted logo, coloured like the real unit: white chevron, lit
          // teal diamond, each a hair proud of the cabinet copy beneath it
          // (polygon offset keeps them above z-fighting)
          if (r.emblems.length) {
            const { diamond: diamondMat, chevron: chevronMat } = makeEmblemMaterials()
            disposables.push(diamondMat, chevronMat)
            r.emblems.forEach((e) => {
              for (const [g, mat] of [
                [e.diamond, diamondMat],
                [e.chevron, chevronMat],
              ] as const) {
                if (!g) continue
                disposables.push(g)
                const m = new Mesh(g, mat)
                m.frustumCulled = false
                model.add(m)
              }
            })
          }

          // the solar array is 10 panels in 3 banks, treat the whole roof as one
          // hotspot so hovering any panel (or the gaps between) reads as one part,
          // never flickering to the frames/cables beneath. Invisible ray catcher.
          if (group.id === 'panels' && merged.boundingBox) {
            const size = merged.boundingBox.getSize(new Vector3())
            const mid = merged.boundingBox.getCenter(new Vector3())
            const proxyGeo = new BoxGeometry(size.x, size.y, size.z)
            disposables.push(proxyGeo)
            const proxyMat = new MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false })
            proxyMat.colorWrite = false
            disposables.push(proxyMat)
            const proxy = new Mesh(proxyGeo, proxyMat)
            proxy.position.copy(mid)
            proxy.frustumCulled = false
            proxy.userData.groupId = 'panels'
            proxy.userData.proxy = true
            model.add(proxy)
            occluders.push(proxy)
          }

          if (group.id === 'legs' && merged.boundingBox) {
            columnBox = {
              min: merged.boundingBox.min.clone(),
              max: merged.boundingBox.max.clone(),
            }
          }

          // clean edges, panels get outlines only (high threshold), structure
          // keeps its detail. All groups have edges for the wireframe intro.
          const edgeGeo = new EdgesGeometry(merged, group.glass ? 42 : 24)
          disposables.push(edgeGeo)
          const edgeMat = new LineBasicMaterial({ color: WHITE.clone(), transparent: true, opacity: 0.9 })
          disposables.push(edgeMat)
          const edges = new LineSegments(edgeGeo, edgeMat)
          edges.frustumCulled = false
          faceMesh.add(edges)

          parts.set(group.id, {
            faceMat,
            edgeMat,
            glass: !!group.glass,
            anchor: new Vector3(),
            radius: 1,
            view: group.view,
            focusNearest: group.focusNearest,
            subLocal,
          })
          await breathe()
        }
        await scooterReady
        if (disposed) return
        await finalize()
      })
      .catch((err) => {
        // an abort is the component unmounting mid-build, which is not a fault
        if (err instanceof AbortError || disposed) return
        console.error('[Station3Model] load failed', err)
      })

    const finalize = async () => {
      model.updateMatrixWorld(true)
      const box = new Box3().setFromObject(model)
      const center = box.getCenter(new Vector3())
      const size = box.getSize(new Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      model.position.sub(center)
      const fit = 6 / maxDim
      pivot.scale.setScalar(fit)
      boundR = (maxDim * fit) / 2 + 0.4
      // drop the ground grid to the base of the unit
      grid.position.y = (-size.y * fit) / 2 - 0.02
      if (PHOTOREAL) {
        // real site: paving, planting, sky. The blueprint grid and its wireframe
        // surroundings stay off entirely.
        grid.visible = false
        // spans several frames now, pausing between stages so the intro descent
        // running over the top of this keeps getting its frames
        photoreal = await buildPhotorealEnvironment({
          scene,
          renderer,
          groundY: grid.position.y,
          radius: boundR,
          detail: heroStyle === 'realistic' ? 'realistic' : 'model',
          aborted: () => disposed,
        })
        // aim the sun at the unit so its shadow frustum is centred on the subject
        photoreal.sun.target.position.set(0, grid.position.y, 0)
        photoreal.sun.target.updateMatrixWorld()
      } else {
        // build the blueprint surroundings on that same ground plane
        buildEnvironment(grid.position.y)
      }

      rig.rotation.y = 0
      rig.updateMatrixWorld(true)
      occluders.forEach((mesh) => {
        if (mesh.userData.proxy) return // ray-catcher only; keep the real anchor
        const p = parts.get(mesh.userData.groupId as string)
        if (!p) return
        const b = new Box3().setFromObject(mesh)
        p.anchor.copy(b.getCenter(new Vector3()))
        p.radius = b.getSize(new Vector3()).length() * 0.5
        // resolve per-file centroids into rig-local space (matches p.anchor);
        // the mesh sits under rig with no rotation here, so its world matrix
        // maps mesh-local → the frame p.anchor lives in
        if (p.subLocal) {
          p.subAnchors = p.subLocal.map((c) => c.clone().applyMatrix4(mesh.matrixWorld))
        }
      })

      // ── park the yellow scooters under the canopy ──────────────────
      // Placed in the station's original (pre-fit) coordinate frame, as children
      // of `model`, so they inherit the exact center-shift, fit-scale and spin as
      // the unit. Not added to `occluders`, so they don't intercept part hovers.
      if (SCOOTER.enabled && scooterGeo) {
        scooterGeo.computeBoundingBox()
        const sBox = scooterGeo.boundingBox!
        const sSize = sBox.getSize(new Vector3())
        // three-zone by height, matching the real bike: a dark bottom band
        // (wheels + lower fairing) and a dark top band (seat, bars, mirror), with
        // the yellow body between. STL carries no colour/UVs, so height zones are
        // the closest we can get without a textured export. Reorder the index into
        // [dark…, yellow…] so each colour is one contiguous draw group.
        if (scooterGeo.index && !scooterGeo.groups.length) {
          const pos = scooterGeo.attributes.position
          const src = scooterGeo.index.array
          const yLo = sBox.min.y + SCOOTER.tyreFrac * sSize.y
          const yHi = sBox.min.y + SCOOTER.seatFrac * sSize.y
          const dark: number[] = []
          const light: number[] = []
          for (let t = 0; t < src.length; t += 3) {
            const a = src[t], b = src[t + 1], c = src[t + 2]
            const ya = pos.getY(a), yb = pos.getY(b), yc = pos.getY(c)
            const isDark = Math.max(ya, yb, yc) <= yLo || Math.min(ya, yb, yc) >= yHi
            ;(isDark ? dark : light).push(a, b, c)
          }
          scooterGeo.setIndex([...dark, ...light])
          scooterGeo.clearGroups()
          scooterGeo.addGroup(0, dark.length, 0) // material 0 = tyre/dark
          scooterGeo.addGroup(dark.length, light.length, 1) // material 1 = yellow
        }
        const longIsX = size.x >= size.z
        const longSize = longIsX ? size.x : size.z
        const shortSize = longIsX ? size.z : size.x
        const centerLong = longIsX ? center.x : center.z
        const centerShort = longIsX ? center.z : center.x
        const targetH = SCOOTER.heightRatio * size.y
        const sScale = targetH / (sSize.y || 1)
        // bike length runs along its local X; turn it to face across the short
        // axis so the row lines up along the canopy, bikes nose-out
        const baseYaw = (longIsX ? Math.PI / 2 : 0) + (SCOOTER.yawDeg * Math.PI) / 180
        const rowLen = longSize * SCOOTER.spanRatio
        const y = box.min.y + sSize.y * sScale * 0.5 + SCOOTER.lift * size.y
        // matte (high roughness, no metalness) so the decimated surface reads
        // clean instead of catching specular noise across every micro-facet
        const tyreMat = new MeshStandardMaterial({ color: new Color(SCOOTER.tyre), roughness: 0.9, metalness: 0 })
        const bodyMat = new MeshStandardMaterial({ color: new Color(SCOOTER.color), roughness: 0.82, metalness: 0 })
        const scootMats = [tyreMat, bodyMat]
        disposables.push(tyreMat, bodyMat)
        for (let i = 0; i < SCOOTER.count; i++) {
          const t = SCOOTER.count === 1 ? 0 : i / (SCOOTER.count - 1) - 0.5
          const along = centerLong + t * rowLen
          const lateral = centerShort + SCOOTER.lateral * shortSize
          const m = new Mesh(scooterGeo, scootMats)
          m.scale.setScalar(sScale)
          m.position.set(longIsX ? along : lateral, y, longIsX ? lateral : along)
          m.rotation.y = baseYaw
          m.frustumCulled = false
          model.add(m)
        }
      }

      if (PHOTOREAL) {
        // after the scooters are parked, so they cast too
        model.traverse((o) => {
          const m = o as Mesh
          if (m.isMesh) {
            m.castShadow = true
            m.receiveShadow = true
          }
        })
      }

      // ── one e-motorcycle parked under the solar array, nose inward ──
      // Added as a child of `model` so it inherits the same centre-shift, fit
      // scale and orientation as the station, and stays put when the camera
      // orbits. Optional: if neither file is present the bay is simply empty.
      //
      // Placement is a two-level transform on purpose. The inner object only ever
      // does the axis conversion, and a parent holder does the yaw and position.
      // Folding both into one Euler makes the order of rotations matter, and that
      // is what once parked the bike inside the frame rather than beside it.
      /**
       * Seat an already-Y-up bike in the bay. `flipNose` exists because no mesh
       * format records which end of a model is the front: it has to be told, and
       * the only way to know is to look at it once.
       */
      /**
       * A row of bikes down each long side of the station, all nosed in.
       *
       * Instanced, not cloned. The glTF is one 430k-triangle mesh, so eight
       * clones would be 3.4M triangles in eight draw calls with the geometry
       * uploaded once per copy. As an InstancedMesh the geometry and its four
       * 1–13MB textures are uploaded once and the whole fleet is a single draw.
       *
       * The nose direction was read off the mesh rather than guessed: the top 3%
       * of vertices (handlebars and mirrors) sit at −X and the seat-height mass
       * at +X, and on a scooter the bars are forward of the seat. So local −X is
       * the front, and the row on the far side is turned through π to face back.
       */
      /** the advertising panel on the centre column, one facing each bay */
      const mountScreen = () => {
        if (!SCREEN.enabled || !columnBox) return
        const cb = columnBox
        const colH = cb.max.y - cb.min.y
        const h = colH * SCREEN.heightFrac
        const w = h * SCREEN.aspect

        const player = makeScreenPlayer(Math.round(SCREEN_W / SCREEN.aspect))
        const tex = new CanvasTexture(player.canvas)
        tex.colorSpace = SRGBColorSpace
        disposables.push(tex)

        const geo = new PlaneGeometry(w, h)
        disposables.push(geo)

        // Mounted to the COLUMNS, not to the station's outer box. The mid pillar
        // sits at the centre of the column run, and the column's own front face
        // is where a screen would actually be fixed.
        const midX = (cb.min.x + cb.max.x) / 2
        const y = cb.min.y + colH * SCREEN.lift
        const faces: [number, number][] = [
          [cb.max.z + SCREEN.standoff, 0],
          [cb.min.z - SCREEN.standoff, Math.PI],
        ]

        for (const [z, rotY] of faces) {
          /**
           * Unlit, not emissive. A bright panel with an emissive map is counted
           * twice — once by the sun, once by itself — and clips to a flat white
           * rectangle with the artwork washed out of it. A basic material
           * renders the texture at its own values, which is both what a screen
           * looks like and what stays legible against the black column.
           */
          const mat = new MeshBasicMaterial({ map: tex })
          disposables.push(mat)
          const m = new Mesh(geo, mat)
          m.position.set(midX + SCREEN.along * (cb.max.x - cb.min.x), y, z)
          m.rotation.y = rotY
          m.frustumCulled = false
          model.add(m)
        }

        // Both faces share one texture, so one draw serves the whole display.
        // Driven off its own interval rather than the render loop: the panel
        // only needs 12fps and the scene runs at 60.
        const t0 = performance.now()
        const cycle = window.setInterval(() => {
          player.draw((performance.now() - t0) / 1000)
          tex.needsUpdate = true
        }, Math.round(1000 / SCREEN_FPS))
        timers.push(cycle)
      }

      /**
       * One outlet box on the outward face of each of the two plates. Anchored
       * to the plates' own measured bounds rather than to fixed coordinates, so
       * if the CAD moves the plates the sockets ride along with them.
       *
       * On the face, not the top: a socket lying face-up outdoors fills with
       * water, and this is also where it reads from the camera — the top of the
       * plate is seen almost edge-on at the resting angle.
       */
      const mountSockets = () => {
        if (!SOCKET.enabled || !ledgeBoxes.length) return

        // one texture and one geometry shared by both units — every plate is
        // the same section, so the box only has to be sized once
        const tex = socketFaceTexture()
        disposables.push(tex)
        const h = (ledgeBoxes[0].max.y - ledgeBoxes[0].min.y) * SOCKET.faceOfPlate
        const w = h * SOCKET.aspect
        const geo = new BoxGeometry(w, h, SOCKET.standoff)
        disposables.push(geo)

        const shell = new MeshStandardMaterial({ color: 0xf2f3f2, roughness: 0.42, metalness: 0 })
        const face = new MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0 })
        disposables.push(shell, face)
        // BoxGeometry groups run +x, -x, +y, -y, +z, -z — only +z carries the
        // sockets, the other five are the plain moulded casing
        const mats = [shell, shell, shell, shell, face, shell]

        for (const lb of ledgeBoxes) {
          const x = (lb.min.x + lb.max.x) / 2 + SOCKET.along * (lb.max.x - lb.min.x)
          const y = (lb.min.y + lb.max.y) / 2 // centred on the plate's face
          // Both faces of every plate: bikes park down either side, so outlets
          // on one side only would leave half the bays with nothing to plug
          // into. Turning the box 180deg puts its textured +z face outward.
          const faces: [number, number][] = [
            [lb.max.z + SOCKET.standoff / 2, 0], // proud of the plate, not sunk in
            [lb.min.z - SOCKET.standoff / 2, Math.PI],
          ]
          for (const [z, rotY] of faces) {
            const m = new Mesh(geo, mats)
            m.position.set(x, y, z)
            m.rotation.y = rotY
            m.castShadow = true
            m.receiveShadow = true
            m.frustumCulled = false
            model.add(m)
          }
        }
      }

      const parkBikeRow = (scene: Object3D) => {
        scene.updateMatrixWorld(true)
        let src: Mesh | null = null
        scene.traverse((o) => {
          const m = o as Mesh
          if (!src && m.isMesh && m.geometry) src = m
        })
        if (!src) return parkStlBike()
        const source = src as Mesh

        // bake the loader's own transform (units, up-axis) into the geometry so
        // the instance matrices are the only transform left to reason about
        const geo = source.geometry.clone()
        geo.applyMatrix4(source.matrixWorld)
        geo.computeBoundingBox()
        const bb = geo.boundingBox!
        const bSize = bb.getSize(new Vector3())
        const bCentre = bb.getCenter(new Vector3())
        // centre on X/Z and drop onto its own wheels, so an instance matrix is
        // just "put the contact patch here"
        geo.translate(-bCentre.x, -bb.min.y, -bCentre.z)

        const s = (size.y * BIKES.heightRatio) / (bSize.y || 1)
        const longIsX = size.x >= size.z
        const longSize = longIsX ? size.x : size.z
        const shortSize = longIsX ? size.z : size.x
        // length across the bay, nose toward the unit; the far row turns about
        const baseYaw = longIsX ? -Math.PI / 2 : 0

        /**
         * The indicator lenses are painted red in the model's baked baseColor
         * map; on the real machine they are amber. Rather than decode and
         * rewrite a 9.8MB JPEG on the client, the swap happens in the fragment
         * shader after the texture is sampled: no copy, no upload, nothing per
         * frame.
         *
         * The red covers two different parts — the mirror glass up front and the
         * lamp at the back — so it needs splitting, and colour cannot do it
         * because both are the same red. Position can. Sampling every vertex's
         * UV against the map puts the red in two clusters along the bike's own
         * axis, with nothing whatsoever between them:
         *
         *   mirrors   −0.8 … −0.1    735 vertices
         *   (gap)     −0.1 … +0.4      0 vertices
         *   rear lamp +0.5 … +1.0   1435 vertices
         *
         * The cutoff sits at +0.2, inside that measured gap, so it cannot cut a
         * lamp in half however the model is scaled or reoriented.
         *
         * Thresholds are measured off the actual 4096x4096 map, not guessed. The
         * red occupies 0.57% of it and runs sRGB (91,3,2) at its dimmest to
         * (186,6,2) at its most common — so what identifies it is not that red
         * is HIGH but that green and blue are almost exactly ZERO:
         *
         *   red, dimmest    0.105, 0.001, 0.001  ->  caught
         *   red, typical    0.491, 0.002, 0.001  ->  caught
         *   brand yellow    0.911, 0.477, 0.003  ->  green far too high
         *   orange blinker  0.887, 0.164, 0.007  ->  green too high, left alone
         *   black plastic   0.005, 0.005, 0.006  ->  red too low
         *
         * A brightness test alone fails: at r > 0.25 the dim end of the red is
         * missed, and dropping the floor far enough to catch it starts eating
         * dark browns. Bounding green and blue instead separates every case.
         *
         * Values are linear, not sRGB: `map_fragment` has already decoded the
         * texture by this point.
         */
        const mat = (source.material as MeshStandardMaterial).clone()
        mat.onBeforeCompile = (shader) => {
          // local X normalised to −1 at the front wheel, +1 at the tail
          shader.uniforms.uHalfLen = { value: bSize.x / 2 }
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              '#include <common>\nvarying float vAxis;\nuniform float uHalfLen;',
            )
            .replace(
              '#include <begin_vertex>',
              '#include <begin_vertex>\nvAxis = position.x / max(uHalfLen, 0.0001);',
            )
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vAxis;')
            .replace(
              '#include <map_fragment>',
              `#include <map_fragment>
            {
              vec3 c = diffuseColor.rgb;
              if (c.r > 0.05 && c.g < 0.015 && c.b < 0.015) {
                diffuseColor.rgb = vAxis > 0.2
                  // amber rear lamp
                  ? vec3(0.89, 0.26, 0.01)
                  // pale neutral, a touch cool, so it reads as mirror glass
                  : vec3(0.64, 0.67, 0.73);
              }
            }`,
            )
        }
        mat.customProgramCacheKey = () => 'bike-mirror-remap'

        const total = BIKES.perSide * 2
        const im = new InstancedMesh(geo, mat, total)
        const dummy = new Object3D()
        let i = 0
        for (const side of [1, -1]) {
          for (let k = 0; k < BIKES.perSide; k++) {
            // spread the row about the centre of the long axis
            const t = BIKES.perSide === 1 ? 0 : k / (BIKES.perSide - 1) - 0.5
            const along = t * BIKES.spanRatio * longSize
            const out = side * BIKES.lateral * shortSize
            dummy.position.set(
              longIsX ? center.x + along : center.x + out,
              box.min.y,
              longIsX ? center.z + out : center.z + along,
            )
            dummy.rotation.set(0, baseYaw + (side > 0 ? 0 : Math.PI), 0)
            dummy.scale.setScalar(s)
            dummy.updateMatrix()
            im.setMatrixAt(i++, dummy.matrix)
          }
        }
        im.instanceMatrix.needsUpdate = true
        im.castShadow = true
        im.receiveShadow = true
        im.frustumCulled = false
        model.add(im)
      }

      const parkBike = (bike: Object3D, flipNose: boolean) => {
        bike.updateMatrixWorld(true)
        const bb = new Box3().setFromObject(bike)
        const bSize = bb.getSize(new Vector3())
        const bCentre = bb.getCenter(new Vector3())
        // ride height: a motorcycle stands about a third of the unit's height
        const s = (size.y * BIKE.heightRatio) / (bSize.y || 1)

        // Scale and seating go on a wrapper rather than on the object itself: a
        // loaded scene carries its own transform for units and up-axis, and
        // writing over it throws that away.
        const seat = new Group()
        seat.add(bike)
        seat.scale.setScalar(s)
        seat.position.set(-bCentre.x * s, -bb.min.y * s, -bCentre.z * s)

        // The canopy's long axis carries the bays; the bike parks across it, set
        // out to one side so it sits in the open under the panels rather than
        // intersecting the frame, and turned to face back into the unit.
        const longIsX = size.x >= size.z
        const shortSize = longIsX ? size.z : size.x
        const offset = BIKE.lateral * shortSize
        const holder = new Group()
        holder.add(seat)
        holder.position.set(
          longIsX ? center.x + BIKE.along * size.x : center.x + offset,
          box.min.y,
          longIsX ? center.z + offset : center.z + BIKE.along * size.z,
        )
        // point the long axis across the bay, then turn it end-for-end if this
        // model happens to be drawn nose-backwards
        const modelLongIsX = bSize.x >= bSize.z
        let yaw = longIsX ? (modelLongIsX ? Math.PI / 2 : 0) : modelLongIsX ? 0 : Math.PI / 2
        if (flipNose) yaw += Math.PI
        holder.rotation.y = yaw

        bike.traverse((o: Object3D) => {
          const m = o as Mesh
          if (m.isMesh) {
            m.castShadow = true
            m.receiveShadow = true
            m.frustumCulled = false
          }
        })
        model.add(holder)
      }

      // Prefer a textured glTF if one has been dropped in. STL carries geometry
      // only — no UVs, no materials, and every per-triangle attribute byte in
      // ours is zero — so the yellow below is ours, not the file's. The STL is
      // the fallback, so the bay is never empty while a colour export is chased.
      const parkStlBike = () => {
        new STLLoader().load(
          `${MODELS_BASE}/bike.stl`,
          (bikeGeo) => {
            bikeGeo.computeVertexNormals()

            // The real scooter is two-tone: glossy yellow bodywork with black
            // tyres, footboard, seat and bars. An STL carries neither colour nor
            // UVs, so the only thing available to divide it by is its own shape —
            // and height happens to be exactly how this machine is painted. The
            // black sits at the bottom (wheels, lower fairing) and at the top
            // (seat, handlebars), with the yellow panels in the band between.
            bikeGeo.computeBoundingBox()
            const zb = bikeGeo.boundingBox!
            const zMin = zb.min.z
            const zSpan = zb.max.z - zb.min.z || 1
            const xMin = zb.min.x
            const xSpan = zb.max.x - zb.min.x || 1
            const pos = bikeGeo.attributes.position
            const triCentre = (i: number) => ({
              x: (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
              z: (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
            })

            // The front fender is yellow on the real machine, but it sits low —
            // inside the band the height rule paints black. A horizontal cut
            // cannot tell a fender from the tyre it wraps, so this finds the
            // front hub and separates them by radius instead: the tyre is a
            // surface of revolution at a fixed distance from the axle, and the
            // fender and fork shroud are the only things sitting outside it.
            //
            // The hub is located from the mesh itself — the centroid of the
            // low, forward triangles, which the wheel dominates. Its height
            // above the ground then *is* the tyre radius, because the wheel is
            // standing on the floor. (Measured on this export: hub 332 up,
            // radius 332. The two agreeing is the check that it worked.)
            // Both hubs, found the same way: the centroid of the low triangles at
            // each end. Doing both means the tyres are identified as tyres rather
            // than inferred from a height cut — which matters, because a wheel
            // reaches twice its own radius off the ground (measured here: hub 332
            // up, radius 332, so the crown is at 48% of the bike's height). Every
            // horizontal threshold low enough to spare the bodywork was leaving
            // the tops of both tyres painted yellow.
            const hub = (front: boolean) => {
              let sx = 0
              let sz = 0
              let k = 0
              for (let i = 0; i < pos.count; i += 3) {
                const c = triCentre(i)
                const fx = (c.x - xMin) / xSpan
                if ((front ? fx < BIKE.frontZone : fx > 1 - BIKE.frontZone) && (c.z - zMin) / zSpan < 0.45) {
                  sx += c.x
                  sz += c.z
                  k++
                }
              }
              const z = k ? sz / k : zMin
              return { x: k ? sx / k : xMin, z, r: Math.max(z - zMin, 1e-6) }
            }
            const front = hub(true)
            const rear = hub(false)
            const onWheel = (x: number, z: number) =>
              Math.hypot(x - front.x, z - front.z) <= front.r ||
              Math.hypot(x - rear.x, z - rear.z) <= rear.r

            const dark: number[] = []
            const body: number[] = []
            for (let i = 0; i < pos.count; i += 3) {
              // classify by the triangle's own centre, so a face never straddles
              const c = triCentre(i)
              const f = (c.z - zMin) / zSpan
              const isFront = (c.x - xMin) / xSpan < BIKE.frontZone
              const clearOfTyre =
                Math.hypot(c.x - front.x, c.z - front.z) > front.r * BIKE.fenderClear
              let isDark: boolean
              if (onWheel(c.x, c.z)) {
                isDark = true // rubber and rim, at either end
              } else if (isFront && clearOfTyre && f < BIKE.fenderMaxHeight) {
                isDark = false // fender and fork shroud: paint, not rubber
              } else {
                isDark = f < BIKE.lowerBlack || f > BIKE.upperBlack
              }
              ;(isDark ? dark : body).push(i, i + 1, i + 2)
            }
            // one contiguous run per colour, so each becomes a single draw group
            bikeGeo.setIndex([...dark, ...body])
            bikeGeo.clearGroups()
            bikeGeo.addGroup(0, dark.length, 0)
            bikeGeo.addGroup(dark.length, body.length, 1)

            const blackMat = new MeshStandardMaterial({
              color: 0x1a1b1f,
              roughness: 0.62, // moulded plastic and rubber, not paint
              metalness: 0.05,
            })
            const yellowMat = new MeshStandardMaterial({
              color: 0xf7c518,
              roughness: 0.26, // the bodywork is clear-coated and genuinely glossy
              metalness: 0.08,
            })
            disposables.push(blackMat, yellowMat, bikeGeo)
            const mesh = new Mesh(bikeGeo, [blackMat, yellowMat])
            // this export is Z-up; stand it on its wheels before it is measured
            mesh.rotation.x = -Math.PI / 2
            parkBike(mesh, BIKE.flipNoseStl)
          },
          undefined,
          () => {
            /* neither file present: the bay under the canopy just stays empty */
          },
        )
      }

      // The glTF is probed by hand rather than handed straight to the loader.
      // A single-page host — this dev server included — answers a missing file
      // with index.html and a 200, so status proves nothing; only the four-byte
      // "glTF" magic does. Sniffing it keeps the fallback a deliberate branch
      // instead of something that happens to work because a parse threw.
      //
      // Parked behind BIKE.enabled. Everything above — the placement, the facing,
      // the wheel-radius paint split — stays intact, so putting the bike back is
      // one boolean rather than a rebuild.
      if (BIKE.enabled)
        fetch(`${MODELS_BASE}/bike.glb`)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('absent'))))
        .then((buf) => {
          if (buf.byteLength < 4 || new DataView(buf).getUint32(0, false) !== 0x676c5446) {
            throw new Error('not a glb')
          }
          /**
           * Draco-compressed, so the loader needs the decoder wired in or the
           * parse fails outright and we fall back to the STL bike — silently,
           * since that fallback is a legitimate branch. It buys back 11MB of
           * vertex data for a 192KB wasm fetched once and cached.
           *
           * The decoder URLs come through Vite's `?url` rather than a hand-copied
           * folder in public/: the files get hashed and versioned like any other
           * asset, they follow the app's base path automatically, and they cannot
           * drift out of sync with whatever three version is installed.
           *
           * The object form of setDecoderPath matters — it sets `dep_js` to null.
           * The string form additionally resolves `draco_decoder.js`, a 512KB
           * pure-JS fallback this scene has no use for, and fetches it eagerly.
           */
          const gl = new GLTFLoader()
          const draco = new DRACOLoader()
          draco.setDecoderPath({ js: dracoWrapperUrl, wasm: dracoWasmUrl })
          gl.setDRACOLoader(draco)
          gl.parse(
            buf,
            '',
            (gltf) => {
              parkBikeRow(gltf.scene)
              // the worker pool is per-loader, and this is the only Draco asset
              // in the scene — holding it open past the one parse leaks a thread
              draco.dispose()
            },
            () => {
              draco.dispose()
              parkStlBike()
            },
          )
        })
        .catch(parkStlBike)

      mountScreen()
      mountSockets()
      resize()

      /**
       * Compile every shader in the scene BEFORE reporting ready.
       *
       * Compilation is a synchronous stall inside the graphics driver, and three
       * does it lazily — the first time a material is actually drawn. Left alone
       * that means the whole scene's shaders compile during the first rendered
       * frame, which is precisely the frame the intro hands over on. All the care
       * taken over the descent and the fade is spent, and then the reveal opens
       * on a locked-up tab.
       *
       * `compileAsync` moves it earlier, into the window where a full-screen
       * animation is already covering for us. Where the driver supports
       * KHR_parallel_shader_compile it also gets to do the work off-thread; where
       * it does not, this is still a stall — just a stall nobody can see.
       */
      await renderer.compileAsync(scene, camera)
      if (disposed) return

      onReady?.()
      startLoop()
    }

    // ── materials (per frame, cheap for 7 groups) ─────────────────
    const emGlassOff = new Color(GLASS_EMISSIVE)
    const emGlassOn = new Color(0x1e6bb8)
    const black = new Color(0x000000)
    const applyMaterials = () => {
      // Highlighting is an inspection affordance, so it only exists once the
      // visitor has entered. Before that the hero is a picture of the product:
      // a panel lighting up under a pointer that happens to cross it reads as a
      // glitch, not an invitation.
      const hi = enteredRef.current ? pressedId ?? hoveredId : null
      parts.forEach((p, id) => {
        const on = id === hi
        // faces are always solid, so the unit reads as the real product from the
        // first frame (black cabinet, silver wings, dark PV)
        p.faceMat.emissiveIntensity = p.glass ? 0.12 + (on ? 0.9 : 0) : on ? 0.5 : 0
        ;(p.faceMat.emissive as Color).copy(on ? (p.glass ? emGlassOn : TEAL) : p.glass ? emGlassOff : black)
        // edges: panels fade out as they solidify; structure stays as blueprint.
        // 0.9 base, dark ink at half strength washed out on the white page.
        // Photoreal drops the ink entirely — a real object has no outline; only
        // the hovered part still gets a teal edge so selection stays readable.
        const base = 0
        p.edgeMat.opacity = on ? Math.max(base, 0.95) : base
        ;(p.edgeMat.color as Color).copy(on ? TEAL : WHITE)
      })
    }

    // ── interaction ────────────────────────────────────────────────
    const raycaster = new Raycaster()
    const pointerNDC = new Vector2()
    let pointerInside = false
    let pointerMoved = false
    let hoveredId: string | null = null
    let pressedId: string | null = null
    let pressSpin = 0
    // where the pointer last hit the model (world space) + the focused sub-part
    const hoveredPoint = new Vector3()
    let hasHoveredPoint = false
    let pressAnchor: Vector3 | null = null
    let mx = 0
    let my = 0
    let targetMx = 0
    let targetMy = 0
    let reticleX = 0
    let reticleY = 0
    // static intro angle chosen so the illuminated logo reads at ~3/4;
    // spin only begins after ENTER
    // intro angle sits exactly on the floor grid: -90°, so the unit's edges run
    // parallel to the grid lines, it reads as *placed*, not dropped at random.
    // No drift here: any rotation would break that alignment.
    const INTRO_ANGLE = INTRO_SPIN
    let spinCurrent = INTRO_ANGLE
    let spinTarget = INTRO_ANGLE
    const introAngle = INTRO_ANGLE
    let solidify = 0
    // drag-to-orbit state (section 2): user controls the spin (azimuth) and the
    // camera pitch by dragging; once they do, the idle auto-spin stops
    let orbitElev = DEFAULT_ELEV
    let dragging = false
    let pointerDownActive = false
    let downX = 0
    let downY = 0
    let lastX = 0
    let lastY = 0

    const setHovered = (id: string | null) => {
      if (id === hoveredId) return
      hoveredId = id
      if (!pressedId) onHoverChange(id)
      // pointer cursor only once inside, in the intro the unit isn't clickable
      mount.style.cursor = id && enteredRef.current ? CURSOR_ACTIVE : CURSOR_REST
    }
    const setPressed = (id: string | null) => {
      if (id === pressedId) return
      pressedId = id
      pressAnchor = null
      if (id) {
        const p = parts.get(id)
        pressSpin = coterminal(p?.view?.spin ?? spinCurrent, spinCurrent)
        // focus the sub-part (e.g. leg) nearest where the pointer is held
        if (p?.focusNearest && p.subAnchors?.length && hasHoveredPoint) {
          const local = rig.worldToLocal(hoveredPoint.clone())
          let best = p.subAnchors[0]
          let bestD = Infinity
          for (const sa of p.subAnchors) {
            const d = sa.distanceToSquared(local)
            if (d < bestD) {
              bestD = d
              best = sa
            }
          }
          pressAnchor = best
        }
      }
      onPressChange(id)
    }

    // the part legend drives inspection from outside, only meaningful once entered
    if (selectRef) selectRef.current = (id) => { if (enteredRef.current) setPressed(id) }

    const doRaycast = () => {
      if (!pointerInside || occluders.length === 0) {
        hasHoveredPoint = false
        return setHovered(null)
      }
      raycaster.setFromCamera(pointerNDC, camera)
      const hit = raycaster.intersectObjects(occluders, false)[0]
      if (hit) {
        hoveredPoint.copy(hit.point)
        hasHoveredPoint = true
      } else {
        hasHoveredPoint = false
      }
      setHovered(hit ? (hit.object.userData.groupId as string) : null)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!canvasW || !canvasH) return
      const px = e.clientX - canvasLeft
      const py = e.clientY - canvasTop
      pointerNDC.set((px / canvasW) * 2 - 1, -(py / canvasH) * 2 + 1)
      targetMx = pointerNDC.x
      targetMy = pointerNDC.y
      reticleX = px
      reticleY = py
      pointerInside = true
      pointerMoved = true

      // drag-to-orbit: a held drag rotates the unit and pitches the camera
      if (pointerDownActive && enteredRef.current) {
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        const touch = e.pointerType === 'touch'
        // on a phone only a decisively sideways swipe counts as a spin, anything
        // leaning vertical is the reader trying to scroll on past
        const totalX = e.clientX - downX
        const totalY = e.clientY - downY
        const sideways = Math.abs(totalX) > Math.abs(totalY)
        if (!dragging && Math.hypot(totalX, totalY) > 5 && (!touch || sideways)) {
          dragging = true

          setPressed(null) // a drag cancels the click-and-hold zoom
          mount.style.cursor = CURSOR_ACTIVE
        }
        if (dragging) {
          // a thumb covers far less ground than a mouse, so it turns further per pixel
          spinTarget += dx * (touch ? 0.012 : 0.007) // horizontal → spin the unit
          // vertical stays the page's on touch; tilting is a pointer-only move
          if (!touch) {
            orbitElev = Math.min(Math.max(orbitElev - dy * 0.005, MIN_ELEV), MAX_ELEV)
          }
        }
        lastX = e.clientX
        lastY = e.clientY
      }
    }
    const endDrag = () => {
      pointerDownActive = false
      dragging = false
      mount.style.cursor = hoveredId && enteredRef.current ? CURSOR_ACTIVE : CURSOR_REST
    }
    const onPointerLeave = () => {
      pointerInside = false
      setHovered(null)
      // a legend selection survives the pointer leaving the canvas
      endDrag()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (enteredRef.current) {
        pointerDownActive = true
        dragging = false
        downX = e.clientX
        downY = e.clientY
        lastX = e.clientX
        lastY = e.clientY
        // click-and-hold zoom is gone, inspection is driven by the part legend,
        // so pressing the model only ever starts a drag
      }
      // intro: the unit itself is not clickable, ENTER is the only way in
    }
    const onPointerUp = () => {
      // selection is owned by the legend now, releasing the pointer keeps it
      endDrag()
    }

    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerleave', onPointerLeave)
    mount.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)

    // ── camera ─────────────────────────────────────────────────────
    const curTarget = new Vector3(0, 0, 0)
    let curDist = 14
    let curElev = INTRO_ELEV
    // 0 → 1 over ARRIVAL.seconds; 1 means the approach is over and the camera
    // is back under the normal rig
    let arrivalT = arriveFromAbove ? 0 : 1
    let arrivalDist = 0
    const desiredTarget = new Vector3()
    const worldAnchor = new Vector3()
    const right = new Vector3()
    const up = new Vector3()
    const camPos = new Vector3()
    const UP = new Vector3(0, 1, 0)

    const updateCamera = () => {
      let desiredElev: number
      let desiredDist: number
      if (pressedId && parts.get(pressedId) && solidify > 0.6) {
        const p = parts.get(pressedId)!
        worldAnchor.copy(pressAnchor ?? p.anchor).applyMatrix4(rig.matrixWorld)
        desiredTarget.copy(worldAnchor)
        desiredElev = p.view?.elevation ?? DEFAULT_ELEV
        desiredDist = Math.min(partDist(p.radius) * (p.view?.dist ?? 1), defaultDist() * 0.72)
      } else {
        // blend the wide intro framing → the explore framing (user-orbited pitch)
        desiredElev = lerp(INTRO_ELEV, orbitElev, solidify)
        desiredDist = lerp(defaultDist() * INTRO_DIST_MULT, defaultDist(), solidify)
        // in intro, push the unit to the RIGHT so the headline owns the left.
        // On a phone the copy stacks above instead, and the canvas now runs the
        // full height, so the unit is dropped into the lower third rather than
        // shifted sideways — raising the look-at target moves it down on screen.
        const phone = window.innerWidth < 768
        /**
         * Desktop: centre the unit in whatever the copy column leaves, rather
         * than at a fixed offset. INTRO_TARGET_X was tuned when the station
         * stood alone; adding four bikes to each side widened the group and it
         * started running under the sub-heading. Deriving the shift from the
         * measured copy box means the clearance holds whatever else is parked
         * next to the unit, and at any width.
         *
         * Moving the AIM left pushes the unit right, hence the negation.
         */
        // half the world height visible at the target plane, so both the drop
        // and the sideways shift are fractions of the frame at any screen size
        const vHalf = Math.tan((camera.fov * Math.PI) / 360) * desiredDist
        const clearCentre = Math.min(0.82, (copyRightFrac + 1) / 2)
        const introShift = phone ? 0 : -(clearCentre - 0.5) * 2 * vHalf * camera.aspect
        // centre the unit in whatever the copy leaves, pulled back a little so it
        // does not sink into the bottom white fade
        const introY = phone ? vHalf * copyFrac * PHONE_INTRO_DROP : INTRO_TARGET_Y
        // and in explore the phone's parts panel occupies the bottom third, so
        // the unit lifts clear of it instead of centring under it
        const exploreY = phone ? vHalf * PHONE_EXPLORE_RISE : 0
        desiredTarget.set(lerp(introShift, 0, solidify), lerp(introY, exploreY, solidify), 0)
      }
      curTarget.lerp(desiredTarget, 0.1)
      if (arrivalT < 1) {
        // Drive elevation and distance straight off the arrival curve rather
        // than letting the usual 0.1 chase them: a chase lags behind a move this
        // large, and the whole point is that the descent stays continuous with
        // the flight that handed over to it.
        const k = 1 - Math.pow(1 - arrivalT, 3) // ease out, braking into place
        curElev = ARRIVAL.elev + (desiredElev - ARRIVAL.elev) * k
        curDist = arrivalDist + (desiredDist - arrivalDist) * k
      } else {
        curElev += (desiredElev - curElev) * 0.1
        curDist += (desiredDist - curDist) * 0.1
      }

      // The visitor orbits the CAMERA around a unit that stays planted on its
      // site — rotating the unit instead would slide it against a fixed sky and
      // planting, which is what made the scene read as a turntable prop.
      // Rotating the object by θ and the camera by −θ give the same relative
      // view, so the drag feel is unchanged.
      const dir = viewDir(AZ - (spinCurrent - INTRO_ANGLE), curElev)
      camPos.copy(dir).multiplyScalar(curDist).add(curTarget)
      right.crossVectors(dir, UP).normalize()
      up.crossVectors(right, dir).normalize()
      const par = pressedId ? 0.12 : 0.5
      camPos.addScaledVector(right, mx * par)
      camPos.addScaledVector(up, my * par)
      camera.position.copy(camPos)
      camera.lookAt(curTarget)
    }

    const positionLabel = (w: number, h: number) => {
      const active = pressedId ?? hoveredId
      const label = labelRef.current
      const leader = leaderRef.current
      const reticle = reticleRef.current
      if (reticle) {
        reticle.style.opacity = pointerInside && !pressedId ? '1' : '0'
        reticle.style.transform = `translate(-50%,-50%) translate(${reticleX}px,${reticleY}px)`
      }
      // the spec label belongs to section 2 only, never in the intro
      if (!enteredRef.current || !active || !parts.get(active)) {
        if (label) label.style.opacity = '0'
        if (leader) leader.style.opacity = '0'
        // re-measure next time it appears: the heading animates in with the
        // entered state, and the label's own height changes once expanded
        labelH = 0
        return
      }
      const p = parts.get(active)!
      // when a sub-part is focused (a held leg), point the leader at it
      const anchorSrc = active === pressedId && pressAnchor ? pressAnchor : p.anchor
      worldAnchor.copy(anchorSrc).applyMatrix4(rig.matrixWorld)
      const ndc = worldAnchor.clone().project(camera)
      const ax = (ndc.x * 0.5 + 0.5) * w
      const ay = (-ndc.y * 0.5 + 0.5) * h
      // stand the callout well clear of the part (up + to the side), so it never
      // sits on the model, the dashed leader keeps it visually tied to the anchor
      const labelW = 260
      const gap = 150
      const rawX = ax >= w * 0.5 ? ax - gap - labelW : ax + gap
      let lx = Math.min(Math.max(rawX, 20), w - labelW - 20)
      let ly = Math.max(ay - 210, 20)

      // Keep off the section heading. Parts high in frame pushed the label into
      // the top-left, where the clamp parked it directly over "Every part,
      // spelled out." The heading publishes its own box, so rather than guessing
      // at a reserved strip this measures the real thing — and keeps working if
      // the copy or the type scale changes.
      if (label) {
        if (labelH === 0 || keepOut === null) measureLabelSurrounds(label)
        // clamp against the callout's real height, not a nominal 60px: it grows
        // to ~244px once a part is selected and its spec table opens, and the
        // old bound let the bottom of it hang off the canvas
        ly = Math.min(ly, Math.max(20, h - labelH - 20))
        if (keepOut && lx < keepOut.x + keepOut.w && lx + labelW > keepOut.x &&
            ly < keepOut.y + keepOut.h && ly + labelH > keepOut.y) {
          const below = keepOut.y + keepOut.h + 18
          if (below + labelH <= h - 20) {
            ly = below // drop under the heading, the usual escape
          } else {
            // no room beneath: slide clear to its right instead
            lx = Math.min(keepOut.x + keepOut.w + 18, w - labelW - 20)
          }
        }
      }
      if (label) {
        label.style.opacity = '1'
        label.style.transform = `translate(${lx}px, ${ly}px)`
      }
      if (leader) {
        leader.style.opacity = '0.6'
        leader.setAttribute('x1', String(ax))
        leader.setAttribute('y1', String(ay))
        leader.setAttribute('x2', String(lx))
        leader.setAttribute('y2', String(ly))
      }
    }

    // ── loop ───────────────────────────────────────────────────────

    const render = () => {



      // wireframe → solid crossfade
      solidify += ((enteredRef.current ? 1 : 0) - solidify) * 0.045

      // dim the ground grid as we step inside, so the product owns the frame
      gridMat.opacity = 0.45 * lerp(1, 0.35, solidify)
      // the blueprint surroundings recede further as the visitor steps inside
      const envFade = lerp(1, 0.12, solidify)
      for (let i = 0; i < envMats.length; i++) envMats[i].opacity = envBase[i] * envFade

      if (pointerMoved) {
        doRaycast()
        pointerMoved = false
      }

      // the unit never spins on its own, it holds the grid-aligned angle and
      // only turns when a part is inspected or the user drags it
      if (pressedId && solidify > 0.6) spinTarget = pressSpin
      // not entered: settle back onto the grid-aligned intro angle (nearest turn)
      else if (!enteredRef.current) spinTarget = coterminal(introAngle, spinCurrent)
      spinCurrent += (spinTarget - spinCurrent) * 0.09
      // photoreal: the unit is bolted to its site and `spinCurrent` drives the
      // camera's azimuth instead (see updateCamera). Blueprint keeps the
      // original turntable, where there is no ground truth to contradict it.
      rig.rotation.y = INTRO_ANGLE
      rig.updateMatrixWorld()

      mx += (targetMx - mx) * 0.06
      my += (targetMy - my) * 0.06
      if (!pointerInside) {
        targetMx *= 0.9
        targetMy *= 0.9
      }

      // seconds since the last drawn frame, clamped so a backgrounded tab
      // doesn't teleport the traffic when it resumes
      const now = performance.now()
      const dt = Math.min((now - lastFrame) / 1000, 0.1)
      lastFrame = now

      /**
       * Adaptive resolution. There is no way to know from the outside what GPU
       * this is running on, and the honest signal is the frame time itself: if
       * the scene cannot hold 60fps at full ratio, it is better to lose a little
       * sharpness than to hand someone a hero that stutters. Sustained slow
       * frames step the ratio down; it never steps back up, because oscillating
       * between two resolutions reads far worse than sitting at the lower one.
       */
      if (quality > MIN_QUALITY) {
        if (dt > 0.028) slowFrames++
        else slowFrames = Math.max(0, slowFrames - 1)
        if (slowFrames > 45) {
          slowFrames = 0
          quality = Math.max(MIN_QUALITY, quality - 0.25)
          applyQuality()
        }
      }

      // shadow cadence — see renderer.shadowMap.autoUpdate above
      if (frameNo++ % SHADOW_EVERY === 0) renderer.shadowMap.needsUpdate = true

      photoreal?.update(dt)
      if (arrivalT < 1) arrivalT = Math.min(1, arrivalT + dt / ARRIVAL.seconds)

      applyMaterials()
      updateCamera()
      // canvasW/H rather than a fresh getBoundingClientRect: reading a rect
      // forces the browser to flush layout, and doing that between the raycast
      // and the draw, every frame, stalls the main thread on a page this heavy.
      // The canvas only changes size on resize, which is where it is measured.
      positionLabel(canvasW, canvasH)
      if (post) {
        // hold focus on whatever the camera is looking at, so the unit stays
        // crisp while the campus falls soft behind it
        post.setFocus(camera.position.distanceTo(curTarget))
        post.render()
      } else {
        renderer.render(scene, camera)
      }
    }

    /**
     * While the intro flight is running, this scene sits behind a fully opaque
     * overlay — so drawing it is pure waste, and expensive waste: it is the
     * heavier of the two scenes and it was competing for frames with the very
     * animation covering it. Held until the arrival begins, which is the moment
     * it first becomes visible.
     */
    let renderPaused = arriveFromAbove
    const loop = () => {
      if (!renderPaused) render()
      raf = requestAnimationFrame(loop)
    }
    let running = false
    const startLoop = () => {
      if (running) return
      running = true
      curDist = defaultDist() * 1.32
      const beginArrival = () => {
        renderPaused = false
        arrivalDist = defaultDist() * ARRIVAL.distMult
        curDist = arrivalDist
        curElev = ARRIVAL.elev
        arrivalT = 0
      }
      // hold overhead from the first frame if the intro is running, so there is
      // never a moment of settled hero visible behind the white
      if (arriveFromAbove) beginArrival()
      if (arriveRef) arriveRef.current = beginArrival

      raf = requestAnimationFrame(loop)
    }

    /**
     * The heading's box and the callout's own height, both in the label's
     * coordinate space (the section's top-left, which is also the canvas
     * origin). Cached rather than read every frame: `getBoundingClientRect`
     * forces layout, and this runs inside the render loop.
     */
    let keepOut: { x: number; y: number; w: number; h: number } | null = null
    let labelH = 0
    const measureLabelSurrounds = (label: HTMLElement) => {
      labelH = label.offsetHeight || 120
      const section = mount.closest('section')
      const el = section?.querySelector<HTMLElement>('[data-hero-keepout]')
      if (!section || !el) {
        keepOut = null
        return
      }
      const s = section.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      // canvas and section now share an origin at every width, but keep the
      // conversion explicit so this doesn't silently break if that changes
      keepOut = { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height }
    }

    /**
     * How far down the frame the intro copy reaches, 0–1. The phone drop is
     * derived from this rather than hard-coded: the copy block's height depends
     * on how many lines the paragraph wraps to, which changes with width, so a
     * fixed fraction put the canopy under the ENTER button on a 320px screen.
     * Measured on resize, not per frame — this forces layout.
     */
    let copyFrac = 0.54
    // how far across the frame the copy column reaches, 0-1
    let copyRightFrac = 0.42
    const measureIntroCopy = () => {
      const section = mount.closest('section')
      const el = section?.querySelector<HTMLElement>('[data-hero-copy]')
      if (!section || !el) return
      const s = section.getBoundingClientRect()
      if (!s.height) return
      const r = el.getBoundingClientRect()
      copyFrac = Math.min(0.72, Math.max(0.38, (r.bottom - s.top) / s.height))
      copyRightFrac = Math.min(0.6, Math.max(0.25, (r.right - s.left) / s.width))
    }

    const resize = () => {
      const rect = measureCanvas()
      if (rect.width === 0 || rect.height === 0) return
      keepOut = null // geometry moved; re-measure on the next label update
      labelH = 0
      measureIntroCopy()
      renderer.setSize(rect.width, rect.height, false)
      camera.aspect = rect.width / rect.height
      camera.updateProjectionMatrix()
      if (!post && POST_ENABLED) {
        post = setupPost({
          renderer,
          scene,
          camera,
          width: rect.width,
          height: rect.height,
          ao: REALISTIC,
        })
      }
      post?.setSize(rect.width, rect.height)
    }
    resize()

    const io = new IntersectionObserver(
      ([e]) => {
        if (!running) return
        if (e.isIntersecting) {
          if (!raf) raf = requestAnimationFrame(loop)
        } else {
          cancelAnimationFrame(raf)
          raf = 0
        }
      },
      { threshold: 0 },
    )
    io.observe(mount)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    // the canvas keeps its size while the page scrolls but not its position, and
    // the pointer maths needs the origin. One rect read per scroll event, off the
    // render path, in place of one per frame on it.
    const onScroll = () => measureCanvas()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      disposed = true
      if (selectRef) selectRef.current = null
      if (arriveRef) arriveRef.current = null
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll)
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerleave', onPointerLeave)
      mount.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      post?.dispose()
      photoreal?.dispose()
      timers.forEach((t) => window.clearInterval(t))
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [
    enteredRef,
    labelRef,
    leaderRef,
    reticleRef,
    onHoverChange,
    onPressChange,
    onEnterRequest,
    onProgress,
    onReady,
    selectRef,
    showGrid,
    heroStyle,
    PHOTOREAL,
  ])

  // on a phone the scene drops to a band under the copy so the two never overlap;
  // from md up it goes back to filling the section behind the text
  // Full-bleed at every width. The phone used to get a 46%-tall band pinned to
  // the bottom, which cut the sky off and left the top half flat paper. Going
  // full height costs nothing in apparent size: the unit's on-screen width is
  // (h/2)·(R/d)/tan(vFov/2), and because the horizontal fit is what sets `d` in
  // both cases, doubling h roughly doubles d and the two cancel.
  return <div ref={mountRef} className="absolute inset-0" />
}
