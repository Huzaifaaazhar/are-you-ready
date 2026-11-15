import type { Vec3, WorldLayout } from '../../../../data/content'

export const ROOM = { minX: -12, maxX: 12, minZ: -10, maxZ: 10 }
export type MemoryId = 'mem-ticket' | 'mem-map' | 'mem-cart' | 'mem-letter'
/** Chronological order (the solution). */
export const MEMORY_ORDER: MemoryId[] = ['mem-ticket', 'mem-map', 'mem-cart', 'mem-letter']
export const MEMORY_ORIGINS: Record<MemoryId, Vec3> = {
  'mem-letter': [-10, 1.0, 7.5],
  'mem-ticket': [10.6, 1.65, -4],
  'mem-map': [-7.5, 0.95, -8.4],
  'mem-cart': [10, 1.0, 6.2],
}
export const PEDESTALS: Vec3[] = [[-3, 0, 3.5], [-1, 0, 3.5], [1, 0, 3.5], [3, 0, 3.5]]
export const BED: Vec3 = [-9.5, 0, -2]
export const ROOK_CHAIR: Vec3 = [5.4, 0, -4.5]
export const FOUNDER_CHAIR: Vec3 = [2.6, 0, -4.5]

export const PAST_LAYOUT: WorldLayout = {
  id: 'past',
  name: 'The Past',
  subtitle: 'Trial I · Memory Archive',
  bounds: [-14, -12, 14, 22],
  spawns: { default: { pos: [0, 1.2, 15], yaw: 0 } },
  pois: [
    { id: 'pedestals', label: 'Memory Projector', x: 0, z: 3.5, kind: 'challenge' },
    { id: 'chairs', label: 'Two chairs', x: 4, z: -4.5, kind: 'service' },
    { id: 'bed', label: 'Bed', x: -9.5, z: -2, kind: 'secret' },
    { id: 'exit', label: 'Exit portal', x: 0, z: 20, kind: 'portal' },
  ],
  coins: [],
  mapShapes: [{ type: 'rect', x: -12, z: -10, w: 24, h: 20 }, { type: 'rect', x: -2.5, z: 10, w: 5, h: 12 }],
}
