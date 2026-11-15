import type { Vec3, WorldLayout } from '../../../data/content'

export const SPAWN: Vec3 = [0, 1.2, 21.5]
/** Ground slabs (x0, x1, z0, z1) — the gap between them is the chasm. */
export const GROUND: [number, number, number, number][] = [
  [-34, 34, -12, 32],
  [-34, 34, -58, -22],
  [-34, -20, -22, -12],
  [-6, 34, -22, -12],
]
export const CHASM = { x0: -20, x1: -6, z0: -22, z1: -12 }
export const BRIDGE_TILES: Vec3[] = [-12.8, -14.8, -16.8, -18.8, -20.8].map((z) => [-13, 0, z] as Vec3)
export const POOLS: { min: Vec3; max: Vec3 }[] = [
  { min: [-16, -1, 0], max: [-8, 0.4, 7] },
  { min: [7, -1, -10], max: [13, 0.4, 0] },
  { min: [-5, -1, -34], max: [5, 0.4, -29] },
]
export const STORM_SPOTS: Vec3[] = [
  [2, 0, 6], [-4, 0, -2], [8, 0, 10], [0, 0, -6], [-8, 0, 12], [4, 0, -4], [12, 0, 4], [-2, 0, 2], [5, 0, 16], [-10, 0, -8],
]
export const DATACENTER = { x0: 8, x1: 26, z0: -46, z1: -30 }
export const SECRET_ROOM = { x0: 26, x1: 32, z0: -44, z1: -36 }
export const GHOST_BYTE: Vec3 = [29, 0, -40]

export const WASTELAND_LAYOUT: WorldLayout = {
  id: 'wasteland',
  name: 'Null Sector',
  subtitle: 'Digital Wasteland',
  bounds: [-36, -60, 36, 34],
  spawns: { default: { pos: SPAWN, yaw: 0 } },
  pois: [
    { id: 'pile', label: 'Fallen server tower', x: 22, z: 2, kind: 'challenge' },
    { id: 'chasm', label: 'The chasm', x: -13, z: -17, kind: 'challenge' },
    { id: 'dc', label: 'Ruined data center', x: 17, z: -38, kind: 'challenge' },
    { id: 'portal', label: 'Portal home', x: 0, z: 29.8, kind: 'portal' },
  ],
  coins: [
    { id: 'waste-c1', pos: [-3, 1, 16] },
    { id: 'waste-c2', pos: [-24, 1, -30] },
    { id: 'waste-c3', pos: [20, 1, -42] },
    { id: 'waste-c4', pos: [30, 1, -38] },
  ],
  relicName: 'Data Shard',
  relics: [
    { id: 'shard-1', pos: [23, 7.4, -4] },
    { id: 'shard-2', pos: [-13, 1, -27] },
    { id: 'shard-3', pos: [12, 1, -42] },
    { id: 'shard-4', pos: [30, 1, -42] },
    { id: 'shard-5', pos: [10, 1, -12] },
  ],
  mapShapes: [{ type: 'rect', x: -34, z: -58, w: 68, h: 90 }, { type: 'rect', x: CHASM.x0, z: CHASM.z0, w: CHASM.x1 - CHASM.x0, h: CHASM.z1 - CHASM.z0, fill: true }],
}
