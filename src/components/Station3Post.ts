import {
  HalfFloatType,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { OutputShader } from 'three/examples/jsm/shaders/OutputShader.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'

/**
 * The render pipeline that separates "a 3D model on a page" from "a product
 * render".
 *
 * Low-poly geometry doesn't look cheap because of its polygon count — it looks
 * cheap because it's usually rendered flat, with everything equally sharp and
 * equally bright. Three cues fix that, and none of them touch the geometry:
 *
 *  · **Depth of field.** The single biggest win. Holding focus on the unit and
 *    letting the campus fall soft behind it is what every product photograph
 *    does, and the eye reads it as a lens rather than a viewport.
 *  · **Bloom**, thresholded high so only genuine highlights (sun on the PV
 *    glass, the illuminated mark) bleed. Sells the sun without lifting fog.
 *  · **A grade** — gentle S-curve, a touch of desaturation, and a vignette to
 *    keep the eye centred and the frame edges from competing with the copy.
 *
 * The composer runs on a multisampled half-float target, so we keep MSAA (which
 * a naive composer setup silently throws away) and have headroom for bloom.
 */

/**
 * Filmic grade + vignette, in display space after tone mapping.
 *
 * This used to be its own ShaderPass sitting behind OutputPass, which meant two
 * full-screen passes back to back — one reading the whole frame to tone-map it,
 * the next reading the whole frame again to grade it. At the end of a chain
 * every pass is a full read and write of the framebuffer, so the cheapest one is
 * the one that doesn't exist. The grade is now appended to OutputPass's own
 * fragment shader: same maths, same position in the chain (after tone mapping
 * and the sRGB transfer), one fewer round trip through memory.
 */
const GRADE_GLSL = /* glsl */ `

  // ── grade ──
  {
    vec3 c = gl_FragColor.rgb;

    // S-curve around mid grey: deepens the shadow side of the cabinet without
    // crushing it, and firms up the sky
    c = (c - 0.5) * contrast + 0.5;

    // a hair of lift keeps the darkest asphalt from going to pure black
    c += lift;

    // pull a little saturation out; the environment reads expensive when the
    // greens are muted and the product carries the only strong colour
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, saturation);

    // vignette
    vec2 p = vUv - 0.5;
    float r = length(p * vec2(1.0, 0.92)) * vignette;
    c *= mix(1.0, 0.74, smoothstep(0.32, 0.86, r));

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), gl_FragColor.a);
  }
`

/**
 * OutputPass with the grade folded in. Everything OutputPass does — reading the
 * renderer's tone mapping and colour space and rebuilding its defines to match —
 * is inherited untouched; only the shader source and four uniforms are added.
 */
class GradedOutputPass extends OutputPass {
  constructor() {
    super()
    Object.assign(this.uniforms, {
      contrast: { value: 1.06 },
      saturation: { value: 0.94 },
      vignette: { value: 1.12 },
      lift: { value: 0.006 },
    })
    // the last `}` in the source closes main(); the grade goes just inside it
    this.material.fragmentShader = OutputShader.fragmentShader.replace(
      /\}\s*$/,
      `${GRADE_GLSL}\n}`,
    )
    // RawShaderMaterial: no automatic prelude, so the uniforms are declared here
    this.material.fragmentShader = this.material.fragmentShader.replace(
      'uniform sampler2D tDiffuse;',
      'uniform sampler2D tDiffuse;\nuniform float contrast;\nuniform float saturation;\nuniform float vignette;\nuniform float lift;',
    )
    this.material.needsUpdate = true
  }
}

export interface PostChain {
  render: () => void
  setSize: (w: number, h: number) => void
  /** keep the unit sharp as the camera dollies */
  setFocus: (distance: number) => void
  dispose: () => void
}

export function setupPost({
  renderer,
  scene,
  camera,
  width,
  height,
  ao = false,
}: {
  renderer: WebGLRenderer
  scene: Scene
  camera: PerspectiveCamera
  width: number
  height: number
  /**
   * Ambient occlusion — the darkening in the crevices and where objects meet the
   * ground. Direct light and a sky map both arrive from far away, so neither can
   * express contact: without AO a station sitting on tarmac and a station
   * hovering a centimetre above it render identically, which is what makes an
   * otherwise correct scene look pasted together. Realistic only; the maquette
   * wants its clean flat surfaces.
   */
  ao?: boolean
}): PostChain | null {
  try {
    const dpr = renderer.getPixelRatio()
    /**
     * Multisampled + half-float: keeps MSAA and gives bloom real headroom.
     *
     * Two samples rather than four. 4× costs the main pass four coverage samples
     * per pixel and a heavier resolve, and on a scene whose background is
     * deliberately thrown out of focus the second doubling buys almost nothing —
     * the only edges sharp enough to show it are on the unit itself, and those
     * read clean at 2×.
     */
    const target = new WebGLRenderTarget(Math.max(1, width * dpr), Math.max(1, height * dpr), {
      type: HalfFloatType,
      samples: 2,
    })
    const composer = new EffectComposer(renderer, target)
    composer.setSize(width, height)

    composer.addPass(new RenderPass(scene, camera))

    let gtao: GTAOPass | null = null
    if (ao) {
      gtao = new GTAOPass(scene, camera, width, height)
      // The world is metric, so these are metres: sample within 40 cm of a
      // surface and fade the effect out by 1.2 m. Larger radii start shading
      // whole panels instead of the joints between them.
      gtao.updateGtaoMaterial({ radius: 0.4, distanceExponent: 1, thickness: 1.2, scale: 1.1 })
      gtao.output = GTAOPass.OUTPUT.Default
      composer.addPass(gtao)
    }

    const bokeh = new BokehPass(scene, camera, {
      focus: 12,
      aperture: 0.0006, // shallow, but nowhere near a macro lens
      maxblur: 0.006,
    })
    /**
     * Depth of field is the expensive one: it draws the entire scene a second
     * time, into a depth buffer, every frame. The geometry cost of that is
     * unavoidable, but the fill cost is not — the buffer only feeds a blur
     * radius, which is about as low-frequency a signal as there is. Half
     * linear resolution is a quarter of the pixels for a difference nobody can
     * point at. `aspect` is a ratio, so scaling both axes leaves it correct.
     */
    const DEPTH_SCALE = 0.5
    const bokehSetSize = bokeh.setSize.bind(bokeh)
    bokeh.setSize = (w: number, h: number) =>
      bokehSetSize(Math.max(1, Math.round(w * DEPTH_SCALE)), Math.max(1, Math.round(h * DEPTH_SCALE)))
    composer.addPass(bokeh)

    /**
     * Bloom, removed.
     *
     * It ran at strength 0.085 with the threshold at 0.96 — only pixels already
     * within 4% of clipping contributed anything, and then only at 8% strength.
     * For that it cost ten render passes: five progressive downsamples, five
     * upsamples and a composite, every frame. Measured against the grade's own
     * highlight rolloff the difference was not findable by eye, so it is ten
     * passes bought nothing.
     *
     * Kept as a comment rather than deleted because the judgement was "invisible
     * at these settings", not "wrong idea" — if the scene ever gains a genuinely
     * emissive element (a lit sign, headlamps at dusk) this is where it goes
     * back, and it should come back at a strength you can actually see.
     *
     *   const bloom = new UnrealBloomPass(new Vector2(width, height), 0.085, 0.6, 0.96)
     *   composer.addPass(bloom)   // and forward setSize to it
     */

    composer.addPass(new GradedOutputPass())

    return {
      render: () => composer.render(),
      setSize: (w, h) => {
        // the canvas ratio can change under us — the hero drops its resolution
        // when it can't hold the frame — and the composer caches it, so it has
        // to be re-read here or every buffer below stays at the old size
        composer.setPixelRatio(renderer.getPixelRatio())
        // composer.setSize already forwards the device-scaled size to every
        // pass, including bloom and GTAO; calling those again with CSS pixels
        // (as this used to) just resized them wrong a second time
        composer.setSize(w, h)
      },
      setFocus: (d) => {
        const u = (bokeh as unknown as { uniforms?: Record<string, { value: number }> }).uniforms
        if (u && u.focus) u.focus.value = d
      },
      dispose: () => {
        composer.dispose()
        target.dispose()
      },
    }
  } catch {
    // any failure here just means we render straight to the canvas
    return null
  }
}
