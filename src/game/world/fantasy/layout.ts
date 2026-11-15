import type { Vec3, WorldLayout } from '../../../data/content'

export interface Isle {
  id: string
  pos: Vec3
  r: number
  grass: string
}
export const ISLES: Isle[] = [
  { id: 'arrival', pos: [0, 0, 16], r: 9, grass: '#4f9a4a' },
  { id: 'ledge', pos: [13, -1.2, 18], r: 2, grass: '#5aa850' },
  { id: 'ruins', pos: [0, 0, -12], r: 11, grass: '#6a9a4a' },
  { id: 'castle', pos: [0, 4, -48], r: 14, grass: '#5a8a48' },
  { id: 'spire', pos: [-28, 3, -14], r: 4.5, grass: '#6aa860' },
]
export const STONES: Vec3[] = [
  [-14, 0.6, -12],
  [-17.5, 1.4, -13],
  [-21, 2.2, -14],
]
export const STATUES: { pos: Vec3; solve: number }[] = [
  { pos: [-6, 0, -12], solve: 1 },
  { pos: [6, 0, -12], solve: 3 },
  { pos: [0, 0, -5.5], solve: 2 },
]
export const OBELISK: Vec3 = [0, 0, -12]
export const AETHER_STEPS: Vec3[] = [
  [0, 1.2, -25.5],
  [0, 2.4, -29],
  [0, 3.4, -32.2],
]
export const RUNE_TILES: Vec3[] = [
  [-6, 4, -53],
  [6, 4, -53],
  [-6, 4, -43],
  [6, 4, -43],
]
export const GARDEN: Vec3 = [22, 30, -64]
export const SECRET_PORTAL: Vec3 = [0, 4, -48]

export const FANTASY_LAYOUT: WorldLayout = {
  id: 'fantasy',
  name: 'Aether Isles',
  subtitle: 'Fantasy Realm',
  bounds: [-40, -70, 32, 30],
  spawns: { default: { pos: [-1, 1.2, 19], yaw: 0 } },
  pois: [
    { id: 'ruins', label: 'Guardian ruins', x: 0, z: -12, kind: 'challenge' },
    { id: 'castle', label: 'Castle Aether', x: 0, z: -48, kind: 'challenge' },
    { id: 'spire', label: 'Wizard’s spire', x: -28, z: -14, kind: 'secret' },
    { id: 'portal', label: 'Portal home', x: 6.2, z: 21, kind: 'portal' },
  ],
  coins: [
    { id: 'fan-c1', pos: [4, 1, 10] },
    { id: 'fan-c2', pos: [-6, 1, -18] },
    { id: 'fan-c3', pos: [7, 5, -40] },
    { id: 'fan-c4', pos: [GARDEN[0] - 2, GARDEN[1] + 1, GARDEN[2] + 2] },
  ],
  relicName: 'Rune Stone',
  relics: [
    { id: 'rune-1', pos: [13, 0.2, 18] },
    { id: 'rune-2', pos: [-7.5, 1, -19] },
    { id: 'rune-3', pos: [-10, 15.2, -58.5] },
    { id: 'rune-4', pos: [GARDEN[0] + 2, GARDEN[1] + 1, GARDEN[2] - 2] },
    { id: 'rune-5', pos: [-28, 4.2, -14] },
  ],
  mapShapes: ISLES.map((i) => ({ type: 'circle' as const, x: i.pos[0], z: i.pos[2], r: i.r, fill: true })),
}
