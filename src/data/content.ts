/** Static game content: worlds, achievements, items, secrets, prizes and objectives. */

export type WorldId = 'hub' | 'arcade'
export type Vec3 = [number, number, number]

export interface SpawnPoint {
  pos: Vec3
  /** Camera yaw in radians. 0 looks toward -Z. */
  yaw: number
}

export interface PointOfInterest {
  id: string
  label: string
  x: number
  z: number
  kind: 'portal' | 'challenge' | 'service' | 'secret' | 'game'
}

export interface CoinDef {
  id: string
  pos: Vec3
  /** Only appears after this secret has been discovered. */
  requiresSecret?: string
}

export interface WorldLayout {
  id: WorldId
  name: string
  subtitle: string
  /** Map bounds for the top-down map overlay [minX, minZ, maxX, maxZ]. */
  bounds: [number, number, number, number]
  spawns: Record<string, SpawnPoint>
  pois: PointOfInterest[]
  coins: CoinDef[]
  /** Simple shapes drawn on the map overlay. */
  mapShapes: MapShape[]
}

export type MapShape =
  | { type: 'circle'; x: number; z: number; r: number; fill?: boolean }
  | { type: 'rect'; x: number; z: number; w: number; h: number; fill?: boolean }

export interface AchievementDef {
  id: string
  title: string
  desc: string
  glyph: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'logged-in', title: 'Logged In', desc: 'Enter the OASIS for the first time.', glyph: '◈' },
  { id: 'avatar', title: 'New Identity', desc: 'Forge your avatar in the Identity Forge.', glyph: '☺' },
  { id: 'traveler', title: 'World Hopper', desc: 'Step through a portal into another world.', glyph: '◎' },
  { id: 'coins-10', title: 'Pocket Change', desc: 'Collect 10 OASIS coins.', glyph: '¢' },
  { id: 'coins-all', title: 'Coin Hoarder', desc: 'Collect every coin in OASIS Prime and the Arcade District.', glyph: '$' },
  { id: 'secret-1', title: 'Easter Egg Hunter', desc: 'Discover your first hidden secret.', glyph: '?' },
  { id: 'secret-all', title: 'Nothing Stays Hidden', desc: 'Discover all four secrets.', glyph: '!' },
  { id: 'arcade-ace', title: 'Arcade Ace', desc: 'Beat a cabinet’s target score.', glyph: '★' },
  { id: 'racer', title: 'Velocity', desc: 'Finish the Velocity Circuit.', glyph: '»' },
  { id: 'racer-fast', title: 'Light Speed', desc: 'Finish the Velocity Circuit in under 45 seconds.', glyph: '⚡' },
  { id: 'key', title: 'The Copper Key', desc: 'Find the key the broken machine was hiding.', glyph: '⚿' },
  { id: 'gate', title: 'First Gate Open', desc: 'Open the first lock of the Founder’s Gate.', glyph: '⛩' },
  { id: 'shopper', title: 'Prize Winner', desc: 'Redeem a prize at the Prize Zone counter.', glyph: '♦' },
]

export interface ItemDef {
  id: string
  name: string
  desc: string
  glyph: string
  color: string
  /** If set, this item can be equipped on the avatar. */
  equip?: { slot: 'headGear' | 'backGear'; value: string }
}

export const ITEMS: Record<string, ItemDef> = {
  'holo-map': { id: 'holo-map', name: 'Atlas Holo-Map', desc: 'Standard issue for new arrivals. Press M to open the world map.', glyph: '⌖', color: '#00f0ff' },
  'copper-key': { id: 'copper-key', name: 'Copper Key', desc: 'Warm to the touch. Its teeth match the first lock of the Founder’s Gate in OASIS Prime.', glyph: '⚿', color: '#ff9a4d' },
  'founder-quarter': { id: 'founder-quarter', name: 'Founder’s Quarter', desc: 'An old arcade token left on the highest platform in the plaza. Engraved: “PLAY ONE MORE”.', glyph: '◉', color: '#ffe14d' },
  'glitch-cube': { id: 'glitch-cube', name: 'Glitch Cube', desc: 'A fragment of corrupted code that remembers the colours of the Arcade District.', glyph: '▣', color: '#ff2bd6' },
  'race-badge': { id: 'race-badge', name: 'Circuit Badge', desc: 'Awarded for finishing the Velocity Circuit.', glyph: '»', color: '#3dff8b' },
  'champion-ticket': { id: 'champion-ticket', name: 'Champion Ticket', desc: 'Printed by a cabinet when you beat its target score.', glyph: '✦', color: '#9d4dff' },
  'neon-visor': { id: 'neon-visor', name: 'Neon Visor', desc: 'Cosmetic head gear. Equip from here or in the Identity Forge.', glyph: '▭', color: '#00f0ff', equip: { slot: 'headGear', value: 'neon-visor' } },
  'pixel-cape': { id: 'pixel-cape', name: 'Pixel Cape', desc: 'Cosmetic back gear made of living pixels.', glyph: '▚', color: '#ff2bd6', equip: { slot: 'backGear', value: 'pixel-cape' } },
}

export interface SecretDef {
  id: string
  name: string
  world: WorldId
  hint: string
}

export const SECRETS: SecretDef[] = [
  { id: 'sky-platform', name: 'Highest Point', world: 'hub', hint: 'Some platforms in the plaza float for a reason. Keep climbing.' },
  { id: 'dev-terminal', name: 'Behind the Gate', world: 'hub', hint: 'Great doors have back sides. Someone left a terminal there.' },
  { id: 'hidden-cabinet', name: 'The Machine That Will Not Play', world: 'arcade', hint: 'An out-of-order cabinet hides more than broken wiring.' },
  { id: 'light-sequence', name: 'Light Memory', world: 'arcade', hint: 'A poster on the street remembers an order of colours.' },
]

export interface PrizeDef {
  item: string
  price: number
}

export const PRIZES: PrizeDef[] = [
  { item: 'neon-visor', price: 8 },
  { item: 'pixel-cape', price: 14 },
]

export interface CabinetDef {
  id: 'serpent' | 'lancer'
  title: string
  tagline: string
  target: number
  color: string
}

export const CABINETS: Record<CabinetDef['id'], CabinetDef> = {
  serpent: { id: 'serpent', title: 'NEON SERPENT', tagline: 'Eat the light. Never bite your tail.', target: 100, color: '#3dff8b' },
  lancer: { id: 'lancer', title: 'STAR LANCER', tagline: 'Hold the line against the descending swarm.', target: 300, color: '#ff2bd6' },
}

export const RACE_FAST_TIME = 45

export const FOUNDER_RIDDLE = [
  'Three locks guard the Founder’s final prize.',
  'The first key rests where players play,',
  'behind the one machine that will not play.',
  'Push past the broken — copper lights the way.',
]

/** Light sequence used by the Arcade District secret. */
export const LIGHT_SEQUENCE = ['sun', 'sky', 'bloom'] as const
export const LIGHT_PADS: { id: string; label: string; color: string }[] = [
  { id: 'sky', label: 'SKY', color: '#00f0ff' },
  { id: 'bloom', label: 'BLOOM', color: '#ff2bd6' },
  { id: 'sun', label: 'SUN', color: '#ffe14d' },
  { id: 'leaf', label: 'LEAF', color: '#3dff8b' },
]
