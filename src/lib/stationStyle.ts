import { BufferGeometry, Float32BufferAttribute, MeshStandardMaterial, Vector3 } from 'three'

/**
 * The single source of truth for how the T Station renders in 3D, so the hero
 * and every product showcase share one look, matched to the real unit in the
 * product photography: matte black cabinet, brushed aluminium wings and
 * structure, cool grey PV glass, and the painted two-tone emblem
 * (white chevron, solid brand blue diamond) carved out of the leg STLs.
 */

/** blueprint edge ink, dark enough to carry line work on the white page */
export const INK = 0x16223c
export const TEAL_HEX = 0x3bb1e3
/** the emblem's diamond, the saturated brand blue seen on the real cabinet */
export const LOGO_BLUE = 0x2f8fe8
/** glass (PV) emissive base: a near-neutral lift, so the panels stay grey */
export const GLASS_EMISSIVE = 0x1b2029

/** how a part group's surface behaves under light */
export type Finish = 'matte' | 'metal' | 'glass'

/** hero-standard face material for a part group */
export function makeFaceMaterial(finish: Finish, color: number) {
  if (finish === 'glass')
    return new MeshStandardMaterial({
      color,
      metalness: 0.35,
      // rougher than real PV glass on purpose: at 0.34 the panel mirrors the sun
      // into a single blown-out hotspot outdoors. Spreading the highlight keeps
      // the array reading as glass without flaring.
      roughness: 0.55,
      emissive: GLASS_EMISSIVE,
      emissiveIntensity: 0.1,
    })
  if (finish === 'metal')
    return new MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.34 })
  return new MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.72 })
}

/** the emblem's two materials, shared visual language everywhere it appears */
export function makeEmblemMaterials() {
  const offset = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }
  const diamond = new MeshStandardMaterial({
    color: LOGO_BLUE,
    emissive: LOGO_BLUE,
    emissiveIntensity: 0.25,
    metalness: 0.1,
    roughness: 0.4,
    ...offset,
  })
  const chevron = new MeshStandardMaterial({
    color: 0xf4f7fb,
    emissive: 0xffffff,
    emissiveIntensity: 0.12,
    metalness: 0.1,
    roughness: 0.5,
    ...offset,
  })
  return { diamond, chevron }
}

export type Emblem = { diamond: BufferGeometry | null; chevron: BufferGeometry | null }

const _ea = new Vector3()
const _eb = new Vector3()
const _ec = new Vector3()

/**
 * Lift the embossed chevron-and-diamond logo out of a leg geometry.
 *
 * The mark stands proud of the cabinet wall, so its triangles are the ones
 * floating beyond the wall plane at one bounding-box extreme. Those triangles
 * are then split into connected solids; the cluster owning the mark's lowest
 * point is the diamond, everything else is the chevron.
 */
export function extractEmblem(geo: BufferGeometry): Emblem | null {
  const pos = geo.getAttribute('position')
  const count = pos.count
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const size = new Vector3()
  bb.getSize(size)
  const read = (i: number, axis: 0 | 2) => (axis === 0 ? pos.getX(i) : pos.getZ(i))
  const triArea = (t: number) => {
    _ea.fromBufferAttribute(pos as never, t)
    _eb.fromBufferAttribute(pos as never, t + 1)
    _ec.fromBufferAttribute(pos as never, t + 2)
    _eb.sub(_ea)
    _ec.sub(_ea)
    return _eb.cross(_ec).length() / 2
  }
  let best: { score: number; picks: number[] } | null = null
  for (const axis of [0, 2] as const) {
    const extent = axis === 0 ? size.x : size.z
    if (extent < 1e-6) continue
    for (const dir of [1, -1] as const) {
      const extreme =
        dir === 1 ? (axis === 0 ? bb.max.x : bb.max.z) : (axis === 0 ? bb.min.x : bb.min.z)
      const dist = (i: number) => (dir === 1 ? extreme - read(i, axis) : read(i, axis) - extreme)
      const eps = extent * 0.004 + 1e-5
      let wall = extent
      let capArea = 0
      for (let t = 0; t < count; t += 3) {
        const d0 = dist(t)
        const d1 = dist(t + 1)
        const d2 = dist(t + 2)
        if (d0 <= eps && d1 <= eps && d2 <= eps) capArea += triArea(t)
        else {
          const dm = Math.min(d0, d1, d2)
          if (dm > eps && dm < wall) wall = dm
        }
      }
      if (capArea === 0) continue
      const cross = axis === 0 ? size.y * size.z : size.x * size.y
      if (capArea > cross * 0.25) continue // a full wall, not a logo
      if (wall > extent * 0.35) continue
      const picks: number[] = []
      for (let t = 0; t < count; t += 3) {
        const c = (dist(t) + dist(t + 1) + dist(t + 2)) / 3
        if (c <= wall * 0.75) picks.push(t)
      }
      const score = capArea / cross
      if (picks.length && (!best || score < best.score)) best = { score, picks }
    }
  }
  if (!best) return null

  const buildFrom = (tris: number[]) => {
    const out = new Float32Array(tris.length * 9)
    let o = 0
    for (const t of tris) {
      for (let v = 0; v < 3; v++) {
        out[o++] = pos.getX(t + v)
        out[o++] = pos.getY(t + v)
        out[o++] = pos.getZ(t + v)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(out, 3))
    g.computeVertexNormals()
    return g
  }

  // split into connected solids via shared vertex positions (union-find)
  const keyOf = (i: number) =>
    `${Math.round(pos.getX(i) * 5000)},${Math.round(pos.getY(i) * 5000)},${Math.round(pos.getZ(i) * 5000)}`
  const parent = best.picks.map((_, i) => i)
  const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])))
  const vertOwner = new Map<string, number>()
  best.picks.forEach((t, ti) => {
    for (let v = 0; v < 3; v++) {
      const k = keyOf(t + v)
      const o = vertOwner.get(k)
      if (o === undefined) vertOwner.set(k, ti)
      else {
        const ra = find(o)
        const rb = find(ti)
        if (ra !== rb) parent[rb] = ra
      }
    }
  })
  const clusters = new Map<number, number[]>()
  best.picks.forEach((t, ti) => {
    const r = find(ti)
    if (!clusters.has(r)) clusters.set(r, [])
    clusters.get(r)!.push(t)
  })
  let diamondRoot = -1
  let lowest = Infinity
  clusters.forEach((tris, root) => {
    for (const t of tris)
      for (let v = 0; v < 3; v++) {
        const y = pos.getY(t + v)
        if (y < lowest) {
          lowest = y
          diamondRoot = root
        }
      }
  })
  const diamondTris: number[] = []
  const chevronTris: number[] = []
  clusters.forEach((tris, root) => {
    if (root === diamondRoot) diamondTris.push(...tris)
    else chevronTris.push(...tris)
  })
  return {
    diamond: diamondTris.length ? buildFrom(diamondTris) : null,
    chevron: chevronTris.length ? buildFrom(chevronTris) : null,
  }
}
