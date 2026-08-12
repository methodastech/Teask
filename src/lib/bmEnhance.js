/* bm-enhance-1.js — BM post-build enhancement layer (10 Aug 2026)
   WebGL micro-scenes + DOM garnish on top of the compiled bundle, reusing the
   site's own three.module chunk (import keys mapped from the minified exports):
   1. Record stat cards: four animated 3D vignettes (deploy / lifespan / charge / relocate)
   2. Technology section: interactive exploded 4-layer stack synced to the stepper
   3. FAQ: floating 3D question mark
   4. Comparison header icons (Grid extension / Fixed charger)
   5. Systems-diagram label boxes forward hover/click to their markers */
/* Imported from 'three' by name.
   This file began life as a post-build layer and pulled the same symbols out of
   the compiled chunk by their minified aliases (`b3 as WebGLRenderer`, and so
   on) from "./three.module-<hash>.js". Both the hash and those aliases are
   regenerated on every build, so that form could not survive being moved into
   source. Named imports resolve to the identical module instance the hero uses,
   which is what the scene capture below depends on. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh,
  BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshBasicMaterial, DirectionalLight, AmbientLight,
  PointLight, Color, BufferGeometry, Points, PointsMaterial,
  LineSegments, LineBasicMaterial, Float32BufferAttribute, EdgesGeometry,
  AdditiveBlending, CanvasTexture, SRGBColorSpace
} from 'three'

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- hero-scene capture ----------
   The hero (Station3Model chunk) and this layer import the SAME three.module
   chunk, so hooking render lets us observe the hero's finished scene graph and
   clone the real station/bike models instead of approximating them. Scenes
   built here are tagged (s.userData.bm) and skipped. */
const HERO = { scenes: [] };
{
  /* Scene.prototype.add shadows Object3D.add for scenes only: fires during the
     hero's setup, so capture works even while rAF is suspended (hidden pane). */
  const _add = Scene.prototype.add;
  Scene.prototype.add = function () {
    if (!this.userData.bm && HERO.scenes.indexOf(this) < 0) HERO.scenes.push(this);
    return _add.apply(this, arguments);
  };
  const walk = (o, d, max) => d > max ? null : {
    n: o.name || "", t: o.type, c: o.children.length,
    i: o.isInstancedMesh ? o.count : undefined,
    k: o.children.slice(0, 30).map(ch => walk(ch, d + 1, max)).filter(Boolean)
  };
  /* console probe: window.__bmHeroDump(depth) ? JSON of every foreign scene */
  window.__bmHeroDump = max =>
    JSON.stringify(HERO.scenes.map(s => walk(s, 0, max || 3)));
  /* world-space bbox per root child, no Box3/Vector3 imports needed */
  const bbox = root => {
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], meshes = 0, inst = 0;
    root.updateMatrixWorld(true);
    root.traverse(o => {
      if (!(o.isMesh || o.isInstancedMesh)) return;
      meshes++; if (o.isInstancedMesh) inst++;
      const geo = o.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const b = geo.boundingBox, e = o.matrixWorld.elements;
      for (let ci = 0; ci < 8; ci++) {
        const x = ci & 1 ? b.max.x : b.min.x, y = ci & 2 ? b.max.y : b.min.y, z = ci & 4 ? b.max.z : b.min.z;
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        if (wx < mn[0]) mn[0] = wx; if (wx > mx[0]) mx[0] = wx;
        if (wy < mn[1]) mn[1] = wy; if (wy > mx[1]) mx[1] = wy;
        if (wz < mn[2]) mn[2] = wz; if (wz > mx[2]) mx[2] = wz;
      }
    });
    return { meshes, inst, min: mn.map(v => +v.toFixed(2)), size: mx.map((v, i2) => +(v - mn[i2]).toFixed(2)) };
  };
  window.__bmMeasure = si => {
    const s = HERO.scenes[si];
    if (!s) return "no scene";
    return JSON.stringify(s.children.map((ch, i3) => ({ i: i3, t: ch.type, ...bbox(ch) })));
  };
  HERO.bbox = bbox;
}
const BLUE = 0x0084d6, TEAL = 0x3bb1e3, NAVY = 0x0b1626, INK = 0x11151d, SILVER = 0xe3e9ef;
const apps = [];

function std(color, roughness, metalness, opts) {
  const m = new MeshStandardMaterial(Object.assign({ color, roughness, metalness }, opts || {}));
  return m;
}
function edge(mesh, color, opacity) {
  const l = new LineSegments(new EdgesGeometry(mesh.geometry), new LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(l); return l;
}
/* arc tube in the XZ→XY plane for rings and the question-mark hook (no TorusGeometry in the bundle) */
function arcTube(R, r, a0, a1, seg, rad) {
  const pos = [], norm = [], idx = [], g = new BufferGeometry();
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (a1 - a0) * (i / seg), ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j <= rad; j++) {
      const b = j / rad * Math.PI * 2, cb = Math.cos(b), sb = Math.sin(b);
      pos.push((R + r * cb) * ca, (R + r * cb) * sa, r * sb);
      norm.push(cb * ca, cb * sa, sb);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b2 = a + rad + 1;
    idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
  }
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(norm, 3));
  g.setIndex(idx);
  return g;
}
function makeApp(host, w, h, fov, z, opts) {
  const r = new WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.setSize(w, h, false);
  r.outputColorSpace = SRGBColorSpace;
  r.toneMapping = 4; r.toneMappingExposure = 1.05; /* ACESFilmic */
  Object.assign(r.domElement.style, { width: "100%", height: "100%", display: "block" });
  host.appendChild(r.domElement);
  const s = new Scene(); s.userData.bm = 1; const c = new PerspectiveCamera(fov || 32, w / h, 0.1, 100);
  c.position.set(0, 0, z || 7);
  s.add(new AmbientLight(0xffffff, 1.05));
  const key = new DirectionalLight(0xffffff, 2.3); key.position.set(2.4, 4, 3); s.add(key);
  const fill = new DirectionalLight(0xdfeaff, 0.7); fill.position.set(-2, 1, 2.5); s.add(fill);
  const rim = new PointLight(TEAL, 12, 30); rim.position.set(-3.5, 1.5, -2.5); s.add(rim);
  /* hero-grade grounding: a real shadow map on the key light. Opt-in per scene
     because nine canvases each paying for a depth pass would be waste. */
  if (opts && opts.shadows) {
    r.shadowMap.enabled = true; r.shadowMap.type = 1;
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.left = -4.2; sc.right = 4.2; sc.top = 4.2; sc.bottom = -4.2; sc.near = 0.5; sc.far = 20;
    sc.updateProjectionMatrix();
    key.shadow.bias = -0.0012; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  }
  const app = { r, s, c, host, visible: true, update: null, hover: 0, hoverT: 0, px: 0, py: 0 };
  new IntersectionObserver(es => es.forEach(e => app.visible = e.isIntersecting), { rootMargin: "120px" }).observe(host);
  apps.push(app);
  return app;
}
function parallax(app, el) {
  (el || app.host).addEventListener("pointermove", e => {
    const r2 = app.host.getBoundingClientRect();
    app.px = (e.clientX - r2.left) / r2.width * 2 - 1;
    app.py = (e.clientY - r2.top) / r2.height * 2 - 1;
  });
}

/* ---------- record card vignettes ----------
   The hero object is a faithful mini T Station: dark cabinet columns, a wide
   dual-pitch (butterfly) bifacial canopy on a spine, and a pale levelling base. */
/* PV cell sheet, matched to the hero model: blue-grey cells on a fine grid */
function pvTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#9fb6cb"; ctx.fillRect(0, 0, 512, 512);
  for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 8; cx++) {
    ctx.fillStyle = (cx + cy) % 2 ? "#8fa9c1" : "#a6bcd0";
    ctx.fillRect(cx * 64 + 2, cy * 64 + 2, 60, 60);
  }
  ctx.strokeStyle = "rgba(240,246,251,.85)"; ctx.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(512, i * 64); ctx.stroke();
  }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
}
let PV_TEX = null;
/* cabinet skin: panel seams and a soft vertical falloff, so the pillars read as
   clad hardware rather than extruded colour — most of the hero's material feel */
let CAB_TEX = null;
function cabTexture() {
  if (CAB_TEX) return CAB_TEX;
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 256;
  const x = cv.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#20415c"); gr.addColorStop(0.55, "#16344b"); gr.addColorStop(1, "#102a3e");
  x.fillStyle = gr; x.fillRect(0, 0, 128, 256);
  x.fillStyle = "rgba(9,20,30,.85)";
  for (const sy of [64, 128, 192]) x.fillRect(0, sy, 128, 3);
  x.fillStyle = "rgba(120,170,205,.16)";
  for (const sy of [67, 131, 195]) x.fillRect(0, sy, 128, 1);
  CAB_TEX = new CanvasTexture(cv); CAB_TEX.colorSpace = SRGBColorSpace;
  return CAB_TEX;
}
/* ---------- hero CAD kit ----------
   The hero's station is assembled from the real engineering STLs in /models —
   every part already sits at its absolute position in the file, so full
   fidelity here is just: load the same files, merge each group, and apply the
   hero bundle's own material recipe (finish + realColor per group). */
const HERO_PARTS = [
  { id: "panels", color: 0xffffff, finish: "glass", files: Array.from({ length: 10 }, (v, i) => "solar-design-" + (i + 1)) },
  { id: "wings", color: 0xC8CCD3, finish: "metal", files: ["wings-1", "wings-2"] },
  { id: "cables", color: 0xB9BEC7, finish: "metal", files: ["cable-1-1", "cable-1-2", "cable-2-1", "cable-2-2", "cable-2-3", "cable-2-4"] },
  { id: "hinges", color: 0x8A9099, finish: "metal", files: ["hinge-female-1", "hinge-female-3", "hinge-female-4", "hinge-female-5", "hinge-male-2-1", "hinge-male-2-3", "hinge-male-2-6", "hinge-male-2-7", "hinge-pin-1", "hinge-pin-3", "hinge-pin-4", "hinge-pin-5"] },
  { id: "legs", color: 0x33373F, finish: "matte", files: ["leg-support-1", "leg-support-2"] },
  { id: "supports", color: 0x33373F, finish: "metal", files: ["medium-support-2", "medium-support-3", "centre-support-3", "support-1"] },
  { id: "base", color: 0x26292F, finish: "matte", files: ["flat-base-1"] }
];
/* the hero's Pi() material recipe, verbatim */
function heroMat(finish, color) {
  return finish === "glass"
    ? std(color, 0.55, 0.35, { emissive: 0x0a141c, emissiveIntensity: 0.1 })
    : finish === "metal" ? std(color, 0.34, 0.82) : std(color, 0.72, 0.12);
}
/* binary STL → BufferGeometry; the CAD exports are all binary */
function parseSTL(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 84) return null;
  const n = dv.getUint32(80, true);
  if (84 + n * 50 !== buf.byteLength) return null;   /* ascii or truncated */
  const pos = new Float32Array(n * 9), nor = new Float32Array(n * 9);
  let o = 84;
  for (let i = 0; i < n; i++) {
    const nx = dv.getFloat32(o, true), ny = dv.getFloat32(o + 4, true), nz = dv.getFloat32(o + 8, true);
    for (let v = 0; v < 3; v++) {
      const b = o + 12 + v * 12, j = i * 9 + v * 3;
      pos[j] = dv.getFloat32(b, true); pos[j + 1] = dv.getFloat32(b + 4, true); pos[j + 2] = dv.getFloat32(b + 8, true);
      nor[j] = nx; nor[j + 1] = ny; nor[j + 2] = nz;
    }
    o += 50;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  return g;
}
function mergeGeos(geos) {
  let len = 0; geos.forEach(g2 => len += g2.attributes.position.count);
  const pos = new Float32Array(len * 3), nor = new Float32Array(len * 3);
  let o = 0;
  geos.forEach(g2 => {
    pos.set(g2.attributes.position.array, o); nor.set(g2.attributes.normal.array, o);
    o += g2.attributes.position.count * 3;
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  return g;
}
const geoBounds = g => {
  const a = g.attributes.position.array;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) {
    const v = a[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v;
  }
  return { mn, mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
};
/* one PV module tile, repeated across the array by UV */
let MOD_TEX = null;
function moduleTexture() {
  if (MOD_TEX) return MOD_TEX;
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const x = cv.getContext("2d");
  x.fillStyle = "#f0f5fa"; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "#9fb4c8"; x.fillRect(2, 2, 60, 60);
  x.fillStyle = "#adc0d2"; x.fillRect(4, 4, 56, 56);
  x.strokeStyle = "rgba(240,246,251,.7)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(32, 4); x.lineTo(32, 60); x.stroke();
  MOD_TEX = new CanvasTexture(cv);
  MOD_TEX.colorSpace = SRGBColorSpace; MOD_TEX.wrapS = MOD_TEX.wrapT = 1000; /* RepeatWrapping */
  return MOD_TEX;
}
const HERO_KIT = { station: null, bike: null, state: 0, t0: 0, err: null };
function loadHeroKit() {
  if (HERO_KIT.state) return; HERO_KIT.state = 1; HERO_KIT.t0 = Date.now();
  const get = f => fetch("/models/" + f + ".stl", { cache: "force-cache" }).then(r => {
    if (!r.ok) throw new Error(f); return r.arrayBuffer();
  });
  /* the station: seven merged group meshes in one normalized wrapper */
  Promise.all(HERO_PARTS.map(async part => {
    const geos = (await Promise.all(part.files.map(get))).map(parseSTL).filter(Boolean);
    if (!geos.length) throw new Error(part.id);
    return { part, geo: mergeGeos(geos) };
  })).then(async groups => {
    const inner = new Group();
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    groups.forEach(({ geo }) => {
      const b = geoBounds(geo);
      for (let k = 0; k < 3; k++) { if (b.mn[k] < mn[k]) mn[k] = b.mn[k]; if (b.mx[k] > mx[k]) mx[k] = b.mx[k]; }
    });
    groups.forEach(({ part, geo }) => {
      const mat = heroMat(part.finish, part.color);
      if (part.id === "panels") {
        /* planar UV over the array, one texture tile per module pitch */
        const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
        const b = geoBounds(geo), pitch = Math.max(b.size[0], b.size[1], b.size[2]) / 10;
        /* the station export is Y-up: the array lies in the X/Z plane */
        for (let i = 0; i < p.count; i++) {
          uv[i * 2] = (p.getX(i) - b.mn[0]) / pitch;
          uv[i * 2 + 1] = (p.getZ(i) - b.mn[2]) / pitch;
        }
        geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
        mat.map = moduleTexture(); mat.needsUpdate = true;
      }
      const mesh = new Mesh(geo, mat);
      mesh.userData.groupId = part.id;
      inner.add(mesh);
    });
    /* The brand mark on both outer end faces of the legs. Drawn on a canvas —
       an elongated blue diamond with the thick white chevron over its top, as
       on the real unit — and mounted as one transparent plane per side. */
    /* The brand mark, cropped from the brand asset: the wordmark's "A" IS the
       unit emblem. Bounds anchored by pixel-scanning the blue diamond
       (x 1269-1458 in the 2835×789 file), the neighbouring "E" fragments
       erased along the A's slope, dark strokes recoloured white. On any
       failure no plates are added. */
    const legsG = groups.find(x => x.part.id === "legs");
    if (legsG) await new Promise(done => {
      const img = new Image();
      img.onload = () => {
        try {
          const SX = 1071, SY = 37, SW = 586, SH = 709;
          const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
          const x2 = cv.getContext("2d");
          x2.drawImage(img, SX, SY, SW, SH, 0, 0, SW, SH);
          /* wedge out the E remnants left of the A's slope */
          x2.globalCompositeOperation = "destination-out";
          x2.beginPath(); x2.moveTo(-6, -6); x2.lineTo(310, -6); x2.lineTo(-6, 482);
          x2.closePath(); x2.fill();
          x2.globalCompositeOperation = "source-over";
          const id = x2.getImageData(0, 0, SW, SH), d = id.data;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 8) continue;
            if (!(d[i + 2] > 120 && d[i + 2] > d[i] + 40)) { d[i] = 244; d[i + 1] = 247; d[i + 2] = 250; }
          }
          x2.putImageData(id, 0, 0);
          const logoTex = new CanvasTexture(cv); logoTex.colorSpace = SRGBColorSpace;
          const lb = geoBounds(legsG.geo);
          const H = lb.mx[1] - lb.mn[1];
          const cz = (lb.mn[2] + lb.mx[2]) / 2, cy = lb.mn[1] + H * 0.52;
          const pw = H * 0.44, ph = pw * (SH / SW);   /* the mark is big on the real unit */
          for (const dir of [-1, 1]) {
            const plate = new Mesh(new PlaneGeometry(pw, ph), new MeshBasicMaterial({
              map: logoTex, transparent: true,
              polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
            }));
            plate.position.set(dir > 0 ? lb.mx[0] + H * 0.012 : lb.mn[0] - H * 0.012, cy, cz);
            plate.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            inner.add(plate);
          }
        } catch (e) { }
        done();
      };
      img.onerror = done;
      img.src = "/brand/teask-logo-hd.png";
    });

    /* Normalize. Measured: 5606 × 2745 × 4286 — length:height 2.04, matching
       the real elevation, with the deep axis being the two-bay footprint. The
       station export is Y-UP as-is (unlike bike.stl): no rotation, just centre,
       scale into the card envelope, feet on the tStation ground plane. */
    const wrap = new Group();
    const scale = 2.6 / ((mx[1] - mn[1]) || 1);
    inner.position.set(
      -(mn[0] + mx[0]) / 2 * scale,
      -mn[1] * scale - 1.35,                                      /* feet at y = -1.35 */
      -(mn[2] + mx[2]) / 2 * scale
    );
    inner.scale.setScalar(scale);
    wrap.add(inner);
    HERO_KIT.station = wrap;
    HERO_KIT.rawSize = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    HERO_KIT.box = HERO.bbox(wrap);           /* normalized, world units */
  }).catch(e => { HERO_KIT.err = String(e); });
  /* The bike: bike.glb is the hero's primary asset, with the real materials —
     the STL two-tone fallback only ever approximated it. Minimal GLB reader:
     JSON+BIN chunks, TRS nodes, positions/normals/uvs/indices, baseColor. */
  const loadGLB = async () => {
    const buf = await fetch("/models/bike.glb", { cache: "force-cache" }).then(r => {
      if (!r.ok) throw new Error("glb"); return r.arrayBuffer();
    });
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("magic");
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
      const body = buf.slice(off + 8, off + 8 + len);
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(body));
      else if (type === 0x004E4942) bin = body;
      off += 8 + len + (len % 4 ? 4 - len % 4 : 0);
    }
    if (!json || !bin) throw new Error("chunks");
    const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
    const acc = i => {
      const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
      const A = CT[a.componentType], n = NC[a.type];
      return new A(bin, (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * n);
    };
    /* KHR_draco_mesh_compression: the bundle ships the self-contained asm.js
       decoder, so the hero's exact compressed mesh decodes here too */
    let dracoP = null;
    const draco = () => dracoP || (dracoP = fetch("/assets/draco_decoder-fzg4nYZr.js")
      .then(r => r.text())
      .then(src => new Promise(res => {
        const factory = new Function(src + ";return DracoDecoderModule;")();
        const m = factory({ onModuleLoaded: res });
        if (m && m.then) m.then(res);
      })));
    const decodePrim = async ext => {
      const d = await draco();
      const bv = json.bufferViews[ext.bufferView];
      const buf8 = new Int8Array(bin, bv.byteOffset || 0, bv.byteLength);
      const db = new d.DecoderBuffer(); db.Init(buf8, buf8.length);
      const dec = new d.Decoder();
      const mesh = new d.Mesh();
      dec.DecodeBufferToMesh(db, mesh);
      const nPts = mesh.num_points(), nFaces = mesh.num_faces();
      const geo = new BufferGeometry();
      const attr = (uid, comps, name) => {
        if (uid === undefined) return;
        const at = dec.GetAttributeByUniqueId(mesh, uid);
        const fa = new d.DracoFloat32Array();
        dec.GetAttributeFloatForAllPoints(mesh, at, fa);
        const arr = new Float32Array(nPts * comps);
        for (let i = 0; i < arr.length; i++) arr[i] = fa.GetValue(i);
        d.destroy(fa);
        geo.setAttribute(name, new Float32BufferAttribute(arr, comps));
      };
      attr(ext.attributes.POSITION, 3, "position");
      attr(ext.attributes.NORMAL, 3, "normal");
      attr(ext.attributes.TEXCOORD_0, 2, "uv");
      const idx = new Array(nFaces * 3);
      const ia = new d.DracoInt32Array();
      for (let i = 0; i < nFaces; i++) {
        dec.GetFaceFromMesh(mesh, i, ia);
        idx[i * 3] = ia.GetValue(0); idx[i * 3 + 1] = ia.GetValue(1); idx[i * 3 + 2] = ia.GetValue(2);
      }
      d.destroy(ia); d.destroy(mesh); d.destroy(db); d.destroy(dec);
      geo.setIndex(idx);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      return geo;
    };
    const texCache = {};
    const getTex = async ti => {
      if (texCache[ti]) return texCache[ti];
      const src = json.textures[ti].source, im = json.images[src];
      const bv = json.bufferViews[im.bufferView];
      const blob = new Blob([new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength)], { type: im.mimeType });
      const bmp = await createImageBitmap(blob);
      /* The texture paints the mirror backs / meter cluster pure red; the hero
         remaps that in a shader to a pale neutral. Same remap here, in pixels. */
      const cv2 = document.createElement("canvas"); cv2.width = bmp.width; cv2.height = bmp.height;
      const c2 = cv2.getContext("2d"); c2.drawImage(bmp, 0, 0);
      const id2 = c2.getImageData(0, 0, cv2.width, cv2.height), px = id2.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i] > 100 && px[i + 1] < 70 && px[i + 2] < 70) {
          px[i] = 214; px[i + 1] = 220; px[i + 2] = 228;   /* light, a touch cool */
        }
      }
      c2.putImageData(id2, 0, 0);
      const t = new CanvasTexture(cv2);
      t.colorSpace = SRGBColorSpace; t.flipY = false; t.wrapS = t.wrapT = 1000;
      return texCache[ti] = t;
    };
    const matCache = {};
    const getMat = async mi => {
      if (mi === undefined) return std(0xcccccc, 0.6, 0.1);
      if (matCache[mi]) return matCache[mi];
      const m = json.materials[mi], pbr = m.pbrMetallicRoughness || {};
      const c = pbr.baseColorFactor || [1, 1, 1, 1];
      const mat = std(0xffffff, pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 0.7,
        pbr.metallicFactor !== undefined ? pbr.metallicFactor : 0);
      mat.color.setRGB(c[0], c[1], c[2]);
      if (pbr.baseColorTexture) { mat.map = await getTex(pbr.baseColorTexture.index); mat.needsUpdate = true; }
      return matCache[mi] = mat;
    };
    const buildNode = async ni => {
      const nd = json.nodes[ni], g2 = new Group();
      if (nd.translation) g2.position.fromArray(nd.translation);
      if (nd.rotation) g2.quaternion.set(nd.rotation[0], nd.rotation[1], nd.rotation[2], nd.rotation[3]);
      if (nd.scale) g2.scale.fromArray(nd.scale);
      if (nd.mesh !== undefined) for (const pr of json.meshes[nd.mesh].primitives) {
        let geo;
        if (pr.extensions && pr.extensions.KHR_draco_mesh_compression) {
          geo = await decodePrim(pr.extensions.KHR_draco_mesh_compression);
        } else {
          geo = new BufferGeometry();
          geo.setAttribute("position", new Float32BufferAttribute(acc(pr.attributes.POSITION), 3));
          if (pr.attributes.NORMAL) geo.setAttribute("normal", new Float32BufferAttribute(acc(pr.attributes.NORMAL), 3));
          else geo.computeVertexNormals();
          if (pr.attributes.TEXCOORD_0) geo.setAttribute("uv", new Float32BufferAttribute(acc(pr.attributes.TEXCOORD_0), 2));
          if (pr.indices !== undefined) geo.setIndex([...acc(pr.indices)]);
        }
        g2.add(new Mesh(geo, await getMat(pr.material)));
      }
      for (const ci of nd.children || []) g2.add(await buildNode(ci));
      return g2;
    };
    const root = new Group();
    const sceneDef = json.scenes[json.scene || 0];
    for (const ni of sceneDef.nodes) root.add(await buildNode(ni));
    return root;
  };
  loadGLB().then(root => {
    /* normalize: glTF is Y-up by spec — centre, wheels on y=0, height 1.15 */
    const probe = new Group(); probe.userData.bm = 1;
    probe.add(root); root.updateMatrixWorld(true);
    const b = HERO.bbox(root);
    const scale = 1.15 / (b.size[1] || 1);
    const wrap = new Group();
    root.scale.setScalar(scale);
    root.position.set(
      -(b.min[0] + b.size[0] / 2) * scale,
      -b.min[1] * scale,
      -(b.min[2] + b.size[2] / 2) * scale
    );
    wrap.add(root);
    HERO_KIT.bike = wrap; HERO_KIT.bikeSrc = "glb";
  }).catch(() => loadBikeSTL());
  /* the STL two-tone build stays as the fallback */
  function loadBikeSTL() { get("bike").then(buf => {
    const geo = parseSTL(buf);
    if (!geo) return;
    const p = geo.attributes.position;
    const b = geoBounds(geo);
    const minZ = b.mn[2], spanZ = b.size[2] || 1, minX = b.mn[0], spanX = b.size[0] || 1;
    const cen = i => [(p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3];
    const zt = { lowerBlack: 0.3, upperBlack: 0.6, frontZone: 0.33, fenderClear: 1.02, fenderMaxHeight: 0.55 };
    const wheel = front => {
      let sx = 0, sz = 0, n2 = 0;
      for (let i = 0; i < p.count; i += 3) {
        const c = cen(i), fx = (c[0] - minX) / spanX;
        if ((front ? fx < zt.frontZone : fx > 1 - zt.frontZone) && (c[1] - minZ) / spanZ < 0.45) { sx += c[0]; sz += c[1]; n2++; }
      }
      const z = n2 ? sz / n2 : minZ;
      return { x: n2 ? sx / n2 : minX, z, r: Math.max(z - minZ, 1e-6) };
    };
    const wf = wheel(true), wb = wheel(false);
    const dark = [], body = [];
    for (let i = 0; i < p.count; i += 3) {
      const c = cen(i), zf = (c[1] - minZ) / spanZ, xf = (c[0] - minX) / spanX;
      const inWheel = Math.hypot(c[0] - wf.x, c[1] - wf.z) <= wf.r || Math.hypot(c[0] - wb.x, c[1] - wb.z) <= wb.r;
      const fender = xf < zt.frontZone && Math.hypot(c[0] - wf.x, c[1] - wf.z) > wf.r * zt.fenderClear && zf < zt.fenderMaxHeight;
      /* Zoned to the measured geometry (per-decile z tops) rather than one
         global band: seat (x .50-.80, top ~.65) and the stem/screen column
         (x .28-.50, reaching 1.0) go dark like the hero bikes; shield and
         tail stay body-yellow. */
      const seat = xf >= 0.50 && xf < 0.80 && zf > 0.45;
      const stem = xf >= 0.28 && xf < 0.50 && zf > 0.55;
      const isDark = inWheel ? true : fender ? false : (seat || stem || zf < zt.lowerBlack);
      (isDark ? dark : body).push(i, i + 1, i + 2);
    }
    geo.setIndex([...dark, ...body]); geo.clearGroups();
    geo.addGroup(0, dark.length, 0); geo.addGroup(dark.length, body.length, 1);
    const mesh = new Mesh(geo, [std(0x1A1B1F, 0.62, 0.05), std(0xF7C518, 0.26, 0.08)]);
    mesh.rotation.x = -Math.PI / 2;
    const wrap = new Group();
    const scale = 1.15 / (spanZ || 1);              /* card-scooter height envelope */
    mesh.scale.setScalar(scale);
    mesh.position.set(-(minX + b.mx[0]) / 2 * scale, -minZ * scale, (b.mn[1] + b.mx[1]) / 2 * scale);
    wrap.add(mesh);
    HERO_KIT.bike = wrap; HERO_KIT.bikeSrc = "stl";
  }).catch(() => { }); }
}
try { window.__bmKit = HERO_KIT; } catch (e) { }

/* mini T Station, proportioned from the hero model in the banner: navy cabinet
   columns, a wide near-flat bifacial canopy, pale levelling base, white chevron */
const STATION_NAVY = 0x16344b;
function tStation(parent, scale) {
  const s = scale || 1, g = new Group(); g.scale.setScalar(s); parent.add(g);
  /* the real CAD assembly, whenever it has arrived — cards then carry the
     hero's exact model; the procedural build below stays as the fallback */
  if (HERO_KIT.station) {
    try { window.__bmHeroUsed = (window.__bmHeroUsed || 0) + 1; } catch (e) { }
    const c = HERO_KIT.station.clone(true);
    c.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      o.castShadow = true; o.receiveShadow = true;
    });
    g.add(c);
    return { g, cab: [], canopy: null, wings: [], plates: [], spine: null, hero: true };
  }
  PV_TEX = PV_TEX || pvTexture();
  /* Proportioned from the hero Station3Model, which is the ground truth: a
     LONG unit. Three wall-slab pillars across the length; a flat PV deck on a
     dark fascia band with a raised ridge housing on top; and fold-out PV flaps
     past each SHORT end, carried on cable stays from masts on the deck. */
  const cab = [];
  for (const x of [-1.5, 0, 1.5]) {
    const c = new Mesh(new BoxGeometry(0.6, 2.14, 1.35), std(0xffffff, 0.42, 0.34, { map: cabTexture() }));
    c.position.set(x, -0.2, 0); g.add(c); edge(c, 0x2c5876, 0.45); cab.push(c);
    /* levelling feet under each pillar — the unit stands on these, there is no
       foundation slab and no civil works */
    const foot = new Mesh(new BoxGeometry(0.76, 0.08, 1.5), std(0x1b2735, 0.6, 0.25));
    foot.position.set(x, -1.31, 0); g.add(foot); edge(foot, 0x2c5876, 0.35);
    if (x === 0) {
      /* the LCD lives on the centre pillar only */
      const panel = new Mesh(new PlaneGeometry(0.34, 0.72), new MeshBasicMaterial({ color: 0xf5f8fb }));
      panel.position.set(x, 0.05, 0.68); g.add(panel);
      const chev = new Mesh(new PlaneGeometry(0.16, 0.34), new MeshBasicMaterial({ color: BLUE }));
      chev.position.set(x, 0.02, 0.69); g.add(chev);
    } else {
      /* the brand diamond on the outer end faces — white surround, blue fill,
         the mark that dominates the hero's end-on view */
      const f = Math.sign(x);
      const wD = new Mesh(new PlaneGeometry(0.46, 0.46), new MeshBasicMaterial({ color: 0xf5f8fb }));
      wD.position.set(x + f * 0.31, 0.1, 0); wD.rotation.set(0, f * Math.PI / 2, Math.PI / 4); g.add(wD);
      const bD = new Mesh(new PlaneGeometry(0.3, 0.3), new MeshBasicMaterial({ color: BLUE }));
      bD.position.set(x + f * 0.32, 0.1, 0); bD.rotation.set(0, f * Math.PI / 2, Math.PI / 4); g.add(bD);
    }
  }
  /* One charging rail PER BAY, stopping at the pillar faces — the old single
     bar ran straight through the centre column and carried no sockets at all.
     Each rail hangs two socket blocks, which is what the bikes plug into. */
  for (const bx of [-0.75, 0.75]) for (const side of [-1, 1]) {
    const rail = new Mesh(new BoxGeometry(0.9, 0.08, 0.07), std(0x0f2334, 0.5, 0.3));
    rail.position.set(bx, -0.34, side * 0.62); g.add(rail);
    for (const dx of [-0.23, 0.23]) {
      const sock = new Mesh(new BoxGeometry(0.15, 0.19, 0.1), std(0x1b2735, 0.45, 0.35));
      sock.position.set(bx + dx, -0.47, side * 0.64); g.add(sock); edge(sock, 0x2c5876, 0.5);
      const led = new Mesh(new PlaneGeometry(0.06, 0.045), new MeshBasicMaterial({ color: TEAL }));
      led.position.set(bx + dx, -0.42, side * 0.695); led.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(led);
    }
  }

  /* End-on, the canopy reads: dark ridge cap at the centre, a short flat run
     of PV, then long PV wings drooping over each SIDE to shelter the bike
     rows — cable stays fan from the cap out to the wing tips (hero end view) */
  const canopy = new Group(); canopy.position.y = 0.94; g.add(canopy);
  const wings = [], plates = [];
  const fascia = new Mesh(new BoxGeometry(4.9, 0.12, 1.7), std(0x0f2334, 0.45, 0.4));
  fascia.position.y = 0.06; canopy.add(fascia); edge(fascia, 0x2c5876, 0.35);
  const deck = new Mesh(new BoxGeometry(4.84, 0.05, 1.7), std(0xffffff, 0.3, 0.45, { map: PV_TEX }));
  deck.position.y = 0.145; canopy.add(deck); edge(deck, 0x2c5876, 0.4); wings.push(deck);
  const spine = new Mesh(new BoxGeometry(2.6, 0.18, 0.62), std(0x11202e, 0.5, 0.35));
  spine.position.y = 0.26; canopy.add(spine); edge(spine, 0x2c5876, 0.4);
  const DROOP = 0.28;
  for (const dir of [-1, 1]) {
    /* full-length wing hinged at the deck edge, falling away outward */
    const w = new Mesh(new BoxGeometry(4.84, 0.05, 1.15), std(0xffffff, 0.3, 0.45, { map: PV_TEX }));
    w.position.set(0, 0.145 - Math.sin(DROOP) * 0.575, dir * (0.85 + Math.cos(DROOP) * 0.575));
    w.rotation.x = dir * DROOP;
    canopy.add(w); edge(w, 0x2c5876, 0.4); wings.push(w);
  }
  /* masts on the ridge cap; stays fan out to the wing tips on both sides */
  const tipY = 0.145 - Math.sin(DROOP) * 1.15, tipZ = 0.85 + Math.cos(DROOP) * 1.15;
  const stay = [];
  for (const x of [-1.2, 1.2]) {
    const mast = new Mesh(new BoxGeometry(0.05, 0.22, 0.05), std(0x8f9ba8, 0.5, 0.6));
    mast.position.set(x, 0.46, 0); canopy.add(mast);
    for (const dir of [-1, 1]) stay.push(x, 0.56, 0, x, tipY, dir * tipZ);
  }
  const stayGeo = new BufferGeometry();
  stayGeo.setAttribute("position", new Float32BufferAttribute(new Float32Array(stay), 3));
  canopy.add(new LineSegments(stayGeo, new LineBasicMaterial({ color: 0x5a6b7d, transparent: true, opacity: 0.55 })));
  return { g, cab, canopy, wings, plates, spine };
}
function vDeploy(app) {
  const g = new Group(); app.s.add(g);
  g.rotation.x = CARD_TILT; g.position.y = 0.05;
  const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
  const smooth = p => p * p * (3 - 2 * p);   /* crane travel: eases off both ends */

  /* open carpark — nothing is dug, nothing is poured, the unit just lands on it */
  const ground = cardGround(0.62, -0.945);
  g.add(ground);

  /* the unit arrives complete: everything that flies in rides on `lift` */
  const lift = new Group(); g.add(lift);
  const st = tStation(lift, 0.7);

  /* rigging is its own group so the hook can leave once the load is down */
  const rig = new Group(); g.add(rig);
  /* the camera only sees to y≈2.1, so the hook rides low enough to still read
     when the load is down — that touchdown beat is the whole point */
  const hook = new Mesh(new BoxGeometry(0.34, 0.22, 0.34), std(0x9aa6b2, 0.5, 0.7));
  hook.position.y = 1.78; rig.add(hook); edge(hook, NAVY, 0.35);
  const sp = [];
  for (const x of [-1.05, 1.05]) for (const z of [-0.55, 0.55]) sp.push(0, 1.66, 0, x, 0.78, z);
  const slingGeo = new BufferGeometry();
  slingGeo.setAttribute("position", new Float32BufferAttribute(new Float32Array(sp), 3));
  const slingMat = new LineBasicMaterial({ color: 0x30425a, transparent: true, opacity: 0.75 });
  rig.add(new LineSegments(slingGeo, slingMat));
  const cableGeo = new BufferGeometry();
  cableGeo.setAttribute("position", new Float32BufferAttribute(new Float32Array([0, 1.9, 0, 0, 9, 0]), 3));
  rig.add(new LineSegments(cableGeo, new LineBasicMaterial({ color: 0x30425a, transparent: true, opacity: 0.55 })));

  /* a little dust kicks up where it touches down */
  const DN = 18, dpos = new Float32Array(DN * 3), dvec = [];
  for (let i = 0; i < DN; i++) {
    const a = (i / DN) * Math.PI * 2 + (i % 3) * 0.4, rr = 0.55 + (i % 5) * 0.14;
    dvec.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.42]);
  }
  const dgeo = new BufferGeometry();
  dgeo.setAttribute("position", new Float32BufferAttribute(dpos, 3));
  const dust = new Points(dgeo, new PointsMaterial({
    color: 0xc7d2dc, size: 0.15, transparent: true, opacity: 0, depthWrite: false
  }));
  g.add(dust);

  /* the loop resets while the unit is back up top, so cross-fade over the seam
     rather than letting the landed unit blink out */
  const mats = [];
  st.g.traverse(o => { if (o.material) { o.material.transparent = true; mats.push([o.material, o.material.opacity]); } });
  const setFade = v => { for (const m of mats) m[0].opacity = m[1] * v; };

  app.update = t => {
    const k = REDUCED ? 0.90 : ((t * 0.00011) % 1);

    /* lower the complete unit onto the pad */
    const p = seg(k, 0.06, 0.56);
    const dy = 2.95 * (1 - smooth(p));
    const set = seg(k, 0.56, 0.66);
    const dip = set > 0 && set < 1 ? Math.sin(set * Math.PI) * -0.03 : 0;
    /* it swings a little on the way down and is dead steady before it lands */
    const sway = Math.sin(k * 46) * 0.05 * (1 - smooth(p));
    lift.position.set(sway, dy + dip, 0);

    /* slings go slack, then the hook is pulled back up out of frame, leaving a
       beat on the deployed unit before the loop resets */
    rig.position.set(sway * (1 - seg(k, 0.60, 0.70)), dy + dip + smooth(seg(k, 0.66, 0.86)) * 4.4, 0);
    slingMat.opacity = 0.75 * (1 - seg(k, 0.60, 0.68));

    const pf = seg(k, 0.56, 0.78);
    if (pf > 0 && pf < 1) {
      const e = 1 - Math.pow(1 - pf, 2);
      for (let i = 0; i < DN; i++) {
        dpos[i * 3] = dvec[i][0] * e * 1.7;
        dpos[i * 3 + 1] = -0.94 + e * 0.30;
        dpos[i * 3 + 2] = dvec[i][1] * e * 1.7;
      }
      dgeo.attributes.position.needsUpdate = true;
      dust.material.opacity = 0.30 * (1 - pf);
    } else dust.material.opacity = 0;

    setFade(Math.min(seg(k, 0, 0.07), 1 - seg(k, 0.94, 1)));
    g.rotation.y = 0.62 + Math.sin(t * 0.00012) * 0.18 + app.hoverT * 0.6;
    faceHaze(ground, g.rotation.y);
  };
}

/* 25+ years: a real day passing over the same unit — night, sunrise, full day,
   dusk, night again. Told with light and sky colour, never with drawn lines. */
function vLifespan(app) {
  const g = new Group(); app.s.add(g);

  /* the unit stands on ground, calm and unchanged — the story of this card is
     carried by the year counter ticking away in the corner, not by weather */
  const ground = cardGround(0.5, -0.891);
  g.add(ground);
  const st = tStation(g, 0.66);
  g.rotation.x = CARD_TILT; g.position.y = 0.15;

  /* DOM counter, top-right of the card: crisper than any in-scene text */
  const tag = document.createElement("div");
  tag.className = "bm-years";
  tag.innerHTML = 'YEAR<b>01</b>';
  app.host.appendChild(tag);
  const num = tag.querySelector("b");
  let shown = "";

  app.update = t => {
    /* count 01 -> 25, then hold on 25+ for a beat before looping */
    const cyc = REDUCED ? 1 : ((t * 0.00008) % 1.25);
    const yr = Math.min(25, 1 + Math.floor(Math.min(1, cyc) * 25));
    const label = yr >= 25 ? "25+" : String(yr).padStart(2, "0");
    if (label !== shown) { shown = label; num.textContent = label; }
    g.rotation.y = 0.5 + app.hoverT * 0.6;
    faceHaze(ground, g.rotation.y);
  };
}
/* 3 min charge: the real pairing — a charge post, a cable, a scooter, and the
   post's own screen filling. No floating abstract gauges. */
function vCharge(app) {
  const g = new Group(); app.s.add(g);
  const YEL = 0xf2b418, INKD = 0x14181f;
  const ground = cardGround(-0.42, -0.93);
  g.add(ground);

  /* charge post: navy cabinet, screen, cap, and the socket the cable leaves from */
  const post = new Group(); post.position.set(-1.35, -0.93, 0); g.add(post);
  const col = new Mesh(new BoxGeometry(0.56, 1.75, 0.5), std(0x16344b, 0.44, 0.3));
  col.position.y = 0.88; post.add(col); edge(col, 0x2c5876, 0.45);
  const cap = new Mesh(new BoxGeometry(0.62, 0.09, 0.56), std(0x0f2334, 0.45, 0.35));
  cap.position.y = 1.79; post.add(cap);
  const screen = new Mesh(new PlaneGeometry(0.34, 0.46), new MeshBasicMaterial({ color: 0x0b1a26 }));
  screen.position.set(0, 1.32, 0.256); post.add(screen);
  const bar = new Mesh(new PlaneGeometry(0.24, 0.07), new MeshBasicMaterial({ color: BLUE }));
  bar.position.set(0, 1.22, 0.258); post.add(bar);
  const barBg = new Mesh(new PlaneGeometry(0.24, 0.07), new MeshBasicMaterial({ color: 0x1d3a4f }));
  barBg.position.set(0, 1.22, 0.257); post.add(barBg);
  const socket = new Mesh(new BoxGeometry(0.14, 0.14, 0.1), std(0x2b323b, 0.5, 0.35));
  socket.position.set(0.3, 0.72, 0.12); post.add(socket);

  /* cable: a hanging catenary from the post socket down to the scooter */
  const cable = new Mesh(arcTube(0.62, 0.032, Math.PI * 0.04, Math.PI * 0.96, 30, 8),
    std(0x1b2027, 0.75, 0.05));
  cable.rotation.z = Math.PI; cable.position.set(-0.42, -0.28, 0.12); g.add(cable);

  /* scooter, side profile facing right */
  const sc = new Group(); sc.position.set(0.75, -0.93, 0); sc.scale.setScalar(1.12); g.add(sc);
  for (const wx of [-0.62, 0.66]) {
    const tyre = new Mesh(new CylinderGeometry(0.28, 0.28, 0.12, 20), std(0x14171c, 0.85, 0.05));
    tyre.rotation.x = Math.PI / 2; tyre.position.set(wx, 0.28, 0); sc.add(tyre);
    const hub = new Mesh(new CylinderGeometry(0.11, 0.11, 0.14, 14), std(0xb9c2cb, 0.35, 0.7));
    hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.28, 0); sc.add(hub);
  }
  const fend = new Mesh(new BoxGeometry(0.34, 0.06, 0.2), std(INKD, 0.6, 0.2));
  fend.position.set(0.66, 0.58, 0); sc.add(fend);
  const deckS = new Mesh(new BoxGeometry(0.76, 0.1, 0.3), std(INKD, 0.6, 0.2));
  deckS.position.set(0.02, 0.27, 0); sc.add(deckS);
  const rear = new Mesh(new BoxGeometry(0.78, 0.34, 0.32), std(YEL, 0.42, 0.22));
  rear.position.set(-0.48, 0.53, 0); sc.add(rear); edge(rear, 0x7a5c12, 0.35);
  const tail = new Mesh(new BoxGeometry(0.14, 0.14, 0.28), new MeshBasicMaterial({ color: 0xd8342a }));
  tail.position.set(-0.9, 0.6, 0); sc.add(tail);
  const seat = new Mesh(new BoxGeometry(0.62, 0.13, 0.3), std(INKD, 0.7, 0.1));
  seat.position.set(-0.4, 0.76, 0); sc.add(seat);
  const shield = new Mesh(new BoxGeometry(0.22, 0.66, 0.32), std(YEL, 0.42, 0.22));
  shield.position.set(0.46, 0.6, 0); shield.rotation.z = 0.2; sc.add(shield);
  edge(shield, 0x7a5c12, 0.35);
  const stem = new Mesh(new BoxGeometry(0.08, 0.36, 0.08), std(0x2b323b, 0.5, 0.4));
  stem.position.set(0.55, 1.0, 0); stem.rotation.z = 0.2; sc.add(stem);
  const hbar = new Mesh(new BoxGeometry(0.06, 0.06, 0.56), std(0x2b323b, 0.5, 0.4));
  hbar.position.set(0.5, 1.16, 0); sc.add(hbar);
  const lamp = new Mesh(new BoxGeometry(0.13, 0.15, 0.26), new MeshBasicMaterial({ color: 0xfff4d6 }));
  lamp.position.set(0.6, 0.88, 0); sc.add(lamp);
  /* the plug sitting in the scooter's charge port */
  const plug = new Mesh(new BoxGeometry(0.12, 0.12, 0.14), std(0x2b323b, 0.5, 0.35));
  plug.position.set(-0.22, 0.5, 0.18); sc.add(plug);

  /* The hero's actual bike replaces the procedural scooter. The GLB decodes
     later than the station's STLs, so this also swaps in late if the card
     happened to build first. */
  const useBike = () => {
    if (!HERO_KIT.bike) return false;
    sc.clear();
    const b = HERO_KIT.bike.clone(true);
    b.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
      o.castShadow = true; o.receiveShadow = true;
    });
    sc.add(b);
    try { window.__bmBikeUsed = (window.__bmBikeUsed || 0) + 1; } catch (e) { }
    return true;
  };
  if (!useBike()) {
    const iv = setInterval(() => { if (useBike()) clearInterval(iv); }, 500);
    setTimeout(() => clearInterval(iv), 30000);
  }

  g.rotation.x = CARD_TILT; g.rotation.y = -0.42; g.position.y = 0.18;
  app.update = t => {
    const k = REDUCED ? 1 : ((t * 0.00042) % 1);
    bar.scale.x = Math.max(0.02, k);
    bar.position.x = -0.12 + (k * 0.24) / 2;
    const done = k > 0.82;
    bar.material.color.setHex(done ? 0x2fbf71 : BLUE);
    lamp.material.color.setHex(done ? 0xd8f5e4 : 0xfff4d6);
    g.rotation.y = -0.42 + app.hoverT * 0.55;
    faceHaze(ground, g.rotation.y);
  };
}

/* 100% relocatable: the actual transport shot — prime mover, low flatbed, the
   station strapped down with its canopy deployed, rolling down the highway */
function vRelocate(app) {
  const g = new Group(); app.s.add(g);
  /* ground running out to the horizon, same lot as everywhere else — the truck
     is pulling out of it rather than driving on a floating strip of road */
  const ground = cardGround(-0.86, -0.98);
  g.add(ground);

  const tr = tTruck(g);
  const truck = tr.g, wheels = tr.wheels;

  /* the station riding on the deck, canopy deployed as in transport */
  const load = new Group(); load.position.set(-0.55, 0.26, 0); load.scale.setScalar(0.46); truck.add(load);
  const lst = tStation(load, 1);
  /* In transport the unit reads dark, as in the real flatbed shot — but a
     single black kept collapsing it into one blob at card size, so the canopy
     is lifted a step off the pillars to keep the silhouette legible. */
  lst.wings.forEach(w => { w.material.map = null; w.material.color.setHex(0x39434f); w.material.needsUpdate = true; });
  lst.cab.forEach(c => c.material.color.setHex(0x11151b));
  /* the CAD assembly's materials are cloned per instance, so a straight dim
     gives the same in-transit read without touching the other cards */
  if (lst.hero) lst.g.traverse(o => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m.map) m.map = null;
      m.color.multiplyScalar(0.34); m.needsUpdate = true;
    });
  });
  for (const x of [-1.5, 0.35]) {
    const strap = new Mesh(new BoxGeometry(0.035, 0.8, 1.5), new MeshBasicMaterial({ color: 0x2b323b }));
    strap.position.set(x, -0.12, 0); truck.add(strap);
  }

  g.rotation.x = CARD_TILT; g.rotation.y = -0.86; g.scale.setScalar(0.9); g.position.y = 0.04;
  app.update = t => {
    const span = 5.0, k = REDUCED ? 0.5 : ((t * 0.00015) % 1);
    truck.position.x = -span / 2 + k * span;
    truck.position.y = Math.sin(t * 0.007) * 0.01;
    /* wheels roll with the distance actually travelled, not on a free timer */
    for (const [hubG, r] of wheels) hubG.rotation.z = -truck.position.x / r;
    g.rotation.y = -0.86 + app.hoverT * 0.45;
    faceHaze(ground, g.rotation.y);
  };
}

/* A tiny equirect sky for reflective surfaces: bright overcast above, pale
   ground below, a warm streak for the sun. Enough for glass to read as glass. */
let ENV_TEX = null;
function envTexture() {
  if (ENV_TEX) return ENV_TEX;
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 128;
  const x = cv.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#eaf2fa"); gr.addColorStop(0.46, "#cfdde9");
  gr.addColorStop(0.54, "#aebdca"); gr.addColorStop(1, "#8fa0af");
  x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
  x.fillStyle = "rgba(255,246,224,.85)";
  x.beginPath(); x.ellipse(70, 26, 26, 10, 0, 0, Math.PI * 2); x.fill();
  ENV_TEX = new CanvasTexture(cv);
  ENV_TEX.mapping = 303;                      /* EquirectangularReflectionMapping */
  ENV_TEX.colorSpace = SRGBColorSpace;
  return ENV_TEX;
}

/* Flatbed prime mover, shared by the transport card and the #how sequence.
   Deck top sits at y = -0.54; wheels rest on y = -0.98. */
function tTruck(parent) {
  const truck = new Group(); parent.add(truck);
  const CHASSIS = 0x171c23;

  /* Prime mover, cab-over: the silhouette cues that make it read as a truck at
     card size are the raked screen, the roof deflector sloping back over the
     load, the stack, and twin rear tyres. */
  const cab = new Mesh(new BoxGeometry(1.2, 1.34, 1.32), std(0xeef2f6, 0.4, 0.3));
  cab.position.set(2.18, -0.1, 0); truck.add(cab); edge(cab, NAVY, 0.35);
  /* deep raked windscreen across the front, plus side glass — mirror-finish,
     reflecting the little procedural sky */
  const glass = () => std(0x27313d, 0.05, 1.0, { envMap: envTexture(), envMapIntensity: 1.25 });
  const wind = new Mesh(new PlaneGeometry(1.18, 0.6), glass());
  wind.position.set(2.792, 0.24, 0); wind.rotation.y = Math.PI / 2; truck.add(wind);
  for (const z of [-1, 1]) {
    /* sized to sit INSIDE the door outline below, with a margin all round */
    const side = new Mesh(new PlaneGeometry(0.64, 0.34), glass());
    side.position.set(2.31, 0.235, z * 0.664); side.rotation.y = z > 0 ? 0 : Math.PI; truck.add(side);
  }
  /* roof deflector, rear edge high, sloping down to the screen top */
  const fair = new Mesh(new BoxGeometry(1.02, 0.26, 1.28), std(0xeef2f6, 0.4, 0.3));
  fair.position.set(1.98, 0.68, 0); fair.rotation.z = -0.17; truck.add(fair); edge(fair, NAVY, 0.3);
  /* slat grille in a bright surround, as on a modern cab */
  const gframe = new Mesh(new BoxGeometry(0.05, 0.4, 1.06), std(0xc9d1d9, 0.35, 0.7));
  gframe.position.set(2.795, -0.28, 0); truck.add(gframe);
  for (const gy of [-0.16, -0.28, -0.4]) {
    const slat = new Mesh(new BoxGeometry(0.075, 0.055, 0.96), std(0x2b323b, 0.55, 0.3));
    slat.position.set(2.8, gy, 0); truck.add(slat);
  }
  /* sun visor over the screen, and roof marker lights on the deflector */
  const visor = new Mesh(new BoxGeometry(0.16, 0.07, 1.3), std(0xdfe4ea, 0.4, 0.3));
  visor.position.set(2.78, 0.6, 0); visor.rotation.z = -0.28; truck.add(visor);
  /* roof light bar with four round spotlights, proper warm yellow */
  const lbar = new Mesh(new BoxGeometry(0.07, 0.07, 1.06), std(0x2b323b, 0.55, 0.35));
  lbar.position.set(2.5, 0.88, 0); truck.add(lbar);
  for (const mz of [-0.45, -0.15, 0.15, 0.45]) {
    const spot = new Mesh(new CylinderGeometry(0.055, 0.055, 0.07, 12), new MeshBasicMaterial({ color: 0xffc61a }));
    spot.rotation.z = Math.PI / 2; spot.position.set(2.56, 0.88, mz); truck.add(spot);
    const rim2 = new Mesh(new CylinderGeometry(0.065, 0.065, 0.05, 12), std(0x39424f, 0.5, 0.4));
    rim2.rotation.z = Math.PI / 2; rim2.position.set(2.53, 0.88, mz); truck.add(rim2);
  }
  /* Door outlines, handles and entry steps on both sides. The seam rectangle
     FRAMES the side glass (x 1.99..2.63, y 0.07..0.41) rather than crossing it,
     so the window sits inside the door the way it does on a real cab. */
  for (const dz of [-1, 1]) {
    const seam = std(0x99a3ad, 0.6, 0.2);
    const dy = dz * 0.667, DTOP = 0.5, DBOT = -0.72, DFRONT = 2.72, DBACK = 1.9;
    for (const sx of [DBACK, DFRONT]) {            /* leading and trailing shut lines */
      const sv = new Mesh(new PlaneGeometry(0.022, DTOP - DBOT), seam);
      sv.position.set(sx, (DTOP + DBOT) / 2, dy); sv.rotation.y = dz > 0 ? 0 : Math.PI;
      truck.add(sv);
    }
    const sh = new Mesh(new PlaneGeometry(DFRONT - DBACK, 0.022), seam);
    sh.position.set((DFRONT + DBACK) / 2, DTOP, dy); sh.rotation.y = dz > 0 ? 0 : Math.PI;
    truck.add(sh);
    const handle = new Mesh(new BoxGeometry(0.16, 0.035, 0.02), std(0x39424f, 0.5, 0.4));
    handle.position.set(2.42, -0.05, dz * 0.674); truck.add(handle);   /* under the glass */
    for (const sy of [-0.86, -0.7]) {
      const step = new Mesh(new BoxGeometry(0.5, 0.05, 0.12), std(0x2b323b, 0.6, 0.3));
      step.position.set(2.27, sy, dz * 0.62); truck.add(step);
    }
  }
  const bumper = new Mesh(new BoxGeometry(0.16, 0.22, 1.38), std(0x2b323b, 0.55, 0.35));
  bumper.position.set(2.82, -0.56, 0); truck.add(bumper); edge(bumper, NAVY, 0.35);
  for (const z of [-0.48, 0.48]) {
    const lamp = new Mesh(new BoxGeometry(0.06, 0.13, 0.26), new MeshBasicMaterial({ color: 0xfff3d0 }));
    lamp.position.set(2.83, -0.38, z); truck.add(lamp);
    /* proper mirror assemblies: arm out from the A-pillar, housing, glass */
    const arm = new Mesh(new BoxGeometry(0.04, 0.04, 0.3), std(0x2b323b, 0.5, 0.4));
    arm.position.set(2.68, 0.52, z * 1.62); truck.add(arm);
    const house = new Mesh(new BoxGeometry(0.09, 0.34, 0.15), std(0xdfe4ea, 0.4, 0.3));
    house.position.set(2.68, 0.33, z * 1.83); truck.add(house); edge(house, NAVY, 0.3);
    const mglass = new Mesh(new PlaneGeometry(0.06, 0.28),
      std(0x27313d, 0.05, 1.0, { envMap: envTexture(), envMapIntensity: 1.2 }));
    mglass.position.set(2.63, 0.33, z * 1.83); mglass.rotation.y = -Math.PI / 2; truck.add(mglass);
  }
  /* exhaust stack behind the cab */
  const stack = new Mesh(new CylinderGeometry(0.05, 0.05, 0.9, 10), std(0x8e98a4, 0.35, 0.8));
  stack.position.set(1.6, 0.24, -0.56); truck.add(stack);

  /* flatbed deck riding ABOVE the wheel tops, as a real flatbed does — the
     tyres tuck under it instead of poking through the empty bed */
  const deck = new Mesh(new BoxGeometry(3.9, 0.16, 1.42), std(CHASSIS, 0.62, 0.28));
  deck.position.set(-0.45, -0.44, 0); truck.add(deck); edge(deck, 0x4a5561, 0.4);
  const neck = new Mesh(new BoxGeometry(0.9, 0.42, 1.0), std(CHASSIS, 0.62, 0.28));
  neck.position.set(1.55, -0.33, 0); truck.add(neck);
  for (const z of [-0.66, 0.66]) {
    const rail = new Mesh(new BoxGeometry(3.9, 0.1, 0.08), std(0x39424f, 0.6, 0.3));
    rail.position.set(-0.45, -0.32, z); truck.add(rail);
    /* mudguards over the bogie, and the rear mudflap */
    const guard = new Mesh(new BoxGeometry(1.1, 0.06, 0.42), std(0x2b323b, 0.6, 0.3));
    guard.position.set(-1.65, -0.5, z * 0.94); truck.add(guard);
  }
  const flap = new Mesh(new BoxGeometry(0.05, 0.3, 1.3), std(0x22282f, 0.75, 0.15));
  flap.position.set(-2.36, -0.78, 0); truck.add(flap);
  for (const z of [-0.5, 0.5]) {
    const tail = new Mesh(new BoxGeometry(0.05, 0.12, 0.2), new MeshBasicMaterial({ color: 0xd6452a }));
    tail.position.set(-2.4, -0.36, z); truck.add(tail);
  }

  /* axles: single steer up front, twin tyres on the drive and bogie axles —
     the doubled rear wheels are the strongest "this is a truck" cue there is */
  const wheels = [];
  const AXLES = [[2.25, 0.31, false], [1.15, 0.3, true], [-1.35, 0.3, true], [-1.95, 0.3, true]];
  for (const [wx, r, dual] of AXLES) {
    const zs = dual ? [-0.72, -0.48, 0.48, 0.72] : [-0.62, 0.62];
    for (const wz of zs) {
      /* the spin lives on a wrapper so the tyre keeps its axle orientation */
      const hubG = new Group(); hubG.position.set(wx, -0.98 + r, wz); truck.add(hubG); wheels.push([hubG, r]);
      /* the tyre sits just light enough to separate from the chassis, and the
         rim proud of it — at card size a flush dark hub vanished entirely */
      const w2 = new Mesh(new CylinderGeometry(r, r, 0.2, 16), std(0x232a33, 0.85, 0.1));
      w2.rotation.x = Math.PI / 2; hubG.add(w2); edge(w2, 0x6b7684, 0.5);
      const hb = new Mesh(new CylinderGeometry(r * 0.54, r * 0.54, 0.26, 12), std(0xc2cbd5, 0.35, 0.65));
      hb.rotation.x = Math.PI / 2; hubG.add(hb);
      const spoke = new Mesh(new BoxGeometry(r * 0.78, 0.035, 0.27), std(0x7d8894, 0.45, 0.5));
      hubG.add(spoke);
    }
  }
  return { g: truck, wheels };
}

/* ---------- technology exploded stack ---------- */
function cellTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 256;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#dfe7ee"; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,90,150,.55)"; ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
  }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
}
function techLayers(app) {
  const stack = new Group(); app.s.add(stack);
  const layers = [], anims = [];
  const mkLayer = (y, build) => { const g = new Group(); g.position.y = y; stack.add(g); layers.push(g); anims.push(build(g) || null); };
  /* Each layer is a kinetic diagram of its step's claim, sharing one language:
     navy hardware, energy as moving teal light. Motion states the point —
     nothing decorative, nothing random. */
  /* 01 capture — sunlight streams onto the butterfly array and is absorbed */
  mkLayer(1.8, g => {
    const deckM = std(0xffffff, 0.35, 0.4, { map: cellTexture() });
    const deck = new Mesh(new BoxGeometry(4.0, 0.12, 1.7), deckM); g.add(deck); edge(deck, BLUE, 0.6);
    const wingMs = [];
    for (const dir of [-1, 1]) {
      const wm = std(0xffffff, 0.35, 0.4, { map: cellTexture() });
      const w = new Mesh(new BoxGeometry(4.0, 0.1, 1.05), wm);
      w.position.set(0, -0.14, dir * 1.33); w.rotation.x = dir * 0.24;
      g.add(w); edge(w, BLUE, 0.5); wingMs.push(wm);
    }
    const sun = new Mesh(new SphereGeometry(0.16, 16, 12), new MeshBasicMaterial({ color: 0xffc257 }));
    sun.position.set(-2.2, 1.65, -0.6); g.add(sun);
    const halo = new Mesh(new SphereGeometry(0.3, 16, 12),
      new MeshBasicMaterial({ color: 0xffd894, transparent: true, opacity: 0.3, blending: AdditiveBlending }));
    sun.add(halo);
    /* Visible beams from the sun down onto the array. The photon specks alone
       read as noise at this size — the rays are what actually say "sunlight is
       being caught here", so they carry the idea and the particles just add life. */
    const RN = 9, rp = [];
    for (let i = 0; i < RN; i++) {
      const rx = -1.95 + (i / (RN - 1)) * 3.9, rz = -0.75 + (i % 3) * 0.75;
      rp.push(-2.2, 1.6, -0.6, rx, 0.08, rz);
    }
    const rgeo = new BufferGeometry();
    rgeo.setAttribute("position", new Float32BufferAttribute(new Float32Array(rp), 3));
    const rayMat = new LineBasicMaterial({
      color: 0xffd08a, transparent: true, opacity: 0.45,
      blending: AdditiveBlending, depthWrite: false
    });
    g.add(new LineSegments(rgeo, rayMat));

    const PN = 26, pp = new Float32Array(PN * 3), ph = [];
    for (let i = 0; i < PN; i++) ph.push(i / PN);
    const pg = new BufferGeometry(); pg.setAttribute("position", new Float32BufferAttribute(pp, 3));
    const photons = new Points(pg, new PointsMaterial({
      color: 0xffd894, size: 0.09, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
    if (REDUCED) photons.visible = false;
    g.add(photons);
    return t => {
      if (REDUCED) { rayMat.opacity = 0.42; return; }
      /* the beams breathe rather than blink, so they read as steady sunlight */
      rayMat.opacity = 0.34 + (Math.sin(t * 0.0016) + 1) * 0.11;
      for (let i = 0; i < PN; i++) {
        const k = (ph[i] + t * 0.00035) % 1;
        const sx = -2.2 + ((i * 37) % 100) / 100 * 4.0, sz = -0.6 + ((i * 53) % 100) / 100 * 1.9;
        pp[i * 3] = -2.2 + (sx + 2.2) * k;
        pp[i * 3 + 1] = 1.65 - 1.55 * k;
        pp[i * 3 + 2] = -0.6 + (sz + 0.6) * k;
      }
      pg.attributes.position.needsUpdate = true;
      /* the array drinks the light: a slow warm sweep across the cells */
      const s2 = (Math.sin(t * 0.0016) + 1) / 2;
      deckM.emissive.setHex(0x3bb1e3); deckM.emissiveIntensity = 0.06 + s2 * 0.1;
      wingMs.forEach(m => { m.emissive.setHex(0x3bb1e3); m.emissiveIntensity = 0.04 + s2 * 0.08; });
      sun.scale.setScalar(1 + Math.sin(t * 0.002) * 0.06);
    };
  });
  /* 02 store — an opened battery bank whose cells visibly fill: the buffer */
  mkLayer(0.6, g => {
    const tray = new Mesh(new BoxGeometry(3.7, 0.18, 2.0), std(STATION_NAVY, 0.45, 0.3));
    tray.position.y = -0.62; g.add(tray); edge(tray, TEAL, 0.5);
    const fills = [];
    /* three cells, matching the unit's three pillars — a fourth read as an
       extra pillar and fought the rest of the model */
    for (let i = 0; i < 3; i++) {
      const x = -1.15 + i * 1.15;
      const cell = new Mesh(new BoxGeometry(0.78, 1.05, 1.0), std(0x0f2f52, 0.35, 0.5));
      cell.position.set(x, 0, 0); g.add(cell); edge(cell, TEAL, 0.45);
      const slot = new Mesh(new PlaneGeometry(0.42, 0.8), new MeshBasicMaterial({ color: 0x0a1a2c }));
      slot.position.set(x, 0, 0.51); g.add(slot);
      const fill = new Mesh(new PlaneGeometry(0.38, 0.76), new MeshBasicMaterial({ color: TEAL }));
      fill.position.set(x, 0, 0.515); g.add(fill); fills.push(fill);
    }
    return t => {
      fills.forEach((f, i) => {
        /* charge climbs, holds full a beat, then the next cycle begins */
        const k = REDUCED ? 0.3 + i * 0.18 : Math.min(1, ((t * 0.00018 + i * 0.22) % 1.25));
        f.scale.y = Math.max(0.05, k);
        f.position.y = -0.38 + 0.38 * Math.max(0.05, k);
      });
    };
  });
  /* 03 direct — the controller routes power along clean traces to its three
     ports (battery bus, charge bays, grid tie), one route lit at a time */
  mkLayer(-0.6, g => {
    const box = new Mesh(new BoxGeometry(1.7, 0.5, 1.2), std(INK, 0.45, 0.35));
    box.position.x = -1.1; g.add(box); edge(box, TEAL, 0.6);
    const led = new Mesh(new PlaneGeometry(0.46, 0.07), new MeshBasicMaterial({ color: TEAL }));
    led.position.set(-1.1, 0.1, 0.61); g.add(led);
    const PORTS = [{ z: -1.05, c: BLUE }, { z: 0, c: TEAL }, { z: 1.05, c: 0x8fa3b8 }];
    const portMs = [], paths = [], pos = [];
    PORTS.forEach(p => {
      const pm = new Mesh(new BoxGeometry(0.42, 0.3, 0.42), std(0x1b2735, 0.4, 0.4));
      pm.position.set(1.55, -0.1, p.z); g.add(pm); edge(pm, p.c, 0.85); portMs.push(pm);
      const path = [[-0.2, 0.3, 0], [0.65, 0.3, p.z * 0.72], [1.55, 0.12, p.z]];
      paths.push(path);
      for (let i = 0; i < path.length - 1; i++) pos.push(...path[i], ...path[i + 1]);
    });
    const lg = new BufferGeometry(); lg.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.add(new LineSegments(lg, new LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.45 })));
    const pulse = new Mesh(new SphereGeometry(0.07, 10, 8), new MeshBasicMaterial({ color: TEAL }));
    g.add(pulse);
    const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    return t => {
      const cyc = REDUCED ? 0.45 : t * 0.0005;
      const route = REDUCED ? 0 : Math.floor(cyc) % 3, u = REDUCED ? 0.5 : cyc % 1;
      const path = paths[route];
      const p2 = u < 0.5 ? lerp3(path[0], path[1], u * 2) : lerp3(path[1], path[2], u * 2 - 1);
      pulse.position.set(p2[0], p2[1], p2[2]);
      portMs.forEach((pm, i) => {
        const tgt = i === route && u > 0.82 ? 1.25 : 1;
        pm.scale.x += (tgt - pm.scale.x) * 0.18; pm.scale.y = pm.scale.z = pm.scale.x;
      });
    };
  });
  /* 04 trade — packets exchanged between peers over the hub, both directions */
  mkLayer(-1.9, g => {
    const nodes = [], R = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const n = new Mesh(new SphereGeometry(0.16, 14, 12), std(BLUE, 0.3, 0.5));
      n.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.add(n); nodes.push(n);
    }
    const core = new Mesh(new SphereGeometry(0.24, 16, 12), std(INK, 0.35, 0.5)); g.add(core); edge(core, TEAL, 0.7);
    const pos = [];
    nodes.forEach(n => pos.push(0, 0, 0, n.position.x, n.position.y, n.position.z));
    const lg = new BufferGeometry(); lg.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.add(new LineSegments(lg, new LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.5 })));
    const pk = [];
    for (let i = 0; i < 3; i++) {
      const s = new Mesh(new SphereGeometry(0.075, 10, 8), new MeshBasicMaterial({ color: TEAL }));
      g.add(s); pk.push(s);
    }
    return t => {
      pk.forEach((s, i) => {
        const ph = t * 0.00045 + i * 0.37;
        const k = REDUCED ? 0.5 : ph % 1, cycle = Math.floor(ph);
        const node = nodes[(i * 2 + cycle) % 5];
        const dirOut = cycle % 2 === 0;       /* sell one way, buy back the other */
        const kk = dirOut ? k : 1 - k;
        s.position.set(node.position.x * kk, 0, node.position.z * kk);
        const rec = dirOut ? node : core;
        rec.scale.x += ((k > 0.85 ? 1.3 : 1) - rec.scale.x) * 0.15;
        rec.scale.y = rec.scale.z = rec.scale.x;
      });
    };
  });
  /* single-focus mode: one polished object per step, centered; the rest fade
     out entirely. Cleaner than the exploded stack at card size. */
  layers.forEach(g => { g.position.y = 0.35; });
  stack.rotation.x = 0.34;
  let drag = null, yaw = 0.55;
  app.host.style.touchAction = "pan-y";
  app.host.addEventListener("pointerdown", e => { drag = { x: e.clientX, yaw }; });
  addEventListener("pointermove", e => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.008; });
  addEventListener("pointerup", () => drag = null);
  app.setActive = i => { app.active = i; };
  app.active = 0;
  app.update = t => {
    stack.rotation.y += ((yaw + app.px * 0.15 + (REDUCED ? 0 : t * 0.00022)) - stack.rotation.y) * 0.08;
    layers.forEach((g, i) => {
      const on = i === app.active;
      g.position.y += ((on ? 0 : 0.55) - g.position.y) * 0.09;
      const ts = on ? 1.18 : 0.8;
      g.scale.x += (ts - g.scale.x) * 0.09; g.scale.y = g.scale.z = g.scale.x;
      let anyVisible = false;
      g.traverse(o => {
        const m = o.material;
        if (m && "opacity" in m) {
          const base = m.userData.bo === undefined ? (m.userData.bo = m.transparent ? m.opacity : 1) : m.userData.bo;
          m.transparent = true;
          const tgt = on ? base : 0;
          m.opacity += (tgt - m.opacity) * 0.09;
          if (m.opacity > 0.01) anyVisible = true;
        }
      });
      g.visible = on || anyVisible;
    });
    /* only the focused layer animates; hidden ones freeze */
    const fn = anims[app.active]; fn && fn(t);
  };
}

/* ---------- FAQ: Mario-style question block, brand blue ---------- */
function blockFace(withQ) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const ctx = cv.getContext("2d");
  /* deep brand gradient face with a fine inner keyline — quiet, not cartoon */
  const g0 = ctx.createLinearGradient(0, 0, 512, 512);
  g0.addColorStop(0, "#0a90e2"); g0.addColorStop(0.55, "#0084d6"); g0.addColorStop(1, "#0067ab");
  ctx.fillStyle = g0; ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(0, 0, 512, 10); ctx.fillRect(0, 0, 10, 512);
  ctx.fillStyle = "rgba(4,26,48,.28)"; ctx.fillRect(0, 502, 512, 10); ctx.fillRect(502, 0, 10, 512);
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3;
  ctx.strokeRect(38, 38, 436, 436);
  ctx.fillStyle = "rgba(255,255,255,.55)";
  for (const [x, y] of [[58, 58], [454, 58], [58, 454], [454, 454]]) {
    ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.284); ctx.fill();
  }
  if (withQ) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 300px 'Noto Sans', Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(4,26,48,.32)"; ctx.shadowOffsetY = 8; ctx.shadowBlur = 6;
    ctx.fillText("?", 256, 278);
  }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
}
function faqQ(app) {
  const g = new Group(); app.s.add(g);
  const q = std(0xffffff, 0.3, 0.25, { map: blockFace(true) });
  const plain = std(0xffffff, 0.3, 0.25, { map: blockFace(false) });
  const cube = new Mesh(new BoxGeometry(2, 2, 2), [q, q, plain, plain, q, q]);
  g.add(cube);
  edge(cube, 0x04263f, 0.22);
  app.update = t => {
    /* premium idle only: slow turn, gentle float, cursor-follow tilt */
    g.position.y = Math.sin(t * 0.0007) * 0.08;
    cube.rotation.y += ((app.px * 0.5 + (REDUCED ? 0.6 : t * 0.00028)) - cube.rotation.y) * 0.06;
    cube.rotation.x += ((app.py * 0.18 + 0.1) - cube.rotation.x) * 0.06;
  };
}

/* ---------- shared loop ---------- */
let last = 0;
function loop(t) {
  const dt = Math.min(t - last, 60); last = t;
  for (const a of apps) {
    if (!a.visible || !a.r) continue;
    a.hoverT += ((a.hover ? 1 : 0) - a.hoverT) * 0.06;
    a.update && a.update(t, dt);
    a.r.render(a.s, a.c);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- DOM wiring ---------- */
const findLeaf = (root, re) => [...root.querySelectorAll("*")].find(el => el.children.length === 0 && re.test((el.textContent || "").trim()));

function mountRecord() {
  const rec = document.querySelector("#record");
  if (!rec) return false;
  /* hold the cards briefly for the real CAD kit; the boot loop retries, and
     past the deadline the procedural models mount as before */
  if (!HERO_KIT.station || !HERO_KIT.bike) {
    loadHeroKit();
    if (Date.now() - HERO_KIT.t0 < 15000 && !HERO_KIT.err) return false;
  }
  /* count-up animation means the numbers read "0 min" until scrolled into view,
     so match the four stat cards by document order, not by text */
  const nums = [...rec.querySelectorAll('div[class*="text-4xl"]')];
  if (nums.length < 4) return false;
  const builds = [vDeploy, vLifespan, vCharge, vRelocate];
  let did = false;
  nums.slice(0, 4).forEach((numEl, i) => {
    const card = numEl.closest('div[class*="border"]');
    if (!card || card.querySelector(".bm-mini")) return;
    /* the vignette lives INSIDE the card, as a banner above the number */
    card.style.overflow = "hidden";
    const host = document.createElement("div");
    host.className = "bm-mini";
    Object.assign(host.style, { position: "relative", width: "100%", height: "206px", marginBottom: "6px", pointerEvents: "none" });
    const inner = numEl.parentElement;
    inner.insertBefore(host, numEl);
    /* break the stage out of the card padding so the visual runs to the card
       edges instead of stopping short of them */
    const bleed = () => {
      const ip = getComputedStyle(inner);
      host.style.marginLeft = "-" + ip.paddingLeft;
      host.style.marginRight = "-" + ip.paddingRight;
      host.style.marginTop = "-" + ip.paddingTop;
      host.style.width = "auto";
    };
    bleed(); new ResizeObserver(bleed).observe(inner);
    const app = makeApp(host, 320, 206, 30, 7.9, { shadows: true });
    /* measure BOTH axes. Height was pinned at 206 while the canvas stretches to
       fill the box, so any host shorter than that — the 132px mobile card —
       squashed a 206-tall buffer into it and flattened the model. */
    const fit = () => {
      const w = host.clientWidth || 320, h = host.clientHeight || 206;
      if (!w || !h) return;
      app.r.setSize(w, h, false); app.c.aspect = w / h; app.c.updateProjectionMatrix();
    };
    fit(); new ResizeObserver(fit).observe(host);
    builds[i](app);
    /* solid hardware casts, everything catches — decor (basic materials: LCD,
       chevrons, lamps, halos) must not throw shadows or halos turn into discs */
    app.s.traverse(o => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      o.castShadow = !!(o.material && o.material.isMeshStandardMaterial);
    });
    card.addEventListener("mouseenter", () => app.hover = 1);
    card.addEventListener("mouseleave", () => app.hover = 0);
    did = true;
  });
  return did;
}

function mountTech() {
  const sec = document.querySelector("#technology");
  if (!sec || sec.querySelector(".bm-tech-stage")) return !!(sec && sec.querySelector(".bm-tech-stage"));
  const grid = sec.querySelector('[class*="grid-cols-[minmax"]');
  if (!grid || grid.children.length < 2) return false;
  const col = grid.children[1];
  sec.style.position = "relative";
  const host = document.createElement("div");
  host.className = "bm-tech-stage";
  Object.assign(host.style, { position: "relative", pointerEvents: "auto", cursor: "grab", zIndex: 2 });
  col.insertBefore(host, col.firstChild);
  const app = makeApp(host, 480, 265, 30, 10.2);
  techLayers(app);
  /* the step indicator sits on the same line as the flow's destination chips.
     The column is column-reverse, so its bottom edge moves with the 3D stage —
     measure the gap each layout rather than freezing an offset that drifts. */
  const bars = sec.querySelector('div[class*="bottom-7"][class*="flex"]');
  const chips = sec.querySelector('div[class*="pl-[60px]"] div[class*="flex-wrap"]');
  const alignBars = () => {
    if (!bars || !chips) return;
    const cb = col.getBoundingClientRect().bottom, hb = chips.getBoundingClientRect().bottom;
    if (cb > hb) { bars.style.bottom = Math.round(cb - hb) + "px"; bars.style.zIndex = "3"; }
  };
  const layout = () => {
    if (matchMedia("(max-width: 1023px)").matches) { host.style.display = "none"; return; }
    host.style.display = "block";
    const cr = col.getBoundingClientRect();
    const w = Math.round(cr.width), h = 300;
    Object.assign(host.style, { width: "100%", height: h + "px", marginBottom: "26px" });
    app.r.setSize(w, h, false); app.c.aspect = w / h; app.c.updateProjectionMatrix();
    alignBars();
  };
  layout();
  addEventListener("resize", layout);
  setInterval(layout, 1500);
  parallax(app);
  const NAMES = ["Solar generation", "Energy storage", "Smart-grid controller", "P2P & VPPA trading"];
  const sync = () => {
    /* read the active layer from the right-hand card's title — robust against
       markup changes, unlike matching the big ghost number */
    const txt = (grid.children[1] && grid.children[1].textContent) || "";
    const i = NAMES.findIndex(n => txt.includes(n));
    if (i >= 0) app.setActive(i);
  };
  sync();
  new MutationObserver(sync).observe(sec, { childList: true, subtree: true, characterData: true });
  return true;
}

function mountFaq() {
  const sec = document.querySelector("#faq");
  if (!sec || sec.querySelector(".bm-faq-q")) return !!(sec && sec.querySelector(".bm-faq-q"));
  const shell = sec.querySelector(".shell") || sec;
  shell.style.position = "relative";
  const host = document.createElement("div");
  host.className = "bm-faq-q";
  Object.assign(host.style, { position: "absolute", right: "6%", top: "-30px", width: "230px", height: "270px", pointerEvents: "none" });
  if (matchMedia("(max-width: 1023px)").matches) host.style.display = "none";
  shell.insertBefore(host, shell.firstChild);
  Object.assign(host.style, { width: "160px", height: "180px", right: "8%", top: "-6px" });
  const app = makeApp(host, 160, 180, 30, 7.6);
  faqQ(app);
  addEventListener("pointermove", e => {
    const r2 = host.getBoundingClientRect();
    app.px = Math.max(-1, Math.min(1, (e.clientX - (r2.left + r2.width / 2)) / 400));
    app.py = Math.max(-1, Math.min(1, (e.clientY - (r2.top + r2.height / 2)) / 400));
  });
  return true;
}

const HEADER_ICONS = {
  "Grid extension": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:8px"><path d="M12 2v20M7 6h10M5 10h14M8 21l4-11 4 11"/></svg>',
  "Fixed charger": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px;margin-right:8px"><path d="M7 21h8M8 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16M10 7h4M16 11h2a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0"/></svg>'
};
function mountHeaderIcons() {
  const sec = document.querySelector("#comparison");
  if (!sec) return false;
  let did = true;
  for (const [label, svg] of Object.entries(HEADER_ICONS)) {
    const leaf = findLeaf(sec, new RegExp("^" + label.replace(" ", "\\s") + "$"));
    if (!leaf) { did = false; continue; }
    if (!leaf.querySelector(".bm-hicon") && !leaf.parentElement.querySelector(".bm-hicon")) {
      const span = document.createElement("span");
      span.className = "bm-hicon"; span.innerHTML = svg;
      leaf.insertBefore(span, leaf.firstChild);
    }
  }
  return did;
}

/* how-it-works steps: an icon above each step title */
const STEP_ICONS = {
  "Arrive": '<path d="M2 16h13V6H2zM15 10h4l3 3v3h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>',
  "Set down": '<path d="M12 3v9M8.5 8.5 12 12l3.5-3.5M4 16h16M6 20h12"/>',
  "Power on": '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  "Scale": '<path d="M4 20h4v-6H4zM10 20h4V9h-4zM16 20h4V4h-4z"/>'
};
function mountStepIcons() {
  const sec = [...document.querySelectorAll("section")].find(s =>
    /Arrive/.test(s.textContent || "") && /Set down/.test(s.textContent || "") && /Power on/.test(s.textContent || ""));
  if (!sec) return false;
  let all = true;
  for (const [name, path] of Object.entries(STEP_ICONS)) {
    const leaf = [...sec.querySelectorAll("*")].find(el => el.children.length === 0 && (el.textContent || "").trim() === name);
    if (!leaf) { all = false; continue; }
    if (leaf.previousElementSibling && leaf.previousElementSibling.classList.contains("bm-sicon")) continue;
    const span = document.createElement("span");
    span.className = "bm-sicon";
    span.style.cssText = "display:block;margin-bottom:12px;color:#05070e";
    span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>";
    leaf.parentElement.insertBefore(span, leaf);
  }
  return all;
}

/* diagram label boxes: an icon per system, matched by title */
const DIAGRAM_ICONS = {
  "Solar canopy": '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="4"/>',
  "Stay-cable rig": '<path d="M12 3v18M12 6 4 20M12 6l8 14M4 20h16"/>',
  "Power cabinet": '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M13 7l-3 5h4l-3 5M5 12h14"/>',
  "Charge points": '<rect x="6" y="3" width="9" height="18" rx="1"/><path d="M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0M9 8h3"/>',
  "Levelling base": '<path d="M3 17h18M6 17v-3M12 17v-5M18 17v-3M3 7h18"/>',
  "Deployment footprint": '<path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4"/><rect x="8" y="9" width="8" height="6" rx="1"/>'
};
function mountDiagramIcons() {
  const sec = document.querySelector("#grid");
  if (!sec) return false;
  let all = true;
  for (const [name, path] of Object.entries(DIAGRAM_ICONS)) {
    const leaf = [...sec.querySelectorAll("*")].find(el => el.children.length === 0 && (el.textContent || "").trim() === name);
    if (!leaf) { all = false; continue; }
    if (leaf.querySelector(".bm-dicon")) continue;
    const span = document.createElement("span");
    span.className = "bm-dicon";
    span.style.cssText = "display:inline-block;vertical-align:-3px;margin-right:8px;color:#0084d6";
    span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>";
    leaf.insertBefore(span, leaf.firstChild);
  }
  return all;
}

/* diagram label boxes → forward hover/click to their numbered markers */
function diagramShim() {
  const markers = () => [...document.querySelectorAll("#grid button")].filter(b => /^[1-6]$/.test((b.textContent || "").trim()));
  const boxFor = ev => ev.target && ev.target.closest && ev.target.closest('#grid [class*="backdrop-blur-md"]');
  const pairFor = box => {
    const ms = markers(); if (!ms.length) return null;
    const r2 = box.getBoundingClientRect(), cy = r2.top + r2.height / 2, cx = r2.left + r2.width / 2;
    const stage = box.closest('div[class*="relative"]') || document.body;
    const mid = stage.getBoundingClientRect().left + stage.getBoundingClientRect().width / 2;
    const side = ms.filter(m => { const mr = m.getBoundingClientRect(); return (mr.left + mr.width / 2 < mid) === (cx < mid); });
    return (side.length ? side : ms).sort((a, b2) => {
      const ay = a.getBoundingClientRect().top, by = b2.getBoundingClientRect().top;
      return Math.abs(ay - cy) - Math.abs(by - cy);
    })[0];
  };
  const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  document.addEventListener("mouseover", ev => {
    const b2 = boxFor(ev); if (!b2 || (ev.relatedTarget && b2.contains(ev.relatedTarget))) return;
    const m = pairFor(b2); if (m) { fire(m, "mouseover"); fire(m, "mouseenter"); }
  }, true);
  document.addEventListener("mouseout", ev => {
    const b2 = boxFor(ev); if (!b2 || (ev.relatedTarget && b2.contains(ev.relatedTarget))) return;
    const m = pairFor(b2); if (m) { fire(m, "mouseout"); fire(m, "mouseleave"); }
  }, true);
  document.addEventListener("click", ev => {
    const b2 = boxFor(ev); if (!b2) return;
    const m = pairFor(b2); if (m) fire(m, "click");
  }, true);
}


/* video poster: the real station on a flatbed beats generic stock tech art */
/* ---------- #how: pinned, scroll-scrubbed delivery sequence ----------
   Four silent clips, one per step, each scrubbed across its own quarter of a
   tall spacer while the step row sits pinned underneath and lights up in turn.
   Encoded with a keyframe every 6 frames so seeking lands almost instantly. */
const HOW_BEATS = 4;
/* ---------- #how: flat 2D side elevation, scroll-scrubbed ----------
   Real SVG rather than a flattened 3D camera: crisp at any size, a few KB, and
   the proportions are unambiguous because it IS the elevation drawing. */
const SVG_NS = "http://www.w3.org/2000/svg";
const el = (n, a) => { const e = document.createElementNS(SVG_NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
/* the station drawn once in side elevation, reused by <use> for the extra units */
/* Drawn to match the anatomy elevation in /images/t-station-unit.png: wide
   shallow canopy on a dark fascia, stay-cable rig off two masts, three panelled
   columns on levelling bases, and a charge rail with hanging leads per bay. */
function stationSymbol() {
  const s = el("g", { id: "bm-st" });
  const BODY = "#12181f", PANEL = "#1b2530", SEAM = "#2b3947";
  const add = (n, a) => s.appendChild(el(n, a));

  /* stay-cable rig: a mast at each end, cables tensioning the canopy tips */
  for (const dir of [-1, 1]) {
    add("rect", { x: dir * 188 - 2, y: -206, width: 4, height: 16, fill: "#8b98a6" });
    add("path", {
      d: "M" + (dir * 188) + " -206 L" + (dir * 210) + " -176",
      stroke: "#8b98a6", "stroke-width": "1.6", fill: "none"
    });
  }
  /* PV array sitting proud of the canopy, drawn as individual modules */
  for (let i = 0; i < 10; i++) {
    add("rect", { x: -200 + i * 40, y: -192, width: 37, height: 11, fill: "#c8d4e0" });
    add("rect", { x: -200 + i * 40, y: -192, width: 37, height: 5, fill: "#d9e2ec" });
  }
  /* canopy fascia — the dark band that gives the elevation its strong line */
  add("rect", { x: -210, y: -181, width: 420, height: 13, fill: BODY });
  add("rect", { x: -210, y: -170, width: 420, height: 3, fill: "#0b1219" });

  /* three columns: wide outer cabinets, narrower centre, all on levelling bases */
  const cols = [[-132, 40], [0, 30], [132, 40]];
  for (const c of cols) {
    const x = c[0], w = c[1];
    add("rect", { x: x - w / 2, y: -168, width: w, height: 152, fill: PANEL });
    add("rect", { x: x - w / 2, y: -168, width: w * 0.32, height: 152, fill: BODY });
    /* panel seams down the cabinet face */
    for (const sy of [-126, -84, -46]) {
      add("rect", { x: x - w / 2, y: sy, width: w, height: 1, fill: SEAM });
    }
    add("rect", { x: x - w / 2 - 7, y: -16, width: w + 14, height: 12, rx: 1, fill: BODY });
  }
  /* a charge rail per bay with hanging leads and their status screens */
  for (const bx of [-66, 66]) {
    add("rect", { x: bx - 48, y: -104, width: 96, height: 6, fill: BODY });
    for (const dx of [-30, 0, 30]) {
      add("path", {
        d: "M" + (bx + dx) + " -98 q0 22 9 22 q9 0 9 -14",
        stroke: "#0f161d", "stroke-width": "3.4", fill: "none", "stroke-linecap": "round"
      });
      add("rect", { x: bx + dx - 6, y: -110, width: 12, height: 7, rx: 1, fill: "#7fd4c1" });
    }
  }
  /* the LCD, centre column only */
  add("rect", { x: -10, y: -150, width: 20, height: 40, rx: 2, fill: "#eef4fa" });
  add("rect", { x: -6, y: -144, width: 12, height: 28, rx: 1, fill: "#0084d6" });
  return s;
}
/* Deliberately not a toy: no rounded corners, a long low chassis, thin rims and
   fine panel lines. The silhouette does the work, the detail keeps it technical. */
function truckSymbol() {
  const s = el("g", { id: "bm-tk" });
  const add = (n, a) => s.appendChild(el(n, a));
  const CH = "#1a222c", DK = "#0f151c", MID = "#2c3742";

  add("rect", { x: -276, y: -44, width: 404, height: 11, fill: CH });        /* deck */
  add("rect", { x: -276, y: -33, width: 404, height: 4, fill: DK });          /* deck shadow line */
  add("rect", { x: -262, y: -29, width: 372, height: 7, fill: MID });         /* chassis rail */
  add("rect", { x: -280, y: -44, width: 5, height: 30, fill: MID });          /* rear post */
  /* cab: squared off, raked screen, roof deflector reading as one mass */
  add("path", { d: "M126 -33 L126 -124 L150 -140 L226 -140 L226 -33 Z", fill: "#e6eaef" });
  add("path", { d: "M150 -140 L226 -140 L226 -152 L162 -152 Z", fill: "#d5dbe2" });
  add("path", { d: "M143 -119 L226 -119 L226 -86 L143 -86 Z", fill: "#0d1720" });
  add("rect", { x: 126, y: -60, width: 100, height: 2, fill: "#c3cad2" });
  add("rect", { x: 226, y: -58, width: 8, height: 22, fill: MID });           /* bumper */
  add("rect", { x: 108, y: -33, width: 18, height: 12, fill: MID });          /* fifth wheel */
  add("rect", { x: -170, y: -33, width: 118, height: 9, fill: DK });          /* bogie mudguard */
  for (const wx of [-232, -178, 96, 190]) {
    add("circle", { cx: wx, cy: -14, r: 21, fill: "#151b22" });
    add("circle", { cx: wx, cy: -14, r: 21, fill: "none", stroke: "#48545f", "stroke-width": "1.2" });
    add("circle", { cx: wx, cy: -14, r: 8, fill: "none", stroke: "#7b8894", "stroke-width": "2.4" });
  }
  return s;
}
function howScene2D(stage) {
  const svg = el("svg", {
    viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true", style: "display:block;width:100%;height:100%;overflow:visible"
  });
  const defs = el("defs", {});
  /* PV cell grid + the soft contact-shadow gradient, both as reusable paint */
  const pat = el("pattern", { id: "bm-pv", width: "16", height: "8", patternUnits: "userSpaceOnUse" });
  pat.appendChild(el("rect", { width: "16", height: "8", fill: "#aebecd" }));
  pat.appendChild(el("rect", { width: "14", height: "6", x: "1", y: "1", fill: "#bccbd8" }));
  defs.appendChild(pat);
  const rg = el("radialGradient", { id: "bm-sh" });
  rg.appendChild(el("stop", { offset: "0", "stop-color": "#22344a", "stop-opacity": ".26" }));
  rg.appendChild(el("stop", { offset: "1", "stop-color": "#22344a", "stop-opacity": "0" }));
  defs.appendChild(rg);
  const lg = el("linearGradient", { id: "bm-gl", x1: "0", x2: "1" });
  lg.appendChild(el("stop", { offset: "0", "stop-color": "#8fa3b5", "stop-opacity": "0" }));
  lg.appendChild(el("stop", { offset: ".5", "stop-color": "#8fa3b5", "stop-opacity": ".75" }));
  lg.appendChild(el("stop", { offset: "1", "stop-color": "#8fa3b5", "stop-opacity": "0" }));
  defs.appendChild(lg);
  defs.appendChild(stationSymbol());
  defs.appendChild(truckSymbol());
  svg.appendChild(defs);

  const GY = 640;                                   /* ground line */
  const world = el("g", {});                        /* everything, so it can be scaled */
  svg.appendChild(world);
  const shTruck = el("ellipse", { cx: 0, cy: GY, rx: 210, ry: 13, fill: "url(#bm-sh)" });
  const shUnit = el("ellipse", { cx: 0, cy: GY, rx: 150, ry: 12, fill: "url(#bm-sh)" });
  const shEx = [0, 1].map(() => el("ellipse", { cx: 0, cy: GY, rx: 150, ry: 12, fill: "url(#bm-sh)" }));
  [shTruck, shUnit, ...shEx].forEach(n => world.appendChild(n));
  world.appendChild(el("rect", { x: 60, y: GY - 1, width: 1480, height: 2, fill: "url(#bm-gl)" }));

  const extras = [0, 1].map(() => { const u = el("use", { href: "#bm-st", opacity: "0" }); world.appendChild(u); return u; });
  const truck = el("use", { href: "#bm-tk" }); world.appendChild(truck);
  /* the rig: cable to the hook, then a swinging group carrying the slings and
     the unit, so the load pivots about the hook exactly like a real lift */
  const rig = el("g", {}); world.appendChild(rig);
  const cable = el("line", { x1: 0, y1: -900, x2: 0, y2: 0, stroke: "#5f7386", "stroke-width": "2" });
  const hook = el("rect", { x: -9, y: -2, width: 18, height: 13, rx: 2, fill: "#8f9ba8" });
  const swing = el("g", {});
  /* slings land on the stay masts at the canopy tips — rigging to the feet
     would thread cables straight through the charging bays */
  const slings = el("path", { d: "M0 12 L-188 94 M0 12 L188 94", stroke: "#42546a", "stroke-width": "2", fill: "none" });
  const unit = el("use", { href: "#bm-st" });
  swing.appendChild(slings); swing.appendChild(unit);
  rig.appendChild(cable); rig.appendChild(hook); rig.appendChild(swing);
  stage.appendChild(svg);

  const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
  const smooth = p => p * p * (3 - 2 * p);
  const dsmooth = p => 6 * p * (1 - p);              /* smoothstep slope, for swing */
  /* the unit's local origin is 4 above its base bottom, the truck deck top sits
     at truck-local -44 — so riding the bed is GY-40, and grounded is GY+4 */
  const BED = GY - 40, LAND = GY + 4, PEAK = GY - 330, STOP = 1180, BAY = 560;
  const SLING = 300;             /* hook rides well above the canopy, not inside it */

  return p => {
    const arrive = smooth(seg(p, 0.02, 0.20));
    const hoist = smooth(seg(p, 0.24, 0.34));
    const crossR = seg(p, 0.32, 0.46), cross = smooth(crossR);
    const lower = smooth(seg(p, 0.44, 0.56));
    const leave = smooth(seg(p, 0.52, 0.66));
    const power = smooth(seg(p, 0.64, 0.78));
    const grow = smooth(seg(p, 0.80, 0.97));
    const airborne = Math.max(hoist, cross, lower) > 0.001 && lower < 0.999;

    const tx = -520 + arrive * (STOP + 520) + leave * 1500;
    /* Suspension. Braking is the second half of the arrive curve, where the
       smoothstep slope is falling, so its own derivative gives the deceleration
       directly — negative accel pitches the nose down over the front axle, and
       a decaying oscillation lets the springs settle afterwards. */
    const ar = seg(p, 0.02, 0.20);
    const accel = ar > 0 && ar < 1 ? (6 - 12 * ar) : 0;
    const bob = Math.exp(-7 * seg(p, 0.20, 0.34)) * Math.sin(seg(p, 0.20, 0.34) * 30) * (ar >= 1 ? 1 : 0);
    const pitch = -accel * 0.13 + bob * 1.5;
    const dip = bob * 2.4;
    truck.setAttribute("transform",
      "translate(" + tx + "," + (GY + dip) + ") rotate(" + pitch.toFixed(2) + ",-160,-12)");
    shTruck.setAttribute("cx", tx - 40);
    shTruck.setAttribute("opacity", String(1 - seg(p, 0.56, 0.68)));

    /* hook path: straight up off the bed, across, then straight down */
    const hx = hoist > 0 ? STOP + (BAY - STOP) * cross : tx;
    /* while still strapped down it rides the truck, suspension bob included */
    const hy = (BED + (PEAK - BED) * hoist) + (LAND - PEAK) * lower + (hoist > 0 ? 0 : dip);
    rig.setAttribute("transform", "translate(" + hx + "," + (hy - SLING) + ")");

    /* Pendulum: the load lags the hook while it accelerates, then rings down.
       Solved analytically from the traverse curve rather than integrated, so a
       scrub backwards retraces the same swing instead of drifting. */
    const vel = dsmooth(crossR) * (BAY - STOP) / 900;
    const settle = seg(p, 0.46, 0.62);
    const ring = Math.exp(-5.5 * settle) * Math.sin(settle * 26) * 2.2 * (crossR > 0 ? 1 : 0);
    /* a rigged load lags degrees, not tens of degrees — clamp keeps it honest */
    const ang = Math.max(-5, Math.min(5, (airborne ? (vel * 4 + ring) : 0))) * (1 - lower * 0.85);
    swing.setAttribute("transform", "rotate(" + ang.toFixed(2) + ")");
    unit.setAttribute("transform", "translate(0," + SLING + ")");

    cable.setAttribute("opacity", String(Math.min(seg(p, 0.20, 0.26), 1 - seg(p, 0.56, 0.64))));
    hook.setAttribute("opacity", cable.getAttribute("opacity"));
    slings.setAttribute("opacity", cable.getAttribute("opacity"));

    shUnit.setAttribute("cx", String(hx));
    shUnit.setAttribute("opacity", String(lower));

    extras.forEach((u, i) => {
      const x = BAY + (i ? 480 : -480);
      u.setAttribute("transform", "translate(" + x + "," + (LAND - (1 - grow) * 40) + ")");
      u.setAttribute("opacity", String(grow));
      shEx[i].setAttribute("cx", String(x));
      shEx[i].setAttribute("opacity", String(grow));
    });

    /* zoom out about the landed bay, panning so the finished row ends centred */
    const k = 1 - grow * 0.16;
    const wx = BAY * (1 - k) + (800 - BAY) * grow * 0.9;
    world.setAttribute("transform", "translate(" + wx + "," + (GY * (1 - k)) + ") scale(" + k + ")");
    return power;
  };
}
/* Asphalt with painted bays, drawn once. The paint sits in the texture rather
   than as line geometry so it takes light and shadow like real paint does. */
let TARMAC_TEX = null, FADE_TEX = null;
function tarmacTexture() {
  if (TARMAC_TEX) return TARMAC_TEX;
  const cv = document.createElement("canvas"); cv.width = cv.height = 1024;
  const x = cv.getContext("2d");
  /* a designed surface, not a photographed one: flat cool grey, faint tonal
     drift for depth, and crisp paint. No photoreal aggregate noise. */
  x.fillStyle = "#e7ecf1"; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    x.fillStyle = "rgba(120,140,160," + (0.012 + Math.random() * 0.022).toFixed(3) + ")";
    const s = 40 + Math.random() * 190;
    x.fillRect(Math.random() * 1024, Math.random() * 1024, s, s);
  }
  x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 6; x.lineCap = "butt";
  for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * 128, 300); x.lineTo(i * 128, 1024); x.stroke(); }
  x.beginPath(); x.moveTo(0, 300); x.lineTo(1024, 300); x.stroke();
  TARMAC_TEX = new CanvasTexture(cv); TARMAC_TEX.colorSpace = SRGBColorSpace;
  return TARMAC_TEX;
}
/* radial alpha ramp — lets the ground dissolve into the sky instead of ending
   on a hard slab edge, which is what gave the first pass its cut-out look */
function fadeTexture() {
  if (FADE_TEX) return FADE_TEX;
  const cv = document.createElement("canvas"); cv.width = cv.height = 512;
  const x = cv.getContext("2d");
  const gr = x.createRadialGradient(256, 256, 40, 256, 256, 248);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#fff");
  gr.addColorStop(0.82, "#5a5a5a"); gr.addColorStop(1, "#000");
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  FADE_TEX = new CanvasTexture(cv);
  return FADE_TEX;
}
/* Open-carpark surface: rows of painted bays either side of a drive aisle.
   Drawn on a SQUARE 52×52 world tile — square matters because the ground spins
   this texture to line the bays up with the stations, and a non-square tile
   would need an uneven repeat, which shears the grid as it rotates. */
let CARPARK_TEX = null;
const CARPARK_TILE = 52;
function carparkTexture() {
  if (CARPARK_TEX) return CARPARK_TEX;
  const N = 2048, PX = N / CARPARK_TILE;           /* px per world unit */
  /* Bay size is in METRES converted to units, not units directly. One unit is
     ~1.70m here (the CAD unit stands 2.745m in 1.61 units), so a 2.5 x 5m bay
     is 1.47 x 2.94u. The first pass used 2.6 x 5 UNITS — 4.4 x 8.5m bays with a
     22m aisle — which is exactly why the lot read as a stretch of highway. */
  const BAY_W = CARPARK_TILE / 28;                 /* 1.86u ~ 3.16m, divides the tile */
  const BAY_D = 3.7;                               /* ~6.3m deep */
  const MOD = CARPARK_TILE / 4;                    /* bay + 9.5m aisle + bay, 4 per tile */
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const x = cv.getContext("2d");
  x.fillStyle = "#d5dde6"; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 420; i++) {
    x.fillStyle = "rgba(110,130,152," + (0.03 + Math.random() * 0.035).toFixed(3) + ")";
    const s = 60 + Math.random() * 220;
    x.fillRect(Math.random() * N, Math.random() * N, s, s);
  }
  for (let m = 0; m < 4; m++) {
    const oy = m * MOD * PX, mod = MOD * PX, bd = BAY_D * PX;
    x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 5; x.lineCap = "butt";
    /* rows sit back to back across the module seam and open onto the aisle, so
       one line at the seam serves both — bays are not boxed on the open end */
    x.beginPath(); x.moveTo(0, oy); x.lineTo(N, oy); x.stroke();
    for (const [y0, y1] of [[oy, oy + bd], [oy + mod - bd, oy + mod]]) {
      for (let bx = 0; bx < N - 1; bx += BAY_W * PX) {
        x.beginPath(); x.moveTo(bx, y0); x.lineTo(bx, y1); x.stroke();
      }
    }
    /* aisle centreline dashes */
    x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 5;
    for (let bx = 0; bx < N; bx += 3.7 * PX) {
      x.beginPath(); x.moveTo(bx, oy + mod / 2); x.lineTo(bx + 1.5 * PX, oy + mod / 2); x.stroke();
    }
  }
  CARPARK_TEX = new CanvasTexture(cv); CARPARK_TEX.colorSpace = SRGBColorSpace;
  CARPARK_TEX.wrapS = CARPARK_TEX.wrapT = 1000;    /* RepeatWrapping — tiles into more bay rows */
  return CARPARK_TEX;
}
/* The centre pillar's LCD, as on the hero unit: dark glass, a charge bar and a
   chevron. Small on screen, so it reads by colour and block, not by text. */
let SCREEN_TEX = null;
function screenTexture() {
  if (SCREEN_TEX) return SCREEN_TEX;
  const W = 192, H2 = 280;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H2;
  const x = cv.getContext("2d");
  x.fillStyle = "#081726"; x.fillRect(0, 0, W, H2);
  x.strokeStyle = "#12314b"; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H2 - 6);
  /* chevron mark up top */
  x.strokeStyle = "#eaf4fb"; x.lineWidth = 13; x.lineJoin = "round"; x.lineCap = "round";
  x.beginPath(); x.moveTo(W * 0.3, H2 * 0.32); x.lineTo(W * 0.5, H2 * 0.13);
  x.lineTo(W * 0.7, H2 * 0.32); x.stroke();
  /* charge bar, most of the way across */
  x.fillStyle = "#0d2740"; x.fillRect(W * 0.16, H2 * 0.5, W * 0.68, H2 * 0.11);
  x.fillStyle = "#1fb6ff"; x.fillRect(W * 0.16, H2 * 0.5, W * 0.68 * 0.76, H2 * 0.11);
  /* three status ticks under it */
  for (let i = 0; i < 3; i++) {
    x.fillStyle = i < 2 ? "#2fbf71" : "#1c3145";
    x.fillRect(W * (0.18 + i * 0.23), H2 * 0.72, W * 0.16, H2 * 0.07);
  }
  SCREEN_TEX = new CanvasTexture(cv); SCREEN_TEX.colorSpace = SRGBColorSpace;
  return SCREEN_TEX;
}
/* One carpark ground sheet, shared by the #how stage and the stat cards.
   `size` is the square sheet's side, `far` how far back its rim sits, `yaw` the
   angle the painted bays run at so units look parked square in a bay. Repeat is
   uniform (square tile on a square sheet), so the spin never skews the grid.

   The sheet lives inside the scene group, which the cards and the stage both
   yaw as they animate. The bay grid rides along with that — it is painted on
   the ground — but the haze must not, or the horizon would swing round with
   the camera. So the alpha gets its own clone whose rotation the caller keeps
   pinned against the group yaw via faceHaze(). */
function carparkGround(size, far, yaw, y, gone, solid) {
  const tex = carparkTexture().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = 1000;
  tex.repeat.set(size / CARPARK_TILE, size / CARPARK_TILE);
  tex.center.set(0.5, 0.5);
  tex.rotation = -yaw;                             /* UVs spin one way, image the other */
  tex.anisotropy = 8;                              /* bay lines stay crisp at grazing angles */
  const fade = hazeTexture(gone, solid).clone();
  fade.needsUpdate = true; fade.center.set(0.5, 0.5);
  const m = new Mesh(new PlaneGeometry(size, size), std(0xffffff, 0.9, 0.03, {
    map: tex, alphaMap: fade, transparent: true, depthWrite: false
  }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, y, far + size / 2);            /* near rim ends up behind the camera */
  m.receiveShadow = true;
  m.userData.fade = fade;
  return m;
}
/* keep a ground sheet's haze pointing away from camera whatever the group does */
function faceHaze(ground, groupYaw) { ground.userData.fade.rotation = groupYaw; }
/* The stat cards all share one camera (fov 30 at z 7.9). A plane's vanishing
   line sits at tan(pitch)/tan(fov/2) of the frame's half-height, so anything
   under 0.262rad leaves sky at the top of the card; 0.30 puts it just above the
   frame and the lot fills to the edge. The haze also runs late here — solid out
   to ~60 units, gone by ~130 — so that edge still carries visible tarmac rather
   than washing to white before it gets there. */
const CARD_TILT = 0.30;
const cardGround = (yaw, y) => carparkGround(200, -150, yaw, y, 0.10, 0.45);
/* Alpha ramp for a carpark that runs all the way out to its vanishing line.
   The plane is deep enough that its far rim sits within a few pixels of the
   horizon, and the haze band is placed well short of that rim, so the tarmac
   dissolves into distance instead of ever showing a cut edge. GRAD_* are
   fractions of the plane's depth measured from the far rim (canvas top). */
const HAZE_TEX = new Map();
const GRAD_GONE = 0.24, GRAD_SOLID = 0.65;
function hazeTexture(gone, solid) {
  const g0 = gone == null ? GRAD_GONE : gone, s0 = solid == null ? GRAD_SOLID : solid;
  const key = g0 + "|" + s0;
  if (HAZE_TEX.has(key)) return HAZE_TEX.get(key);
  const N = 512;
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const x = cv.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, N, N);
  /* canvas top = far side of the plane once it is laid flat */
  const hz = x.createLinearGradient(0, N * g0, 0, N * s0);
  hz.addColorStop(0, "#000"); hz.addColorStop(0.35, "#3a3a3a");
  hz.addColorStop(0.7, "#b4b4b4"); hz.addColorStop(1, "#fff");
  x.fillStyle = "#000"; x.fillRect(0, 0, N, N * g0);
  x.fillStyle = hz; x.fillRect(0, N * g0, N, N * (s0 - g0));
  const t = new CanvasTexture(cv);
  HAZE_TEX.set(key, t);
  return t;
}

/* The #how sequence in real 3D: the same CAD station and truck as the rest of
   the site, driven by the pinned scroll clock. Same choreography as the 2D
   pass — arrive, hoist/cross/lower with pendulum lag, depart, power, scale. */
function howScene3D(app) {
  const seg = (k, a, b) => Math.max(0, Math.min(1, (k - a) / (b - a)));
  const smooth = p => p * p * (3 - 2 * p);
  const dsmooth = p => 6 * p * (1 - p);
  const g = new Group(); app.s.add(g);
  /* Pitch sets where the ground's vanishing line lands, and everything above it
     renders as blank sky. At 0.16 the horizon sat 20% down from the canvas top,
     leaving a dead band that read as a gap under the section's intro copy. 0.21
     lifts it to ~10% — the only lever for this, since camera height does not
     move a horizon, only pitch does. */
  g.rotation.x = 0.21;

  /* Carpark running out to its own vanishing line: a 230-deep sheet reaches
     within a few pixels of it, and the alpha haze has already taken the tarmac
     to nothing by then. Near and side rims sit outside the frustum, so no edge
     of the sheet is ever on screen. */
  const SET_YAW = 1.0;                            /* the yaw a unit ends up parked at */
  const ground = carparkGround(260, -200, SET_YAW, -1.35);
  g.add(ground);

  /* wider shadow frustum than the cards: the truck travels a long way */
  app.s.children.forEach(o => {
    if (o.isDirectionalLight && o.castShadow) {
      const c = o.shadow.camera;
      c.left = -12; c.right = 12; c.top = 8; c.bottom = -8; c.far = 40;
      c.updateProjectionMatrix();
    }
  });

  const S = 0.62;
  const trWrap = new Group(); trWrap.position.y = -0.37; g.add(trWrap);   /* wheels onto ground */
  const tr = tTruck(trWrap);
  const DECK_W = -0.73;                       /* deck top, world (raised bed) */
  const FEET = 1.35 * S;
  const BED_Y = DECK_W + FEET, LAND_Y = -1.35 + FEET;
  const LOAD_OFF = -0.55, STOP = 1.9, BAY = -2.6, PEAK = BED_Y + 1.5;

  /* Rigging that actually carries the load: the cable and hook stay vertical,
     and a swing group pivoting AT the hook holds slings + station together —
     so the pendulum tilts the whole hang, never the unit under fixed lines. */
  const HOOK = 2.0;
  const rig = new Group(); g.add(rig);
  const hook = new Mesh(new BoxGeometry(0.26, 0.18, 0.26), std(0x9aa6b2, 0.5, 0.7));
  hook.position.y = 0.03; rig.add(hook);
  const rigMat = std(0x2a3a4e, 0.55, 0.45); rigMat.transparent = true; rigMat.opacity = 0;
  const cableMat = std(0x2a3a4e, 0.55, 0.45); cableMat.transparent = true; cableMat.opacity = 0;
  /* Slings as real geometry, not hairlines: 1px LineSegments break up under
     antialiasing at this scale, which read as snapped cables and left the load
     looking unsupported. `rope` lays a thin cylinder from A to B — build it
     along +Z so a yaw/pitch pair aims it, no Vector3/Quaternion needed. */
  const rope = (parent, ax, ay, az, bx, by, bz, r, mat) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const len = Math.hypot(dx, dy, dz);
    const geo = new CylinderGeometry(r, r, len, 7);
    const m = new Mesh(geo, mat);
    m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    /* cylinder runs along +Y: tilt it off vertical, then swing it round */
    m.rotation.set(0, -Math.atan2(dz, dx), -Math.atan2(Math.hypot(dx, dz), dy));
    m.castShadow = true; parent.add(m);
    return m;
  };
  rope(rig, 0, 0.1, 0, 0, 12, 0, 0.028, cableMat);        /* fall to the (unseen) jib */
  const swing = new Group(); rig.add(swing);
  const TOP = -HOOK + 1.25 * S;                            /* canopy top, in swing space */
  for (const x of [-1.45, 1.45]) for (const z of [-1.05, 1.05]) {
    rope(swing, 0, -0.02, 0, x, TOP, z, 0.02, rigMat);
    /* a shackle where each leg lands, so the sling visibly grips the unit */
    const sh = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), rigMat);
    sh.position.set(x, TOP - 0.03, z); swing.add(sh);
  }
  const unit = new Group(); unit.position.set(0, -HOOK, 0); swing.add(unit);
  const st = tStation(unit, S);

  /* the under-canopy lamp for power-on */
  const lamp = new Mesh(new PlaneGeometry(2.6, 1.6), new MeshBasicMaterial({
    color: 0xbfe4ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  lamp.rotation.x = -Math.PI / 2; lamp.position.y = 0.3; unit.add(lamp);

  /* Centre-pillar LCD, same place the hero unit carries it. One on each broad
     face so it reads whichever way the crane has slewed the unit. Sits on the
     PILLAR face, not the canopy line — measured off the CAD, the centre pillar
     only reaches z +0.626/-0.592 while the canopy overhangs to ±2.03. */
  const pillarScreens = (parent, op) => [[-0.592, -1], [0.626, 1]].map(([fz, sz]) => {
    const scr = new Mesh(new PlaneGeometry(0.2, 0.28), new MeshBasicMaterial({
      map: screenTexture(), transparent: true, opacity: op }));
    scr.position.set(0, -0.06, fz * S + sz * 0.006);
    scr.rotation.y = sz > 0 ? 0 : Math.PI;
    parent.add(scr); return scr;
  });
  const screens = pillarScreens(unit, 0);

  /* Bikes on charge once the site is live: four to a side, nosed into the bays
     between the pillars. Same GLB the hero uses, so they match everywhere. The
     GLB decodes later than the station STLs, hence the late-swap retry. */
  const bikeRow = (parent, mats) => {
    for (const sz of [-1, 1]) for (const bx of [-1.25, -0.42, 0.42, 1.25]) {
      const b = HERO_KIT.bike.clone(true);
      b.traverse(o => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          m.transparent = true; mats.push([m, m.opacity]);
        });
        o.castShadow = true; o.receiveShadow = true;
      });
      const w = new Group(); w.add(b);
      w.scale.setScalar(0.57);                       /* ~1.1m bike against a 2.7m unit */
      /* wheels down on the unit's foot line; z tucks the front wheel just
         inside the bay opening rather than parking it out on the tarmac */
      w.position.set(bx, -1.35 * S, sz * 1.5);
      /* GLB wheelbase runs along X (bbox 1.67 x 1.15 x 0.77), so a quarter turn
         points each row at the unit — nose to the sockets, as if on charge */
      w.rotation.y = sz > 0 ? -Math.PI / 2 : Math.PI / 2;
      parent.add(w);
    }
  };
  const bikeHost = new Group(); unit.add(bikeHost);
  const bikeMats = [];

  /* The two units that join when the site scales — each with its own rows of
     bikes. A unit plus its bikes measures 3.33 along its length and 3.95 across
     (the bikes stick out well past the pillars); yawed 1.0rad that projects to
     2.56 either side of centre on X, so anything under ~5.1 apart has the
     neighbouring rows interpenetrating. Hence 5.3, and the group pulls back a
     touch on the scale beat to keep the wider spread inside frame. */
  const BAY_PITCH = 5.3;
  const extras = [-1, 1].map(dir => {
    const e = new Group(); e.position.x = BAY + dir * BAY_PITCH; e.rotation.y = 1.0; g.add(e);
    tStation(e, S);
    /* these arrive already live, so their screens are lit from the off — the
       traverse below picks the material up and fades it in with the unit */
    pillarScreens(e, 1);
    const mats = [];
    e.traverse(o => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        m.transparent = true; mats.push([m, m.opacity]);
      });
    });
    return { g: e, mats };
  });

  /* bikes for all three, once the GLB is in — it decodes later than the station
     STLs, so this also swaps in late if the scene happened to build first */
  const addBikes = () => {
    if (!HERO_KIT.bike || bikeHost.children.length) return false;
    bikeRow(bikeHost, bikeMats);
    extras.forEach(e => bikeRow(e.g, e.mats));
    return true;
  };
  if (!addBikes()) {
    const bi = setInterval(() => { if (addBikes()) clearInterval(bi); }, 500);
    setTimeout(() => clearInterval(bi), 30000);
  }
  const setFade = (mats, v) => { for (const m of mats) m[0].opacity = m[1] * v; };

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  ground.castShadow = false; lamp.castShadow = false;

  return p => {
    const arrive = smooth(seg(p, 0.02, 0.20));
    const hoist = smooth(seg(p, 0.24, 0.34));
    const crossR = seg(p, 0.32, 0.46), cross = smooth(crossR);
    const lower = smooth(seg(p, 0.44, 0.56));
    const leave = smooth(seg(p, 0.52, 0.66));
    const power = smooth(seg(p, 0.62, 0.78));
    const grow = smooth(seg(p, 0.80, 0.97));
    const airborne = Math.max(hoist, cross, lower) > 0.001 && lower < 0.999;

    /* the truck: in from the left, brake dip, out to the right once unloaded */
    const ar = seg(p, 0.02, 0.20);
    const accel = ar > 0 && ar < 1 ? (6 - 12 * ar) : 0;
    const bob = Math.exp(-7 * seg(p, 0.20, 0.30)) * Math.sin(seg(p, 0.20, 0.30) * 30) * (ar >= 1 ? 1 : 0);
    const tx = -16 + arrive * (STOP + 16) + leave * 22;
    tr.g.position.x = tx;
    tr.g.position.y = bob * 0.03;
    tr.g.rotation.z = accel * 0.006 + bob * 0.012;
    for (const [hubG, r] of tr.wheels) hubG.rotation.z = -tx / r;

    /* the unit rides the bed, is hoisted, crosses, lands beside the truck —
       all through the rig, whose swing pivots at the hook */
    const ux = airborne || lower >= 0.999 ? (STOP + LOAD_OFF) + (BAY - STOP - LOAD_OFF) * cross : tx + LOAD_OFF;
    const uy = (BED_Y + (PEAK - BED_Y) * hoist) + (LAND_Y - PEAK) * lower + (airborne ? 0 : bob * 0.03);
    rig.position.set(ux, uy + HOOK, 0);
    /* pendulum: lags the traverse, rings down, clamped to honest degrees */
    const vel = dsmooth(crossR) * (BAY - STOP) / 10;
    const settle = seg(p, 0.46, 0.62);
    const ring = Math.exp(-5.5 * settle) * Math.sin(settle * 26) * 0.035 * (crossR > 0 ? 1 : 0);
    swing.rotation.z = airborne ? Math.max(-0.08, Math.min(0.08, vel * 0.05 + ring)) * (1 - lower * 0.85) : 0;
    /* the crane slews the load as it lowers, so it lands three-quarter on —
       emblem face showing — instead of parallel to the lens */
    unit.rotation.y = Math.max(cross, lower) * 1.0;

    /* solid rope geometry, so it carries full opacity — the old hairlines were
       held at 0.7 and that translucency was half of why they read as broken */
    const rigVis = Math.min(seg(p, 0.20, 0.26), 1 - seg(p, 0.54, 0.62));
    rigMat.opacity = rigVis; cableMat.opacity = rigVis * 0.9;
    hook.visible = rigVis > 0.02;

    lamp.material.opacity = 0.4 * power;
    /* the site comes alive: screens light, bikes are on charge */
    screens.forEach(s => s.material.opacity = power);
    bikeHost.visible = power > 0.01;
    setFade(bikeMats, power);
    extras.forEach(e => {
      setFade(e.mats, grow);
      e.g.visible = grow > 0.01;
      /* they simply fade up in place — a descent read as the bikes being flown
         in on the crane too, which is not what scaling a site looks like */
      e.g.position.y = LAND_Y;
    });

    /* a stronger base angle keeps the truck and the bay grid reading in
       perspective; the unit's own slew handles showing the emblem */
    g.rotation.y = -0.5 + p * 0.4;
    faceHaze(ground, g.rotation.y);   /* bays turn with the lot, haze stays with the lens */
    /* three units at 5.3 pitch span ~12 across, so ease back as they arrive */
    g.position.x = grow * 1.9;
    g.scale.setScalar(1 - grow * 0.24);
    app.c.position.z = 13.4 + grow * 3.2;
    return p;
  };
}

function mountHow() {
  const sec = document.querySelector("#how");
  if (!sec) return false;
  if (sec.querySelector(".bm-how-scroll, .bm-how-still")) return true;
  /* same gate as the cards: wait briefly for the CAD kit so the sequence uses
     the real model; past the deadline the procedural fallback builds instead */
  if (!HERO_KIT.station) {
    loadHeroKit();
    if (Date.now() - HERO_KIT.t0 < 15000 && !HERO_KIT.err) return false;
  }
  const grid = sec.querySelector('div[class*="grid-cols-4"]');
  if (!grid || grid.children.length < 4) return false;
  const stepsRow = grid.closest('div[class*="md:block"]') || grid.parentElement;
  if (!stepsRow || !stepsRow.parentNode) return false;

  const scroll = document.createElement("div"); scroll.className = "bm-how-scroll";
  const sticky = document.createElement("div"); sticky.className = "bm-how-sticky";
  const stage = document.createElement("div"); stage.className = "bm-how-stage";
  stepsRow.parentNode.insertBefore(scroll, stepsRow);
  scroll.appendChild(sticky); sticky.appendChild(stage); sticky.appendChild(stepsRow);
  /* the bundle ships two step lists — a 4-across row for md+ and a stacked one
     below it. Pull the second into the pin as well, so the mobile scrub lights
     its beats the same way; each is display:none at the other's breakpoint. */
  const mobRow = [...sec.querySelectorAll('div[class*="md:hidden"]')]
    .find(d => d.querySelectorAll("h3").length >= 4);
  if (mobRow) sticky.appendChild(mobRow);

  const app = makeApp(stage, 960, 540, 30, 13.4, { shadows: true });
  const setProgress = howScene3D(app);
  const fit = () => {
    const w = stage.clientWidth || 960, h = stage.clientHeight || 540;
    if (!w || !h) return;
    app.r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    app.r.setSize(w, h, false); app.c.aspect = w / h; app.c.updateProjectionMatrix();
  };
  fit(); new ResizeObserver(fit).observe(stage);
  app.update = () => { };

  /* Mobile keeps the section heading on screen through the scrub: the heading
     block becomes sticky at 0 and the scene pins directly under it. Its height
     is measured rather than guessed, since the copy rewraps by width. */
  const head = scroll.previousElementSibling;
  const syncHead = () => {
    const narrow = matchMedia("(max-width: 767px)").matches;
    if (!head) return;
    head.classList.toggle("bm-how-head", narrow);
    sticky.style.top = narrow ? head.offsetHeight + "px" : "";
  };
  syncHead();
  addEventListener("resize", syncHead);

  /* both lists get marked up and lit; only one is visible at any breakpoint */
  const mobSteps = mobRow ? [...mobRow.children].filter(c => c.querySelector("h3")) : [];
  const steps = [...grid.children];
  [...steps, ...mobSteps].forEach(s => s.classList.add("bm-hstep"));
  let active = -1;
  const setActive = i => {
    if (i === active) return;
    active = i;
    steps.forEach((s, n) => s.classList.toggle("bm-on", n === i));
    mobSteps.forEach((s, n) => s.classList.toggle("bm-on", n === i));
  };
  setActive(0);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* driven by scroll rather than a free-running rAF: rAF only coalesces bursts,
     so nothing spins while the reader is still */
  const update = () => {
    /* mobile scrubs too now; only reduced-motion holds a single frame */
    if (REDUCED) { setProgress(0.72); setActive(2); return; }
    const span = scroll.offsetHeight - sticky.offsetHeight;
    if (span <= 0) return;
    /* the pin engages once the container reaches the sticky's own top offset —
       0 on desktop, the heading's height on mobile — so measure progress from
       there rather than from the viewport edge */
    const t0 = parseFloat(getComputedStyle(sticky).top) || 0;
    const p = clamp((t0 - scroll.getBoundingClientRect().top) / span, 0, 1);
    setActive(clamp(Math.floor(p * HOW_BEATS), 0, HOW_BEATS - 1));
    setProgress(p);
  };
  let queued = false, live = false;
  const request = () => {
    if (queued || !live) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  new IntersectionObserver(es => es.forEach(e => { live = e.isIntersecting; if (live) update(); }),
    { rootMargin: "300px" }).observe(scroll);
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  /* lets the scrub be stepped directly where rAF is suspended (hidden tab) */
  scroll.addEventListener("bm-how-sync", update);
  /* Still export: renders the scene at a given progress through a throwaway
     context, synchronously — works even while rAF is suspended. */
  stage.addEventListener("bm-how-shot", ev => {
    const d = ev.detail || {}, w = d.w || 1600, h = Math.round(w * 9 / 16);
    const r2 = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r2.setPixelRatio(1); r2.setSize(w, h, false);
    r2.outputColorSpace = SRGBColorSpace; r2.toneMapping = 4; r2.toneMappingExposure = 1.05;
    r2.shadowMap.enabled = true; r2.shadowMap.type = 1;
    const keep = app.c.aspect;
    setProgress(d.p || 0);
    app.c.aspect = w / h; app.c.updateProjectionMatrix();
    r2.render(app.s, app.c);
    d.out = r2.domElement.toDataURL("image/png");
    r2.forceContextLoss(); r2.dispose();
    app.c.aspect = keep; app.c.updateProjectionMatrix();
    update();
  });
  update();
  return true;
}

/* The record section ships a heading with nothing under it, while every other
   section on the page carries a line of context below its h2. Match them. */
function mountRecordIntro() {
  const rec = document.querySelector("#record");
  if (!rec) return false;
  const h = rec.querySelector("h2");
  if (!h) return false;
  if (h.parentElement.querySelector(".bm-recsub")) return true;
  const p = document.createElement("p");
  p.className = "bm-recsub mt-3.5 text-intro text-gray-600 md:mt-5";
  p.textContent = "What a T Station does once it is on the ground: how fast it deploys, "
    + "how long it lasts, how quickly it charges, and how easily it moves.";
  h.insertAdjacentElement("afterend", p);
  return true;
}

function mountPoster() {
  /* scope to the Watch section: #how now injects its own videos ABOVE this one
     in document order, and a bare querySelector("video") would dress those */
  const v = document.querySelector('section[aria-label="Introduction video"] video')
    || document.querySelector("video:not([data-bm-how])");
  if (!v) return false;
  if (v.dataset.bmPoster) return true;
  v.poster = "/images/solutions/on-the-move.webp";
  v.dataset.bmPoster = "1";
  /* proper thumbnail furniture: a left scrim carrying the title, one line of
     context and a duration chip — it disappears the moment playback starts */
  const stage = v.parentElement;
  if (stage && !stage.querySelector(".bm-vmeta")) {
    getComputedStyle(stage).position === "static" && (stage.style.position = "relative");
    const meta = document.createElement("div");
    meta.className = "bm-vmeta";
    meta.innerHTML =
      '<span class="bm-vlabel"><i></i>Teask film</span>' +
      '<span class="bm-vtitle">Power that arrives<br>on a flatbed.</span>' +
      '<span class="bm-vsub">It leaves the yard charged and is serving on site in under 30 minutes. No trenching, no substation, no permits queue.</span>' +
      '<span class="bm-vcta">' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L19 12z"/></svg>' +
        'Watch the film' +
        '<em>02:14</em>' +
      '</span>';
    stage.appendChild(meta);
    const hide = () => stage.classList.add("bm-playing");
    v.addEventListener("play", hide);
    v.addEventListener("playing", hide);
  }
  return true;
}


/* a real footer: brand column + navigation columns alongside the contact block.
   Layout is set inline — class rules were being lost to the bundle's cascade. */
const FOOT_NAV = [
  ["Company", [["Home", "/"], ["About", "/about"], ["Contact", "/contact"]]],
  ["Product", [["Solutions", "/solutions"], ["The T Station", "/#product"], ["How it works", "/#how"]]],
  ["Resources", [["Resources", "/resources"], ["Projects", "/#projects"], ["FAQ", "/#faq"]]]
];
function mountFooter() {
  const f = document.querySelector("footer");
  if (!f || !f.children[1]) return false;
  const row = f.children[1].querySelector(":scope > div");
  if (!row) return false;
  if (row.querySelector(".bm-fnav")) return true;

  const addr = row.children[0];
  if (addr && !row.querySelector(".bm-fbrand")) {
    const brand = document.createElement("div");
    brand.className = "bm-fbrand";
    brand.style.cssText = "margin-bottom:26px;max-width:34ch";
    const logo = document.createElement("img");
    logo.src = "/brand/teask-logo-hd.png"; logo.alt = "Teask";
    logo.style.cssText = "height:34px;width:auto;display:block;margin-bottom:16px";
    const line = document.createElement("p");
    line.textContent = "Portable solar power and EV charging that deploys anywhere in under 30 minutes, with or without the grid.";
    line.style.cssText = "font-size:13.5px;line-height:1.7;color:rgba(5,7,14,.6);margin:0";
    brand.appendChild(logo); brand.appendChild(line);
    addr.insertBefore(brand, addr.firstChild);
  }

  const nav = document.createElement("div");
  nav.className = "bm-fnav";
  nav.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));" +
    "column-gap:clamp(16px,2vw,40px);row-gap:30px;align-items:start";
  FOOT_NAV.forEach(([head, links]) => {
    const col = document.createElement("div");
    col.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:11px;min-width:0";
    const h = document.createElement("span");
    h.textContent = head;
    h.style.cssText = "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;" +
      "letter-spacing:.2em;text-transform:uppercase;color:rgba(5,7,14,.45);margin-bottom:3px;display:block";
    col.appendChild(h);
    links.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href; a.textContent = label;
      a.style.cssText = "font-size:13.5px;line-height:1.35;color:rgba(5,7,14,.72);text-decoration:none;" +
        "display:block;white-space:nowrap;transition:color .2s";
      a.addEventListener("mouseenter", () => a.style.color = "#0084d6");
      a.addEventListener("mouseleave", () => a.style.color = "rgba(5,7,14,.72)");
      col.appendChild(a);
    });
    nav.appendChild(col);
  });
  row.insertBefore(nav, row.children[1] || null);
  return true;
}

function boot() {
  diagramShim();
  const tick = () => {
    const done = [mountRecord(), mountRecordIntro(), mountTech(), mountFaq(), mountHeaderIcons(), mountStepIcons(), mountDiagramIcons(), mountPoster(), mountFooter(), mountHow()].every(Boolean);
    if (!done) setTimeout(tick, 900);
  };
  tick();
  /* React re-renders can drop injected nodes; re-mount opportunistically */
  const tidyGrid = () => {
    document.querySelectorAll("#grid *").forEach(el => {
      if (el.children.length === 0 && /^0\s?[1-3]$/.test((el.textContent || "").trim())) el.style.display = "none";
    });
  };
  tidyGrid();
  setInterval(() => { mountRecord(); mountRecordIntro(); mountHeaderIcons(); mountStepIcons(); mountDiagramIcons(); mountPoster(); mountFooter(); tidyGrid(); }, 4000);
}
document.readyState === "loading" ? addEventListener("DOMContentLoaded", boot) : boot();
