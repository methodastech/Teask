/**
 * Station 3, real CAD, grouped into the assemblies a visitor cares about.
 *
 * The client supplied 37 per-part STLs (SolidWorks export). Rather than surface
 * every hinge pin, we group them into logical assemblies; each becomes one
 * hotspot with a label and spec. `files` are basenames in /public/models.
 *
 * SPEC VALUES marked "pending" await the final spec sheet, flagged on screen.
 */

import type { Finish } from './stationStyle'

export interface PartGroup {
  id: string
  label: string
  tagline: string
  /** hex tint for this group's material (blueprint mode) */
  color: number
  /** real-life colour, matched to the product photography; falls back to `color` */
  realColor?: number
  /** how the surface takes light; defaults to the matte cabinet finish */
  finish?: Finish
  /** true for the PV, rendered as glass */
  glass?: boolean
  files: string[]
  specs: Array<[string, string]>
  /**
   * The designed "hero" camera for click-and-hold. On press the camera flies
   * to this framing so the part reads clearly (Orano-style), not just a
   * push-in from the resting angle.
   *   spin     , rig Y rotation (rad) that turns the part's good face forward
   *   elevation, camera pitch (rad); lower = more side-on, higher = top-down
   *   dist     , distance multiplier on the fitted framing (smaller = closer)
   */
  view?: { spin?: number; elevation?: number; dist?: number }
  /**
   * When a group holds several identical sub-parts (e.g. the two support legs,
   * each carrying a logo), focus the one nearest the click instead of the whole
   * group's centre, so holding either leg inspects that leg.
   */
  focusNearest?: boolean
}

const panels = Array.from({ length: 10 }, (_, i) => `solar-design-${i + 1}`)

export const PART_GROUPS: PartGroup[] = [
  {
    id: 'panels',
    label: 'Solar array',
    tagline: 'On-site generation',
    color: 0x1b3a6b,
    realColor: 0xb8c0ca, // lighter cool-grey PV glass, matching the panels under daylight
    finish: 'glass',
    glass: true,
    files: panels,
    specs: [
      ['Modules', '10 panels'],
      ['Cells', 'Bifacial PV'],
      ['Output', '5 kWp installed'],
      ['Layout', 'Dual-pitch butterfly'],
    ],
    view: { spin: -0.55, elevation: 0.62, dist: 1.15 },
  },
  {
    id: 'wings',
    label: 'Wing frames',
    tagline: 'The tilting roof structure',
    color: 0x8f959f,
    realColor: 0xc8ccd3, // brushed silver aluminium
    finish: 'metal',
    files: ['wings-1', 'wings-2'],
    specs: [
      ['Frames', '2, mirrored'],
      ['Motion', 'Hinged, foldable'],
      ['Carries', 'The solar array'],
    ],
    view: { spin: -0.7, elevation: 0.5, dist: 1.1 },
  },
  {
    id: 'cables',
    label: 'Tension cables',
    tagline: 'Stays the cantilever',
    color: 0xd2dae8,
    realColor: 0xb9bec7, // bright stainless stay wire
    finish: 'metal',
    files: ['cable-1-1', 'cable-1-2', 'cable-2-1', 'cable-2-2', 'cable-2-3', 'cable-2-4'],
    specs: [
      ['Runs', '6 stays'],
      ['Role', 'Pre-tensions the wings'],
      ['Material', 'Steel (grade pending)'],
    ],
    view: { spin: -1.15, elevation: 0.32, dist: 1.0 },
  },
  {
    id: 'hinges',
    label: 'Hinge mechanism',
    tagline: 'Folds flat for transport',
    color: 0xb7bcc6,
    realColor: 0x8a9099, // raw galvanised hardware, a shade below the wings
    finish: 'metal',
    files: [
      'hinge-female-1',
      'hinge-female-3',
      'hinge-female-4',
      'hinge-female-5',
      'hinge-male-2-1',
      'hinge-male-2-3',
      'hinge-male-2-6',
      'hinge-male-2-7',
      'hinge-pin-1',
      'hinge-pin-3',
      'hinge-pin-4',
      'hinge-pin-5',
    ],
    specs: [
      ['Type', 'Male / female / pin'],
      ['Enables', 'Fold-flat deploy'],
      ['Sets', '4 hinge assemblies'],
    ],
    view: { spin: -0.6, elevation: 0.35, dist: 0.72 },
  },
  {
    id: 'legs',
    label: 'Support legs',
    tagline: 'Carries the load to ground',
    color: 0x767d8a,
    realColor: 0x33373f, // graphite cabinet — a true black reads as a silhouette outdoors
    finish: 'matte',
    files: ['leg-support-1', 'leg-support-2'],
    specs: [
      ['Legs', '2 columns'],
      ['Role', 'Primary vertical support'],
      ['Siting', 'No civil works'],
    ],
    // faces the leg carrying the illuminated diamond logo
    view: { spin: -2.12, elevation: 0.26, dist: 0.92 },
    // both legs carry a logo, hold either to inspect the nearest one
    focusNearest: true,
  },
  {
    id: 'supports',
    label: 'Cross supports',
    tagline: 'Ties the frame together',
    color: 0x5f6470,
    // Same graphite as the legs. These beams are part of the same welded frame
    // on the real unit, so rendering them silver split one structure into two
    // colours and made the bracing read as separate hardware bolted on.
    realColor: 0x33373f,
    finish: 'metal',
    files: ['medium-support-2', 'medium-support-3', 'centre-support-3', 'support-1'],
    specs: [
      ['Members', 'Centre + medium beams'],
      ['Role', 'Lateral bracing'],
    ],
    view: { spin: -0.6, elevation: 0.3, dist: 0.9 },
  },
  {
    id: 'base',
    label: 'Flat base',
    tagline: 'Ships whole, sets down flat',
    color: 0x3a3f49,
    realColor: 0x26292f, // dark graphite base, a shade under the cabinet
    finish: 'matte',
    files: ['flat-base-1'],
    specs: [
      ['Install', 'No trenching'],
      ['Deploy', 'Under 30 minutes'],
      ['Inverter', '5–15 kW rated'],
      ['Storage', 'BESS, sizing to suit site'],
      ['Grid', 'Standalone or grid-tied'],
    ],
    view: { spin: -0.6, elevation: 0.14, dist: 1.0 },
  },
]

export const MODELS_BASE = '/models'
