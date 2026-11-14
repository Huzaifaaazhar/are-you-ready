import type { Vec3, WorldLayout } from '../../../data/content'

export const HUB_RADIUS = 60

export const STEPPING_STONES: Vec3[] = [
  [14, 1.0, -12],
  [17, 2.2, -15.5],
  [20.5, 3.4, -13.5],
  [23.5, 4.6, -16.5],
  [22.5, 5.8, -20.5],
  [19.5, 7.0, -23.5],
  [21.5, 8.2, -27.5],
]
export const SKY_PLATFORM: Vec3 = [26.5, 9.4, -29]

export const RACE_RADIUS = 47
export const RACE_CHECKPOINTS: { pos: Vec3; yaw: number }[] = Array.from({ length: 8 }, (_, i) => {
  // Run counter-clockwise (as seen from above) starting at the east arch.
  const theta = -((i + 1) * Math.PI * 2) / 8
  const x = Math.cos(theta) * RACE_RADIUS
  const z = Math.sin(theta) * RACE_RADIUS
  const tx = Math.sin(theta)
  const tz = -Math.cos(theta)
  return { pos: [x, 1.8, z] as Vec3, yaw: Math.atan2(tx, tz) }
})

export const HUB_POS = {
  tower: [0, 0, 0] as Vec3,
  arcadePortal: [0, 0, -36] as Vec3,
  gate: [-36, 0, 0] as Vec3,
  devTerminal: [-43, 0, 3] as Vec3,
  raceArch: [RACE_RADIUS, 0, 0] as Vec3,
  raceKiosk: [41, 0, 5] as Vec3,
  identity: [-22, 0, 24] as Vec3,
  forge: [-28, 0, 18] as Vec3,
  records: [24, 0, 26] as Vec3,
  atlas: [-24, 0, -24] as Vec3,
  locker: [9, 0, 17] as Vec3,
  beacon: [-7, 0, 17] as Vec3,
}

export const HUB_LAYOUT: WorldLayout = {
  id: 'hub',
  name: 'OASIS Prime',
  subtitle: 'Central Hub',
  bounds: [-62, -62, 62, 62],
  spawns: {
    default: { pos: [0, 1.2, 25], yaw: 0 },
    fromArcade: { pos: [0, 1.2, -29], yaw: Math.PI },
  },
  pois: [
    { id: 'arcade-portal', label: 'Arcade District Portal', x: 0, z: -36, kind: 'portal' },
    { id: 'gate', label: 'Founder’s Gate', x: -36, z: 0, kind: 'challenge' },
    { id: 'race', label: 'Velocity Circuit', x: RACE_RADIUS, z: 0, kind: 'challenge' },
    { id: 'identity', label: 'Identity Nexus', x: -22, z: 24, kind: 'service' },
    { id: 'forge', label: 'Avatar Forge', x: -28, z: 18, kind: 'service' },
    { id: 'records', label: 'Hall of Records', x: 24, z: 26, kind: 'service' },
    { id: 'atlas', label: 'Atlas Observatory', x: -24, z: -24, kind: 'service' },
    { id: 'locker', label: 'Inventory Locker', x: 9, z: 17, kind: 'service' },
    { id: 'beacon', label: 'Welcome Beacon', x: -7, z: 17, kind: 'service' },
    { id: 'stones', label: 'Floating Stones', x: 18, z: -16, kind: 'secret' },
  ],
  coins: [
    { id: 'hub-c1', pos: [0, 1, 15] },
    { id: 'hub-c2', pos: [11, 1, 8] },
    { id: 'hub-c3', pos: [-13, 1, 6] },
    { id: 'hub-c4', pos: [-44, 1, -4] },
    { id: 'hub-c5', pos: [20.5, 4.5, -13.5] },
    { id: 'hub-c6', pos: [24.5, 10.5, -30.5] },
    { id: 'hub-c7', pos: [31, 1, -10] },
    { id: 'hub-c8', pos: [4.6, 2.4, 3] },
    { id: 'hub-c9', pos: [-28, 1, -31] },
    { id: 'hub-c10', pos: [27, 1, 33] },
    { id: 'hub-c11', pos: [-31, 1, 31] },
    { id: 'hub-c12', pos: [0, 1, 52] },
  ],
  mapShapes: [
    { type: 'circle', x: 0, z: 0, r: HUB_RADIUS },
    { type: 'circle', x: 0, z: 0, r: RACE_RADIUS },
    { type: 'circle', x: 0, z: 0, r: 7, fill: true },
  ],
}
