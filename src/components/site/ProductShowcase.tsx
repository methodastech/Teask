import { useEffect, useRef } from 'react'
import {
  AdditiveBlending,
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PART_GROUPS, MODELS_BASE } from '../../lib/station3Parts'
import { extractEmblem, makeEmblemMaterials, makeFaceMaterial, INK, TEAL_HEX } from '../../lib/stationStyle'

/**
 * A static, non-interactive blueprint of the T Station for the Technology band.
 * Angled sun rays wash over the canopy; a bright energy pulse glides from the
 * panels down into the base, which glows as it lands. Slow idle drift, no hover.
 */

export default function ProductShowcase() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return
    }

    const scene = new Scene()
    // same blueprint setting as the hero: a white depth-haze so the grid and any
    // distant lines dissolve into the page instead of running to a hard edge
    scene.fog = new Fog(0xffffff, 22, 68)
    const camera = new PerspectiveCamera(38, 1, 0.1, 100) // matches the hero fov
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    // nothing here is draggable, so let every touch fall through to the page
    Object.assign(renderer.domElement.style, {
      width: '100%',
      height: '100%',
      display: 'block',
      touchAction: 'pan-y',
    })

    scene.add(new AmbientLight(0xffffff, 0.85))
    const key = new DirectionalLight(0xffffff, 1.6)
    key.position.set(-5, 9, 6)
    scene.add(key)
    const fill = new DirectionalLight(0xbfd1ff, 0.85)
    fill.position.set(6, 3, -5)
    scene.add(fill)
    const rim = new PointLight(0x3bb1e3, 24, 24)
    rim.position.set(-4, 3, 5)
    scene.add(rim)

    const rig = new Group()
    scene.add(rig)
    const pivot = new Group()
    rig.add(pivot)
    const model = new Group()
    pivot.add(model)

    const disposables: Array<{ dispose: () => void }> = []
    let boundR = 4
    let raf = 0
    let disposed = false
    let visible = true
    let framed = false // becomes true once the model has loaded and been fitted
    let topY = 3
    let botY = -3
    let panelY = 2
    const sunMats: LineBasicMaterial[] = []
    let sunCoreMat: MeshBasicMaterial | null = null
    let sunHaloMat: MeshBasicMaterial | null = null

    // the unit holds a fixed hero angle; hover parallaxes the WHOLE scene (unit +
    // grid + sun) by nudging the camera, exactly like the hero's intro parallax
    const BASE_ROT_Y = -Math.PI / 2
    let hoverMx = 0
    let hoverMy = 0
    let curMx = 0
    let curMy = 0
    const camBase = new Vector3()
    const camRight = new Vector3()
    const camUp = new Vector3()
    const WORLD_UP = new Vector3(0, 1, 0)

    // ground grid — the same local blueprint pool the hero uses: per-cell
    // segments whose vertex colours lerp from grid blue to the page as they
    // leave the unit, so the grid dissolves into the background.
    const GRID_BLUE = new Color(0x3f7fc4)
    const PAGE = new Color(0xf3f5f8)
    const buildGridGeo = () => {
      const half = 18
      const cell = 1.2
      const r0 = 4.5
      const r1 = 15
      const pos: number[] = []
      const col: number[] = []
      const c = new Color()
      const push = (x: number, z: number) => {
        pos.push(x, 0, z)
        const tt = Math.min(Math.max((Math.hypot(x, z) - r0) / (r1 - r0), 0), 1)
        c.copy(GRID_BLUE).lerp(PAGE, tt)
        col.push(c.r, c.g, c.b)
      }
      for (let i = -half; i <= half + 1e-6; i += cell) {
        for (let j = -half; j < half - 1e-6; j += cell) {
          push(i, j)
          push(i, j + cell)
          push(j, i)
          push(j + cell, i)
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
    disposables.push(gridGeo, gridMat)
    scene.add(grid)

    // energy — a soft yellow circle that descends the panels → base
    const orbGeo = new SphereGeometry(0.16, 16, 16)
    const orbMat = new MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    const orb = new Mesh(orbGeo, orbMat)
    disposables.push(orbGeo, orbMat)
    scene.add(orb)

    // a yellow lightning bolt riding that pulse, billboarded to face the camera
    const boltShape = new Shape()
    boltShape.moveTo(0.13, 0.46)
    boltShape.lineTo(-0.17, 0.03)
    boltShape.lineTo(-0.02, 0.03)
    boltShape.lineTo(-0.12, -0.46)
    boltShape.lineTo(0.19, 0.05)
    boltShape.lineTo(0.04, 0.05)
    boltShape.closePath()
    const boltGeo = new ShapeGeometry(boltShape)
    const boltMat = new MeshBasicMaterial({ color: 0xffd21e, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false })
    const bolt = new Mesh(boltGeo, boltMat)
    disposables.push(boltGeo, boltMat)
    scene.add(bolt)

    // base glow that swells to warm gold as the energy lands
    const glowGeo = new SphereGeometry(0.9, 16, 16)
    const glowMat = new MeshBasicMaterial({ color: 0xffcb2e, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
    const baseGlow = new Mesh(glowGeo, glowMat)
    disposables.push(glowGeo, glowMat)
    scene.add(baseGlow)

    const frontXZ = new Vector3()

    const loader = new STLLoader()
    Promise.all(
      PART_GROUPS.map(async (g) => {
        const geos = await Promise.all(
          g.files.map(
            (f) =>
              new Promise<BufferGeometry>((res, rej) =>
                loader.load(
                  `${MODELS_BASE}/${f}.stl`,
                  (geo) => {
                    geo.deleteAttribute('uv')
                    geo.computeVertexNormals()
                    res(geo)
                  },
                  undefined,
                  rej,
                ),
              ),
          ),
        )
        if (disposed) return null
        // the legs carry the embossed logo, lift it before the merge (same
        // shared extraction the hero uses, so the mark renders identically)
        const emblems = g.id === 'legs' ? geos.map(extractEmblem).filter(Boolean) : []
        const merged = mergeGeometries(geos, false) ?? geos[0]
        geos.forEach((x) => x.dispose())
        return { g, merged, emblems }
      }),
    )
      .then((results) => {
        if (disposed) return
        results.forEach((r) => {
          if (!r) return
          const { g, merged, emblems } = r
          disposables.push(merged)
          // one shared material recipe with the hero, uniform product look
          const faceMat = makeFaceMaterial(
            g.finish ?? (g.glass ? 'glass' : 'matte'),
            g.realColor ?? g.color,
          )
          faceMat.side = DoubleSide
          disposables.push(faceMat)
          const faceMesh = new Mesh(merged, faceMat)
          faceMesh.frustumCulled = false
          model.add(faceMesh)
          const edgeGeo = new EdgesGeometry(merged, g.glass ? 42 : 24)
          disposables.push(edgeGeo)
          const edgeMat = new LineBasicMaterial({
            color: g.glass ? TEAL_HEX : INK,
            transparent: true,
            opacity: g.glass ? 0.5 : 0.9,
          })
          disposables.push(edgeMat)
          const edges = new LineSegments(edgeGeo, edgeMat)
          edges.frustumCulled = false
          faceMesh.add(edges)

          if (emblems.length) {
            const { diamond: diamondMat, chevron: chevronMat } = makeEmblemMaterials()
            disposables.push(diamondMat, chevronMat)
            emblems.forEach((e) => {
              if (!e) return
              for (const [geo, mat] of [
                [e.diamond, diamondMat],
                [e.chevron, chevronMat],
              ] as const) {
                if (!geo) continue
                disposables.push(geo)
                const m = new Mesh(geo, mat)
                m.frustumCulled = false
                model.add(m)
              }
            })
          }
        })
        finalize()
      })
      .catch((err) => console.error('[ProductShowcase] load failed', err))

    const buildSunRays = () => {
      // a golden SUN in the upper right with rays fanning down over the canopy, so
      // "sunlight → solar" reads at a glance. Normal blending (not additive): on the
      // white page additive washes to invisible, so we paint solid gold instead.
      // Added to the scene (not the rig) so the sun holds still while the unit drifts.
      // sit the sun fully inside the frame so the whole disc shows (was placed
      // so high its top half was cropped by the canvas edge)
      const sun = new Vector3(boundR * 0.78, topY + boundR * 0.3, -boundR * 0.1)

      const halo = new Mesh(
        new SphereGeometry(boundR * 0.3, 28, 28),
        new MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.26, depthWrite: false }),
      )
      halo.position.copy(sun)
      const core = new Mesh(
        new SphereGeometry(boundR * 0.17, 28, 28),
        new MeshBasicMaterial({ color: 0xf6a623, transparent: true, opacity: 0.95, depthWrite: false }),
      )
      core.position.copy(sun)
      disposables.push(
        halo.geometry,
        halo.material as MeshBasicMaterial,
        core.geometry,
        core.material as MeshBasicMaterial,
      )
      scene.add(halo, core)
      sunHaloMat = halo.material as MeshBasicMaterial
      sunCoreMat = core.material as MeshBasicMaterial

      // rays radiate FROM the sun toward a spread of points across the canopy top
      const rays = 11
      const spanX = boundR * 2.3
      for (let i = 0; i < rays; i++) {
        const tx = -spanX / 2 + (spanX / (rays - 1)) * i
        const positions = new Float32Array([sun.x, sun.y, sun.z, tx, topY - 0.05, boundR * 0.14])
        const geo = new BufferGeometry()
        geo.setAttribute('position', new BufferAttribute(positions, 3))
        disposables.push(geo)
        const mat = new LineBasicMaterial({ color: 0xe89512, transparent: true, opacity: 0.22, depthWrite: false })
        mat.userData.phase = i / rays
        sunMats.push(mat)
        disposables.push(mat)
        scene.add(new LineSegments(geo, mat))
      }
    }

    const finalize = () => {
      model.updateMatrixWorld(true)
      const box = new Box3().setFromObject(model)
      const center = box.getCenter(new Vector3())
      const size = box.getSize(new Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      model.position.sub(center)
      const fit = 6 / maxDim
      pivot.scale.setScalar(fit)
      boundR = (maxDim * fit) / 2 + 0.4

      topY = (size.y * fit) / 2
      botY = -(size.y * fit) / 2
      panelY = topY * 0.92

      // drop the blueprint grid to the base of the unit, like the hero floor
      grid.position.y = botY - 0.02

      rig.rotation.y = BASE_ROT_Y // hero resting angle (-π/2), grid-aligned

      baseGlow.scale.setScalar(1)
      baseGlow.position.set(0, botY + 0.3, 0)

      framed = true
      buildSunRays()
      resize() // sets aspect AND frames the camera against it
      startLoop()
    }

    // frame the model against BOTH fov dimensions so a wide station never
    // overflows a narrow split-column canvas (was: vertical fov only)
    const frameCamera = () => {
      const vFov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      // exact hero framing: azimuth -0.6, elevation 0.28, pulled back so the unit
      // sits on visible ground (hero INTRO_DIST_MULT feel)
      const dist = Math.max(boundR / Math.sin(vFov / 2), boundR / Math.sin(hFov / 2)) * 1.22
      const AZ = -0.6
      const ELEV = 0.28
      const dir = new Vector3(
        Math.sin(AZ) * Math.cos(ELEV),
        Math.sin(ELEV),
        Math.cos(AZ) * Math.cos(ELEV),
      )
      camBase.copy(dir).multiplyScalar(dist)
      camRight.crossVectors(dir, WORLD_UP).normalize()
      camUp.crossVectors(camRight, dir).normalize()
      camera.position.copy(camBase)
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)
      frontXZ.set(camBase.x, 0, camBase.z).normalize()
    }

    const resize = () => {
      const w = mount.clientWidth || 1
      const h = mount.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (framed) frameCamera()
    }

    const t0 = performance.now()
    const PERIOD = 3.2
    const render = (now: number) => {
      const t = (now - t0) / 1000

      // static model angle; hover eases a camera parallax so the whole scene —
      // unit, grid and sun — shifts together, like the hero's intro
      curMx += (hoverMx - curMx) * 0.08
      curMy += (hoverMy - curMy) * 0.08
      const PAR = boundR * 0.5
      camera.position
        .copy(camBase)
        .addScaledVector(camRight, curMx * PAR)
        .addScaledVector(camUp, curMy * PAR)
      camera.lookAt(0, 0, 0)

      // sunlight shimmering along each ray
      for (let i = 0; i < sunMats.length; i++) {
        const m = sunMats[i]
        const s = Math.sin(t * 1.4 - (m.userData.phase as number) * Math.PI * 2)
        m.opacity = 0.18 + Math.max(0, s) * 0.4
      }
      // the sun disc breathes softly
      if (sunCoreMat) sunCoreMat.opacity = 0.9 + 0.1 * Math.sin(t * 2.2)
      if (sunHaloMat) sunHaloMat.opacity = 0.22 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.3))

      // energy pulse glides panel → base. Its opacity is sin(p·π), so it is 0 at
      // both p=0 and p=1, the position reset at the loop boundary is invisible.
      const p = (t / PERIOD) % 1
      const vis = Math.sin(p * Math.PI)
      const y = panelY - p * (panelY - (botY + 0.3))
      const ex = frontXZ.x * boundR * 0.12
      const ez = frontXZ.z * boundR * 0.12
      orb.position.set(ex, y, ez)
      orbMat.opacity = vis * 0.9
      orb.scale.setScalar(1 + 0.5 * vis)
      // the yellow lightning bolt rides the same descent, facing the camera
      bolt.position.set(ex, y, ez)
      bolt.quaternion.copy(camera.quaternion)
      bolt.scale.setScalar(0.9 + 0.4 * vis)
      boltMat.opacity = vis

      // energy-storage glow: a gentle, always-on breathing pulse plus a smooth
      // swell as the pulse descends. Both terms return to baseline at the loop
      // boundary (arrival = vis·p is 0 at p=0 and p=1), so it never snaps off,
      // fully seamless.
      const breathe = 0.14 + 0.06 * Math.sin(t * 1.6)
      const arrival = 0.3 * vis * p
      glowMat.opacity = breathe + arrival

      renderer.render(scene, camera)
      raf = visible ? requestAnimationFrame(render) : 0
    }
    const startLoop = () => {
      if (!raf && visible) raf = requestAnimationFrame(render)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) startLoop()
      },
      { threshold: 0.01 },
    )
    io.observe(mount)
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // hover parallax — nudge the unit toward the cursor, settle back on leave
    const onPointerMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      hoverMx = (e.clientX - r.left) / r.width - 0.5
      hoverMy = -((e.clientY - r.top) / r.height - 0.5)
    }
    const onPointerLeave = () => {
      hoverMx = 0
      hoverMy = 0
    }
    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerleave', onPointerLeave)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerleave', onPointerLeave)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  // a defined height, not h-full: h-full let the canvas inflate the grid row far
  // beyond the feature column, and items-center then opened a gap around it
  return <div ref={mountRef} className="h-[340px] w-full sm:h-[400px] lg:h-[460px]" aria-hidden="true" />
}
