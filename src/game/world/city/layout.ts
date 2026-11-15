import type { Vec3, WorldLayout } from '../../../data/content'

export interface Tower {
  id: string
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  sign?: string
}

export const TOWERS: Tower[] = [
  { id: 't1', x: -14, z: 0, w: 10, d: 10, h: 8, color: '#ff2bd6', sign: 'KASUMI' },
  { id: 't2', x: 14, z: -2, w: 10, d: 10, h: 14, color: '#00f0ff', sign: 'NEXUS' },
  { id: 't3', x: -14, z: -24, w: 10, d: 10, h: 20, color: '#ffe14d', sign: 'RADIO 8' },
  { id: 't4', x: 14, z: -26, w: 10, d: 12, h: 26, color: '#9d4dff', sign: 'VANTA' },
  { id: 't5', x: 0, z: -48, w: 12, d: 12, h: 34, color: '#3dff8b', sign: 'APEX' },
]

export const CITY = {
  liftA: [-14, 0, 7] as Vec3,
  padT1: [-14, 8, -3] as Vec3,
  t3Roof: [-14, 20, -21] as Vec3,
  padT2Ledge: [7.5, 8, -2] as Vec3,
  t2Roof: [13, 14, -1] as Vec3,
  liftB: [14, 14, -18.5] as Vec3,
  billboard: [14, 26, -30] as Vec3,
  secretPad: [14, 26, -31.2] as Vec3,
  garden: [0, 34, -46] as Vec3,
  gardenReturn: [3, 34, -51] as Vec3,
  radio: [-16, 20, -27] as Vec3,
  billboardSwitch: [11, 26, -23] as Vec3,
  vending: [7, 0, 14] as Vec3,
}

export const CITY_LAYOUT: WorldLayout = {
  id: 'city',
  name: 'Neon Heights',
  subtitle: 'Vertical City · District 9',
  bounds: [-34, -64, 34, 38],
  spawns: { default: { pos: [0, 1.2, 25], yaw: 0 } },
  pois: [
    { id: 'lift-a', label: 'Lift (Kasumi)', x: -14, z: 7, kind: 'service' },
    { id: 'bridge-a', label: 'Skybridge', x: -1, z: -2, kind: 'service' },
    { id: 'bridge-b', label: 'Elevated road', x: 14, z: -12, kind: 'service' },
    { id: 'radio', label: 'Broadcast tower', x: -16, z: -27, kind: 'challenge' },
    { id: 'vanta', label: 'Vanta billboard', x: 14, z: -30, kind: 'secret' },
    { id: 'portal', label: 'Portal home', x: 0, z: 34, kind: 'portal' },
  ],
  coins: [
    { id: 'city-c1', pos: [-4, 1, 10] },
    { id: 'city-c2', pos: [-1, 9, -2] },
    { id: 'city-c3', pos: [17, 27, -24] },
    { id: 'city-c4', pos: [-3, 35, -44] },
  ],
  relicName: 'Neon Sigil',
  relics: [
    { id: 'sigil-1', pos: [-27, 1.1, -12] },
    { id: 'sigil-2', pos: [-16, 9.2, 2] },
    { id: 'sigil-3', pos: [16, 15.2, 1] },
    { id: 'sigil-4', pos: [-11, 21.2, -21] },
    { id: 'sigil-5', pos: [16.5, 15.2, -18.5] },
    { id: 'sigil-6', pos: [-3, 35.2, -50] },
  ],
  mapShapes: [{ type: 'rect', x: -32, z: -62, w: 64, h: 98 }, ...TOWERS.map((t) => ({ type: 'rect' as const, x: t.x - t.w / 2, z: t.z - t.d / 2, w: t.w, h: t.d, fill: true }))],
}
