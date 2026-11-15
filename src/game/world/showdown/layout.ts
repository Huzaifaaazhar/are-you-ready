import type { Vec3, WorldLayout } from '../../../data/content'

export const SD = {
  spawn: [0, 1.2, 4.5] as Vec3,
  infilStart: { pos: [0, 1.2, -4] as Vec3, yaw: 0 },
  puzzleStart: { pos: [0, 1.2, -66] as Vec3, yaw: 0 },
  bossStart: { pos: [0, 1.2, -93] as Vec3, yaw: 0 },
  coreStart: { pos: [0, 1.2, -132] as Vec3, yaw: 0 },
  arena: [0, 0, -110] as Vec3,
  arenaR: 17,
  core: [0, 0, -140] as Vec3,
  lever: [0, 0, -81] as Vec3,
  door: -84,
}
/** Laser bars sweeping the first corridor: [baseZ, range, speed] */
export const LASER_BARS: [number, number, number][] = [
  [-10, 4, 1.1],
  [-18, 4, 1.5],
]
export const PLATFORMS: Vec3[] = [
  [0, 0, -29],
  [3, 0.6, -33.5],
  [-1, 1.2, -38],
  [2, 0.6, -42.5],
]
export const FIREWALLS = [-50, -54, -58]
export const GLYPH_SOCKETS: { pos: Vec3; start: number }[] = [3, 5, 1, 6, 2, 4].map((start, i) => ({ pos: [-8, 0, -67.5 - i * 2.6] as Vec3, start }))
export const MEMORY_PLINTHS: { pos: Vec3; start: number }[] = [2, 0, 3, 1].map((start, i) => ({ pos: [8, 0, -68 - i * 3.6] as Vec3, start }))
export const MEMORY_LABELS = ['TICKET', 'LEVEL MAP', 'CARTRIDGE', 'LETTER']
export const LIGHT_PADS_X = [-4.5, -1.5, 1.5, 4.5]
export const PAD_Z = -76
export const PYLON_ANGLES = [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]
export const PYLON_R = 12.5
export const CHOICE_PEDESTALS: { id: 'open' | 'caretaker' | 'rest'; pos: Vec3 }[] = [
  { id: 'open', pos: [-6, 0, -142] },
  { id: 'caretaker', pos: [0, 0, -145] },
  { id: 'rest', pos: [6, 0, -142] },
]

export const SHOWDOWN_LAYOUT: WorldLayout = {
  id: 'showdown',
  name: 'The Null Citadel',
  subtitle: 'Final Quest',
  bounds: [-20, -150, 20, 16],
  spawns: { default: { pos: SD.spawn, yaw: 0 } },
  pois: [
    { id: 'prep', label: 'Preparation hall', x: 0, z: 5, kind: 'service' },
    { id: 'infil', label: 'Firewall', x: 0, z: -35, kind: 'challenge' },
    { id: 'door', label: 'The last door', x: 0, z: -75, kind: 'challenge' },
    { id: 'arena', label: 'Null Titan', x: 0, z: -110, kind: 'challenge' },
    { id: 'core', label: 'The Core', x: 0, z: -140, kind: 'portal' },
  ],
  coins: [],
  mapShapes: [
    { type: 'rect', x: -7, z: -5, w: 14, h: 18 },
    { type: 'rect', x: -4, z: -62, w: 8, h: 57 },
    { type: 'rect', x: -10, z: -84, w: 20, h: 20 },
    { type: 'circle', x: 0, z: -110, r: 17 },
    { type: 'rect', x: -10, z: -150, w: 20, h: 18 },
  ],
}
