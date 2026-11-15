import type { Vec3, WorldLayout } from '../../../data/content'

/** A road path: control points (centre line, road-top height) and width. */
export interface RoadPath {
  id: string
  points: Vec3[]
  width: number
  tunnel?: boolean
  color: string
}

export interface Plaza {
  id: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Openings in the perimeter wall: side + [from, to] along that side. */
  openings: { side: 'n' | 's' | 'e' | 'w'; from: number; to: number }[]
}

export const PLAZAS: Plaza[] = [
  { id: 'start', minX: -22, maxX: 22, minZ: -35, maxZ: 35, openings: [{ side: 'n', from: -9, to: 9 }, { side: 's', from: -5, to: 5 }] },
  { id: 'junction', minX: -20, maxX: 20, minZ: 260, maxZ: 300, openings: [{ side: 's', from: -9, to: 9 }, { side: 'n', from: 3, to: 17 }, { side: 'n', from: -15, to: -5 }] },
  { id: 'merge', minX: -22, maxX: 22, minZ: 520, maxZ: 560, openings: [{ side: 's', from: -11, to: 13 }, { side: 'n', from: -9, to: 9 }, { side: 'w', from: 525, to: 535 }] },
  { id: 'finish', minX: -20, maxX: 20, minZ: 800, maxZ: 840, openings: [{ side: 's', from: -9, to: 9 }] },
]

export const PATHS: RoadPath[] = [
  { id: 'highway', width: 18, color: '#00f0ff', points: [[0, 0, 35], [0, 0, 150], [0, 0, 260]] },
  { id: 'skyway', width: 14, color: '#ff2bd6', points: [[10, 0, 300], [11, 1, 320], [16, 5, 360], [20, 8, 400], [16, 8, 440], [9, 4, 485], [6, 0, 520]] },
  { id: 'tunnel', width: 10, tunnel: true, color: '#ffe14d', points: [[-10, 0, 300], [-13, 0, 330], [-19, 0, 370], [-20, 0, 410], [-14, 0, 455], [-7, 0, 495], [-6, 0, 520]] },
  { id: 'approach', width: 18, color: '#3dff8b', points: [[0, 0, 560], [0, 0, 600], [0, 0, 618], [0, 1.8, 638], [0, 3.6, 652]] },
  { id: 'landing', width: 18, color: '#3dff8b', points: [[0, 2.2, 667], [0, 1.2, 680], [0, 0, 692], [0, 0, 750], [0, 0, 800]] },
  {
    id: 'undercity', width: 10, tunnel: true, color: '#9d4dff',
    points: [[0, 0, -35], [0, -4, -58], [0, -8, -80], [-5, -8, -98], [-24, -8, -108], [-42, -8, -99], [-48, -8, -82], [-48, -8, -40], [-48, -8, 100], [-48, -8, 250], [-48, -8, 420], [-48, 0, 492], [-47, 0, 508], [-42, 0, 522], [-33, 0, 529], [-22, 0, 530]],
  },
]

export interface Checkpoint {
  id: string
  label: string
  zones: { min: Vec3; max: Vec3; respawn: { pos: Vec3; yaw: number } }[]
}

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: 'junction', label: 'Junction',
    zones: [
      { min: [-20, -2, 260], max: [20, 10, 300], respawn: { pos: [0, 1.2, 285], yaw: 0 } },
      { min: [-56, -12, 230], max: [-40, -2, 260], respawn: { pos: [-48, -6.8, 250], yaw: 0 } },
    ],
  },
  { id: 'merge', label: 'Merge', zones: [{ min: [-22, -2, 520], max: [22, 10, 560], respawn: { pos: [0, 1.2, 545], yaw: 0 } }] },
  { id: 'landing', label: 'Leap', zones: [{ min: [-9, -1, 668], max: [9, 8, 705], respawn: { pos: [0, 1.2, 700], yaw: 0 } }] },
  { id: 'finish', label: 'Finish', zones: [{ min: [-12, -2, 806], max: [12, 12, 812], respawn: { pos: [0, 1.2, 820], yaw: 0 } }] },
]

export const RACE_START = { pos: [0, 1.4, 14] as Vec3, yaw: 0 }
export const FINISH_Z = 809
export const BOOST_PADS: { pos: Vec3; yaw: number }[] = [
  { pos: [0, 0, 90], yaw: 0 },
  { pos: [-4.5, 0, 200], yaw: 0 },
  { pos: [0, 0, 585], yaw: 0 },
  { pos: [0, 0, 605], yaw: 0 },
  { pos: [-48, -8, 0], yaw: 0 },
  { pos: [-48, -8, 180], yaw: 0 },
  { pos: [-48, -8, 330], yaw: 0 },
]
export const GLYPH5_POS: Vec3 = [-48, -6.5, 150]

export const RACE_LAYOUT: WorldLayout = {
  id: 'race',
  name: 'Velocity City',
  subtitle: 'Grand Prix Circuit',
  bounds: [-90, -110, 60, 860],
  spawns: { default: { pos: RACE_START.pos, yaw: 0 } },
  pois: [
    { id: 'start', label: 'Starting Grid', x: 0, z: 14, kind: 'challenge' },
    { id: 'junction', label: 'Junction', x: 0, z: 280, kind: 'challenge' },
    { id: 'merge', label: 'Merge', x: 0, z: 540, kind: 'challenge' },
    { id: 'finish', label: 'Finish', x: 0, z: 820, kind: 'challenge' },
  ],
  coins: [],
  mapShapes: PLAZAS.map((p) => ({ type: 'rect' as const, x: p.minX, z: p.minZ, w: p.maxX - p.minX, h: p.maxZ - p.minZ })),
}
