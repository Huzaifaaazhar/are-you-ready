import type { Vec3, WorldLayout } from '../../../../data/content'

export const ZONES = {
  lobby: { minX: -12, maxX: 12, minZ: -30, maxZ: 12 },
  hall: { minX: -12, maxX: 12, minZ: -60, maxZ: -30 },
  office: { minX: -12, maxX: 12, minZ: -80, maxZ: -60 },
  escape: { minX: 12, maxX: 46, minZ: -73, maxZ: -67 },
}
export const CHECKPOINTS: Record<'lobby' | 'hall' | 'office', { pos: Vec3; yaw: number }> = {
  lobby: { pos: [0, 1.2, 7], yaw: 0 },
  hall: { pos: [0, 1.2, -33], yaw: 0 },
  office: { pos: [0, 1.2, -63], yaw: 0 },
}
export const PAD_Z = -55
export const ELEVATOR: Vec3 = [43, 0, -70]

export const PRESENT_LAYOUT: WorldLayout = {
  id: 'present',
  name: 'The Present',
  subtitle: 'Trial II · Consortium Tower',
  bounds: [-14, -82, 48, 14],
  spawns: { default: { pos: [0, 1.2, 7], yaw: 0 } },
  pois: [
    { id: 'lobby', label: 'Lobby', x: 0, z: -12, kind: 'challenge' },
    { id: 'hall', label: 'Server hall', x: 0, z: -45, kind: 'challenge' },
    { id: 'office', label: 'Executive office', x: 0, z: -72, kind: 'challenge' },
    { id: 'elevator', label: 'Escape elevator', x: 43, z: -70, kind: 'portal' },
  ],
  coins: [],
  mapShapes: [
    { type: 'rect', x: -12, z: -80, w: 24, h: 92 },
    { type: 'rect', x: 12, z: -73, w: 34, h: 6 },
  ],
}
