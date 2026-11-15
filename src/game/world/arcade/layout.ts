import type { Vec3, WorldLayout } from '../../../data/content'

export const STREET = { minX: -11, maxX: 11, minZ: -46, maxZ: 36 }
export const HALL = { minX: -31, maxX: -11, minZ: -12, maxZ: 12 }
export const BACKROOM = { minX: -41, maxX: -31, minZ: -6, maxZ: 6 }

export const ARCADE_POS = {
  portal: [0, 0, 33] as Vec3,
  serpent: [-26, 0, -10.6] as Vec3,
  lancer: [-21.5, 0, -10.6] as Vec3,
  oracle: [-17, 0, -10.6] as Vec3,
  broken: [-30.3, 0, 0] as Vec3,
  scores: [-23, 0, 11.4] as Vec3,
  jukebox: [-17, 0, 10.6] as Vec3,
  glitchhop: [-28.5, 0, 10.6] as Vec3,
  gladiator: [-19.5, 0, 10.6] as Vec3,
  glyph3: [-40.75, 2.2, -3] as Vec3,
  prize: [9.2, 0, -6] as Vec3,
  poster: [10.85, 2.6, -24] as Vec3,
  pads: -31,
  key: [-38, 0, 2] as Vec3,
  glitchCube: [0, 0, -36] as Vec3,
}

/** Crate stacks: pos = [x, topHeight, z]. The first three form a climb to the awning ledge. */
export const CRATES: { pos: Vec3; size: number }[] = [
  { pos: [-9.6, 1.1, 18], size: 1.2 },
  { pos: [-9.6, 2.2, 20.2], size: 1.2 },
  { pos: [-9.6, 3.0, 22.4], size: 1.2 },
  { pos: [7, 1, 20], size: 1 },
  { pos: [8.2, 1, 21], size: 1 },
  { pos: [-8, 1, -42], size: 1 },
]
/** Awning ledge reachable by climbing the crates. */
export const LEDGE = { pos: [-10, 3.4, 28.5] as Vec3, size: [2.2, 0.3, 9] as Vec3 }

export const ARCADE_LAYOUT: WorldLayout = {
  id: 'arcade',
  name: 'Arcade District',
  subtitle: 'Retro Sector 8-B',
  bounds: [-44, -48, 14, 38],
  spawns: {
    default: { pos: [0, 1.2, 27], yaw: 0 },
  },
  pois: [
    { id: 'portal', label: 'Portal to OASIS Prime', x: 0, z: 33, kind: 'portal' },
    { id: 'hall', label: 'Pixel Palace Arcade', x: -21, z: 0, kind: 'game' },
    { id: 'prize', label: 'Prize Zone', x: 9, z: -6, kind: 'service' },
    { id: 'poster', label: 'Faded Poster', x: 10, z: -24, kind: 'secret' },
    { id: 'pads', label: 'Light Pads', x: 0, z: -31, kind: 'secret' },
  ],
  coins: [
    { id: 'arc-c1', pos: [0, 1, 18] },
    { id: 'arc-c2', pos: [-5, 1, 8] },
    { id: 'arc-c3', pos: [5, 1, -2] },
    { id: 'arc-c4', pos: [-21, 1, 0] },
    { id: 'arc-c5', pos: [-28, 1, 8] },
    { id: 'arc-c6', pos: [-10, 4.5, 26] },
    { id: 'arc-c7', pos: [-10, 4.5, 31] },
    { id: 'arc-c8', pos: [-38, 1, -3] },
    { id: 'arc-c9', pos: [8, 1, -42] },
    { id: 'arc-s1', pos: [-4, 1, -37], requiresSecret: 'light-sequence' },
    { id: 'arc-s2', pos: [0, 2.2, -38], requiresSecret: 'light-sequence' },
    { id: 'arc-s3', pos: [4, 1, -37], requiresSecret: 'light-sequence' },
  ],
  mapShapes: [
    { type: 'rect', x: STREET.minX, z: STREET.minZ, w: STREET.maxX - STREET.minX, h: STREET.maxZ - STREET.minZ },
    { type: 'rect', x: HALL.minX, z: HALL.minZ, w: HALL.maxX - HALL.minX, h: HALL.maxZ - HALL.minZ },
  ],
}
