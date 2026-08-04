/**
 * The T Station's energy path, drawn as an isometric schematic.
 *
 * Why a drawing and not the 3D model: the model is seven structural parts —
 * canopy, wings, cables, hinges, legs, bracing, base. It holds no battery and no
 * controller, because those sit sealed inside the cabinet and were never
 * modelled. Flying a camera to them would frame a closed box. A schematic can
 * put them on the page as objects in their own right, and can draw the trading
 * layer as an intention rather than a fitting.
 *
 * The station itself follows the fabrication set rather than being a generic
 * carport: a dual-pitch canopy with a raised centre spine and a deep overhang
 * each side, carried on two graphite cabinets braced at mid height, with the
 * mark on the cabinet face where it actually sits.
 *
 * Everything is placed in one world space and projected once, so the objects
 * share a horizon and the arrows between them land on real anchors. +x runs
 * right and up, +z right and down, y is vertical.
 *
 * Restrained on purpose. The obvious reference for this kind of diagram is the
 * consumer solar illustration — red arrows, a cartoon house, hand-lettering.
 * That would undercut a deep-tech brand, so the palette stays the site's own and
 * only the active leg of the circuit carries colour.
 */

const KX = 0.866
const KY = 0.5
const OX = 150
const OY = 150

const BLUE = '#0084d6'
const SOLAR = '#f2a93b'

/** world → screen. yUp is height; negative goes down toward the ground. */
const P = (xu: number, zu: number, yUp = 0): [number, number] => [
  OX + (xu + zu) * KX,
  OY - xu * KY + zu * KY - yUp,
]

// ── the unit, in schematic units ────────────────────────────────────
const CANOPY_W = 170
const CANOPY_D = 88
const RIDGE_Z = CANOPY_D / 2
const RISE = 38 // shallow pitch: enough to read as two wings, not a tent
const CAB_W = 38
const CAB_D = 52
const CAB_H = 64
const CAB_Z = 18
const CAB_A = 26 // near cabinet, along x
const CAB_B = 106 // far cabinet
const GROUND = -70

const pts = (list: [number, number][]) => list.map((p) => `${p[0]},${p[1]}`).join(' ')

/** a box in world space, showing its top and the two faces turned to us */
function WBox({
  xu,
  zu,
  w,
  d,
  yTop,
  h,
  top,
  right,
  left,
  stroke = 'rgba(5,7,14,0.3)',
}: {
  xu: number
  zu: number
  w: number
  d: number
  yTop: number
  h: number
  top: string
  right: string
  left: string
  stroke?: string
}) {
  const yb = yTop - h
  const A = P(xu, zu, yTop)
  const B = P(xu + w, zu, yTop)
  const C = P(xu + w, zu + d, yTop)
  const D = P(xu, zu + d, yTop)
  const Cb = P(xu + w, zu + d, yb)
  const Db = P(xu, zu + d, yb)
  const Bb = P(xu + w, zu, yb)
  return (
    <g stroke={stroke} strokeWidth="1" strokeLinejoin="round">
      <polygon points={pts([D, C, Cb, Db])} fill={left} />
      <polygon points={pts([C, B, Bb, Cb])} fill={right} />
      <polygon points={pts([A, B, C, D])} fill={top} />
    </g>
  )
}

function Flow({ d, on, dashed = false }: { d: string; on: boolean; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={on ? BLUE : 'rgba(5,7,14,0.22)'}
      strokeWidth={on ? 2.4 : 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '5 5' : undefined}
      className={on ? 'cut-flow' : undefined}
      markerEnd="url(#flowhead)"
    />
  )
}

export type CutawayStage = 0 | 1 | 2 | 3

export default function StationCutaway({ active }: { active: CutawayStage }) {
  const solarOn = active === 0
  const battOn = active === 1
  const ctrlOn = active === 2
  const tradeOn = active === 3

  const cabinet = { top: '#39404e', right: '#242a34', left: '#171c23' }
  const pale = { top: '#eef1f5', right: '#d3dae3', left: '#bcc5d1' }
  const litBox = { top: '#d3e9f9', right: '#96c9ee', left: '#6cb0df' }

  return (
    <svg
      viewBox="0 0 560 400"
      className="h-auto w-full"
      role="img"
      aria-label="Isometric schematic of the T Station's energy path: sunlight into the canopy's photovoltaic array, down into the on-board battery, through the smart-grid controller, then out to EV charging and to a grid tie where one exists, with peer-to-peer and VPPA trading on the roadmap."
    >
      <defs>
        <marker
          id="flowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 1 L9 5 L0 9 z" fill="context-stroke" />
        </marker>
      </defs>

      {/* ── the sun ─────────────────────────────────────────────── */}
      <g opacity={solarOn ? 1 : 0.36}>
        <circle cx="52" cy="44" r="13" fill={solarOn ? SOLAR : 'rgba(242,169,59,0.4)'} />
        {Array.from({ length: 8 }, (_, k) => (
          <line
            key={k}
            x1="52"
            y1="24"
            x2="52"
            y2="18"
            stroke={solarOn ? SOLAR : 'rgba(242,169,59,0.45)'}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${k * 45} 52 44)`}
          />
        ))}
      </g>
      <g className={solarOn ? 'cut-beam' : undefined} opacity={solarOn ? 1 : 0.1}>
        {[
          [70, 56, 176, 122],
          [80, 42, 214, 104],
          [90, 30, 252, 88],
        ].map(([x1, y1, x2, y2], k) => (
          <line
            key={k}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={SOLAR}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="8 6"
          />
        ))}
      </g>

      {/* ── ground shadow, on the canopy's true footprint ───────── */}
      <polygon
        points={pts([
          P(0, 0, GROUND),
          P(CANOPY_W, 0, GROUND),
          P(CANOPY_W, CANOPY_D, GROUND),
          P(0, CANOPY_D, GROUND),
        ])}
        fill="rgba(5,7,14,0.055)"
      />

      {/* ── cabinets, braced ────────────────────────────────────── */}
      {[CAB_A, CAB_B].map((xu, i) => (
        <g key={i}>
          <WBox xu={xu} zu={CAB_Z} w={CAB_W} d={CAB_D} yTop={-6} h={CAB_H} {...cabinet} />
          {/* the cabinet is a stack of modules, not one slab */}
          {[0.34, 0.64].map((t, k) => {
            const a = P(xu, CAB_Z + CAB_D, -6 - CAB_H * t)
            const b = P(xu + CAB_W, CAB_Z + CAB_D, -6 - CAB_H * t)
            return (
              <line
                key={k}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
              />
            )
          })}
        </g>
      ))}
      <WBox
        xu={CAB_A + CAB_W}
        zu={CAB_Z + 16}
        w={CAB_B - CAB_A - CAB_W}
        d={14}
        yTop={-6 - CAB_H * 0.44}
        h={8}
        top="#434b5a"
        right="#2a313c"
        left="#1d232b"
      />

      {/* ── the two canopy wings, meeting at a raised ridge ─────── */}
      {[
        {
          quad: [P(0, 0), P(CANOPY_W, 0), P(CANOPY_W, RIDGE_Z, RISE), P(0, RIDGE_Z, RISE)],
          fill: solarOn ? '#b6d9f2' : '#d6dce5',
        },
        {
          quad: [
            P(0, RIDGE_Z, RISE),
            P(CANOPY_W, RIDGE_Z, RISE),
            P(CANOPY_W, CANOPY_D),
            P(0, CANOPY_D),
          ],
          fill: solarOn ? '#dcedfb' : '#eff2f6',
        },
      ].map((wing, i) => (
        <polygon
          key={i}
          points={pts(wing.quad as [number, number][])}
          fill={wing.fill}
          stroke="rgba(5,7,14,0.32)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      ))}

      {/* PV cells, running with each wing's own slope */}
      <g opacity={solarOn ? 1 : 0.5}>
        {[0, CANOPY_D].map((edgeZ, w) =>
          Array.from({ length: 11 }, (_, k) => {
            const xu = (CANOPY_W * (k + 1)) / 12
            const a = P(xu, edgeZ)
            const b = P(xu, RIDGE_Z, RISE)
            return (
              <line
                key={`${w}-${k}`}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={solarOn ? BLUE : 'rgba(5,7,14,0.2)'}
                strokeWidth="0.85"
              />
            )
          }),
        )}
        {[0.45, 1.55].map((m, k) => {
          const zu = RIDGE_Z * m
          const y = RISE * (1 - Math.abs(1 - m))
          const a = P(0, zu, y)
          const b = P(CANOPY_W, zu, y)
          return (
            <line
              key={`s${k}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={solarOn ? BLUE : 'rgba(5,7,14,0.2)'}
              strokeWidth="0.85"
            />
          )
        })}
      </g>

      {/* ridge spine */}
      <WBox
        xu={0}
        zu={RIDGE_Z - 4}
        w={CANOPY_W}
        d={8}
        yTop={RISE + 4}
        h={5}
        top="#464e5d"
        right="#2c333e"
        left="#1e242c"
      />

      {/* the mark, on the cabinet face */}
      {(() => {
        const c = P(CAB_B + CAB_W * 0.45, CAB_Z + CAB_D, -6 - CAB_H * 0.52)
        return (
          <g transform={`translate(${c[0]} ${c[1]})`}>
            <path d="M5 0 L10 8 L7.4 8 L5 3.8 L2.6 8 L0 8 Z" fill="#eef3f9" />
            <path d="M5 7.2 L8 11.6 L5 17.6 L2 11.6 Z" fill={BLUE} />
          </g>
        )
      })()}

      <text
        x="152"
        y="118"
        fontSize="8.5"
        letterSpacing="2"
        fill={solarOn ? BLUE : 'rgba(5,7,14,0.45)'}
      >
        BIFACIAL PV CANOPY
      </text>

      {/* ── battery ─────────────────────────────────────────────── */}
      <g>
        <WBox
          xu={-112}
          zu={72}
          w={38}
          d={36}
          yTop={-40}
          h={30}
          {...(battOn ? litBox : pale)}
        />
        {Array.from({ length: 3 }, (_, k) => {
          const a = P(-112 + 6 + k * 11, 72 + 36, -52)
          return (
            <rect
              key={k}
              x={a[0]}
              y={a[1] - 6}
              width="7"
              height="11"
              fill={battOn ? BLUE : 'rgba(5,7,14,0.2)'}
              opacity={battOn ? 1 - k * 0.22 : 1}
            />
          )
        })}
        <text x="96" y="330" fontSize="9" letterSpacing="1.8" fill={battOn ? BLUE : 'rgba(5,7,14,0.6)'}>
          BATTERY
        </text>
        <text x="96" y="341" fontSize="7.5" letterSpacing="1.2" fill="rgba(5,7,14,0.34)">
          ON BOARD
        </text>
      </g>

      {/* ── controller ──────────────────────────────────────────── */}
      <g>
        <WBox xu={16} zu={152} w={38} d={34} yTop={-44} h={26} {...(ctrlOn ? litBox : pale)} />
        {Array.from({ length: 2 }, (_, r) =>
          Array.from({ length: 3 }, (_, c) => {
            const a = P(16 + 6 + c * 10, 152 + 34, -54 - r * 8)
            return (
              <rect
                key={`${r}-${c}`}
                x={a[0]}
                y={a[1] - 5}
                width="6.5"
                height="5"
                fill={ctrlOn ? BLUE : 'rgba(5,7,14,0.22)'}
              />
            )
          }),
        )}
        <text x="268" y="318" fontSize="9" letterSpacing="1.8" fill={ctrlOn ? BLUE : 'rgba(5,7,14,0.6)'}>
          SMART-GRID CONTROLLER
        </text>
      </g>

      {/* ── EV charging ─────────────────────────────────────────── */}
      <g>
        <WBox xu={148} zu={122} w={56} d={32} yTop={-50} h={18} {...pale} />
        <WBox xu={160} zu={130} w={30} d={22} yTop={-36} h={12} {...pale} />
        <text x="392" y="238" fontSize="9" letterSpacing="1.8" fill="rgba(5,7,14,0.6)">
          EV CHARGING
        </text>
        <text x="392" y="249" fontSize="7.5" letterSpacing="1.2" fill="rgba(5,7,14,0.34)">
          FAST, ON SITE
        </text>
      </g>

      {/* ── grid tie ────────────────────────────────────────────── */}
      <g opacity="0.85">
        <path
          d="M474 178 L486 122 L498 178 M478 158 L494 158 M476 168 L496 168"
          fill="none"
          stroke="rgba(5,7,14,0.4)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M470 134 L502 134 M474 144 L498 144"
          fill="none"
          stroke="rgba(5,7,14,0.4)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <text x="456" y="196" fontSize="9" letterSpacing="1.8" fill="rgba(5,7,14,0.6)">
          GRID TIE
        </text>
        <text x="456" y="207" fontSize="7.5" letterSpacing="1.2" fill="rgba(5,7,14,0.34)">
          WHERE PRESENT
        </text>
      </g>

      {/* ── the circuit ─────────────────────────────────────────── */}
      <Flow d="M222 206 L136 268" on={battOn} />
      <Flow d="M172 300 L286 288" on={ctrlOn} />
      <Flow d="M348 288 L392 232" on={ctrlOn} />
      <Flow d="M352 278 L462 202" on={ctrlOn} />
      <Flow d="M326 268 L392 214 L392 96 L436 96" on={tradeOn} dashed />
      <text x="442" y="94" fontSize="9" letterSpacing="1.8" fill={tradeOn ? BLUE : 'rgba(5,7,14,0.42)'}>
        P2P / VPPA
      </text>
      <text x="442" y="105" fontSize="7.5" letterSpacing="1.2" fill="rgba(5,7,14,0.3)">
        ON THE ROADMAP
      </text>

      <text x="40" y="388" fontSize="7.5" letterSpacing="2.2" fill="rgba(5,7,14,0.26)">
        ENERGY PATH · SCHEMATIC, NOT TO SCALE
      </text>
    </svg>
  )
}
