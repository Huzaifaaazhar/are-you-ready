/** Static game content: worlds, achievements, items, secrets, prizes and objectives. */

export type WorldId = 'hub' | 'arcade' | 'race' | 'past' | 'present' | 'future'
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
  { id: 'gp-finish', title: 'Grand Prix Finisher', desc: 'Finish the Velocity City Grand Prix.', glyph: '⚑' },
  { id: 'gp-fast', title: 'Redline', desc: 'Finish the Grand Prix in under 60 seconds.', glyph: '⚡' },
  { id: 'gp-reverse', title: 'Look Back', desc: 'Discover the hidden route in Velocity City.', glyph: '↺' },
  { id: 'space-ace', title: 'Space Ace', desc: 'Beat Star Lancer’s target score.', glyph: '✈' },
  { id: 'platform-hero', title: 'Glitch Hopper', desc: 'Reach the core at the end of Glitch Hop.', glyph: '▲' },
  { id: 'arena-champ', title: 'Grid Gladiator', desc: 'Survive five waves in the Digital Arena.', glyph: '⚔' },
  { id: 'trial-past', title: 'Trial I: The Past', desc: 'Restore the Founder’s lost memory.', glyph: 'Ⅰ' },
  { id: 'trial-present', title: 'Trial II: The Present', desc: 'Refuse the Consortium and expose its plan.', glyph: 'Ⅱ' },
  { id: 'trial-future', title: 'Trial III: The Future', desc: 'Light the Blueprint and build your monument.', glyph: 'Ⅲ' },
  { id: 'glyphs-all', title: 'Cipher Keeper', desc: 'Find all six of the Founder’s hidden marks.', glyph: '❖' },
  { id: 'egg', title: 'The Founder’s Egg', desc: 'Open the Founder’s Vault and claim the Egg.', glyph: '◒' },
  { id: 'level-5', title: 'Seasoned Player', desc: 'Reach player level 5.', glyph: '⬆' },
]

export interface ItemDef {
  id: string
  name: string
  desc: string
  glyph: string
  color: string
  /** If set, this item can be equipped on the avatar. */
  equip?: { slot: 'headGear' | 'backGear' | 'outfit' | 'armour'; value: string }
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
  journal: { id: 'journal', name: 'Hunter’s Journal', desc: 'Records every clue, mark and memory you uncover. Press J to read it.', glyph: '✎', color: '#ffe14d' },
  'cobalt-key': { id: 'cobalt-key', name: 'Cobalt Key', desc: 'Earned in the Founder’s memory archive. Opens the second lock of the Founder’s Gate.', glyph: '⚿', color: '#4d7cff' },
  'prism-key': { id: 'prism-key', name: 'Prism Key', desc: 'Taken from the Consortium Tower. Opens the third lock of the Founder’s Gate.', glyph: '⚿', color: '#e0e0ff' },
  'founder-egg': { id: 'founder-egg', name: 'The Founder’s Egg', desc: 'The prize at the end of the hunt. It hums with every game ever played in the OASIS.', glyph: '◒', color: '#ffe14d' },
  'racer-helmet': { id: 'racer-helmet', name: 'Racer Helmet', desc: 'Awarded for finishing the Velocity City Grand Prix.', glyph: '⛑', color: '#3dff8b', equip: { slot: 'headGear', value: 'racer-helmet' } },
  'orbital-drones': { id: 'orbital-drones', name: 'Orbital Drones', desc: 'Two loyal drones that orbit your avatar. Star Lancer prize.', glyph: '⁘', color: '#ff2bd6', equip: { slot: 'backGear', value: 'drones' } },
  'pixel-suit': { id: 'pixel-suit', name: 'Pixel Suit', desc: 'An outfit stitched from Glitch Hop’s tiles.', glyph: '▦', color: '#3dff8b', equip: { slot: 'outfit', value: 'pixel-suit' } },
  'gladiator-armour': { id: 'gladiator-armour', name: 'Gladiator Rig', desc: 'Armour worn by Digital Arena champions.', glyph: '⚔', color: '#ff4d4d', equip: { slot: 'armour', value: 'gladiator' } },
  'archivist-coat': { id: 'archivist-coat', name: 'Archivist Coat', desc: 'A long coat that smells faintly of old cartridges. Trial I reward.', glyph: '❦', color: '#ff9a4d', equip: { slot: 'outfit', value: 'archivist' } },
  'vanguard-armour': { id: 'vanguard-armour', name: 'Vanguard Armour', desc: 'Armour for those who refused to sell the OASIS. Trial II reward.', glyph: '⛨', color: '#4d7cff', equip: { slot: 'armour', value: 'vanguard' } },
  'founder-crown': { id: 'founder-crown', name: 'Architect’s Crown', desc: 'A crown of floating light. Trial III reward.', glyph: '♛', color: '#ffe14d', equip: { slot: 'headGear', value: 'crown' } },
}

export interface VehicleDef {
  id: 'volt' | 'brick' | 'wisp'
  name: string
  tagline: string
  /** How to unlock (shown in the garage). */
  unlock: string
  color: string
  stats: { speed: number; accel: number; grip: number; weight: number }
  /** Physics tuning: mass kg, accel m/s², top speed m/s, boost accel m/s², steer rad, tyre grip, side stiffness, drift side stiffness. */
  tune: { mass: number; accel: number; maxSpeed: number; boost: number; steer: number; frictionSlip: number; sideFriction: number; driftSide: number }
}

export const VEHICLES: VehicleDef[] = [
  {
    id: 'volt', name: 'Volt Runner', tagline: 'Balanced street racer. Forgiving grip, eager boost.', unlock: 'Starter vehicle', color: '#00f0ff',
    stats: { speed: 3, accel: 3, grip: 3, weight: 2 },
    tune: { mass: 900, accel: 11, maxSpeed: 34, boost: 9, steer: 0.5, frictionSlip: 2.6, sideFriction: 1.3, driftSide: 0.45 },
  },
  {
    id: 'brick', name: 'Brick Mk II', tagline: 'Armoured hauler. Glued to the road and shrugs off debris.', unlock: 'Finish the Grand Prix once', color: '#ffe14d',
    stats: { speed: 2, accel: 2, grip: 5, weight: 5 },
    tune: { mass: 1800, accel: 9, maxSpeed: 30, boost: 9, steer: 0.45, frictionSlip: 3.4, sideFriction: 1.8, driftSide: 0.6 },
  },
  {
    id: 'wisp', name: 'Wisp GT', tagline: 'Featherweight hypercar. Blistering top speed, loves to slide.', unlock: 'Buy at the garage for 20 coins', color: '#ff2bd6',
    stats: { speed: 5, accel: 4, grip: 2, weight: 1 },
    tune: { mass: 650, accel: 13, maxSpeed: 39, boost: 10, steer: 0.52, frictionSlip: 2.2, sideFriction: 1.0, driftSide: 0.32 },
  },
]
export const WISP_PRICE = 20
export const GP_FAST_TIME = 60

/** The Founder's six hidden marks. Points are 2D polylines in a -1..1 box (y down). */
export interface GlyphDef {
  index: number
  name: string
  world: WorldId
  where: string
  /** Hint toward the NEXT mark, revealed when this one is found. */
  next: string
  paths: [number, number][][]
}

const circle = (r: number, n = 20, cx = 0, cy = 0): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r])

export const GLYPHS: GlyphDef[] = [
  { index: 1, name: 'The Sun', world: 'hub', where: 'Hidden terminal behind the Founder’s Gate', next: 'The next mark is carved beneath the spire’s rings, on the side of the plinth that faces the arcade portal.', paths: [circle(0.8), circle(0.18)] },
  { index: 2, name: 'The Gate', world: 'hub', where: 'North face of the central spire’s plinth', next: 'The next mark hides where the broken machine kept its secret: the Founder’s storage room in the Arcade District.', paths: [[[0, -0.85], [0.85, 0.7], [-0.85, 0.7], [0, -0.85]], [[0, 0.7], [0, 0.05]]] },
  { index: 3, name: 'The Key', world: 'arcade', where: 'Founder’s storage room, Arcade District', next: 'The next mark waits at the end of GLITCH HOP. Reach the core and read the door.', paths: [[[0, -0.9], [0.55, -0.2], [0, 0.5], [-0.55, -0.2], [0, -0.9]], [[0, 0.5], [0, 0.95]], [[0, 0.75], [0.3, 0.75]]] },
  { index: 4, name: 'The Star', world: 'arcade', where: 'The core chamber at the end of Glitch Hop', next: 'In Velocity City, the fastest way forward begins behind you. Drive backwards from the starting grid.', paths: [[[0, -0.9], [0.22, -0.25], [0.88, -0.25], [0.35, 0.15], [0.55, 0.85], [0, 0.42], [-0.55, 0.85], [-0.35, 0.15], [-0.88, -0.25], [-0.22, -0.25], [0, -0.9]]] },
  { index: 5, name: 'The Road', world: 'race', where: 'The hidden undercity route in Velocity City', next: 'The Founder kept one last thing under the bed in the memory archive. Look there during Trial I.', paths: [[[-0.6, 0.9], [-0.2, -0.9]], [[0.6, 0.9], [0.2, -0.9]], [[-0.35, 0.1], [0, -0.25], [0.35, 0.1]]] },
  { index: 6, name: 'The Heart', world: 'past', where: 'Under the bed in the Founder’s basement memory', next: 'Six marks found. Enter them in order on the cipher lock at the hidden terminal behind the Founder’s Gate.', paths: [circle(0.85, 6), [[-0.6, -0.4], [0.6, 0.4]], [[-0.6, 0.4], [0.6, -0.4]]] },
]

export interface JournalEntry {
  id: string
  title: string
  text: string
  category: 'clue' | 'memory' | 'mark' | 'trial'
}

export const JOURNAL: Record<string, JournalEntry> = {
  riddle: { id: 'riddle', title: 'The Founder’s riddle', category: 'clue', text: 'Three locks guard the Founder’s final prize. The first key rests behind the one machine that will not play — copper lights the way.' },
  lights: { id: 'lights', title: 'The lights remember', category: 'clue', text: 'A faded poster in the Arcade District: first the SUN, then the SKY, then the BLOOM. Someone uses this order as a password.' },
  trials: { id: 'trials', title: 'Three trials', category: 'trial', text: 'Behind the Founder’s Gate wait three trials: the Past, the Present and the Future. Each trial’s key opens the next lock. Only a Grand Prix finisher may enter.' },
  'mem-ticket': { id: 'mem-ticket', title: 'Memory: the arcade ticket (summer 1986)', category: 'memory', text: '“The day I met Rook at the Starport Arcade. They beat my high score on my favourite cabinet. I hated them for a whole week. Then we were inseparable.”' },
  'mem-map': { id: 'mem-map', title: 'Memory: graph-paper levels (winter 1987)', category: 'memory', text: '“Rook drew the levels on graph paper; I wrote the code. The basement smelled of solder and pizza. We promised to make a game together.”' },
  'mem-cart': { id: 'mem-cart', title: 'Memory: the prototype cartridge (spring 1989)', category: 'memory', text: '“Our first finished game. Rook wanted to give it away for free so everyone could play. I wanted to sell it. We argued all night.”' },
  'mem-letter': { id: 'mem-letter', title: 'Memory: the unanswered letter (autumn 1989)', category: 'memory', text: '“Rook moved away and wrote to me. I sold our game under my name alone and never wrote back. I kept Rook’s controller under my bed, in case they came back for a rematch. Their chair has been empty ever since.”' },
  'mem-controller': { id: 'mem-controller', title: 'Memory: the second controller', category: 'memory', text: '“Everything I built after that was a way of saying sorry. The OASIS is free to enter because Rook was right.”' },
  consortium: { id: 'consortium', title: 'The Consortium', category: 'clue', text: 'A corporation wants to own the OASIS and charge for every door. Their tower holds the Prism Key — and an offer they expect players to accept.' },
  blueprint: { id: 'blueprint', title: 'The Blueprint', category: 'clue', text: 'The Future is a construction space. Route the emitter’s light into all three receivers with the pieces you are given. Keep the light away from corruption.' },
}

export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000]
export function levelFor(xp: number) {
  let l = 1
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) l = i + 1
  return l
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
  id: 'serpent' | 'lancer' | 'glitchhop' | 'gladiator'
  title: string
  tagline: string
  /** Score needed for the one-time reward. */
  target: number
  color: string
  reward: string
  achievement: string
  targetLabel?: string
}

export const CABINETS: Record<CabinetDef['id'], CabinetDef> = {
  serpent: { id: 'serpent', title: 'NEON SERPENT', tagline: 'Eat the light. Never bite your tail.', target: 100, color: '#3dff8b', reward: 'champion-ticket', achievement: 'arcade-ace' },
  lancer: { id: 'lancer', title: 'STAR LANCER', tagline: 'Top-down space battle. Collect power-ups, survive the waves.', target: 1500, color: '#ff2bd6', reward: 'orbital-drones', achievement: 'space-ace' },
  glitchhop: { id: 'glitchhop', title: 'GLITCH HOP', tagline: 'Pixel platformer. Collect bits, dodge hazards, reach the core.', target: 500, color: '#3dff8b', reward: 'pixel-suit', achievement: 'platform-hero', targetLabel: 'reach the core' },
  gladiator: { id: 'gladiator', title: 'GRID GLADIATOR', tagline: 'Arena survival. Dash, strike, and outlast the waves.', target: 5, color: '#ff4d4d', reward: 'gladiator-armour', achievement: 'arena-champ', targetLabel: 'survive wave 5' },
}
export type CabinetId = CabinetDef['id']

export const RACE_FAST_TIME = 45

export const FOUNDER_RIDDLE = [
  'Three locks guard the Founder’s final prize.',
  'The first key rests where players play,',
  'behind the one machine that will not play.',
  'Push past the broken — copper lights the way.',
]

export const TRIALS = [
  { id: 'past', lock: 1, name: 'The Past', subtitle: 'The Founder’s Memory Archive', color: '#ff9a4d', key: 'cobalt-key' },
  { id: 'present', lock: 2, name: 'The Present', subtitle: 'Consortium Tower', color: '#4d7cff', key: 'prism-key' },
  { id: 'future', lock: 3, name: 'The Future', subtitle: 'The Blueprint', color: '#e0e0ff', key: null },
] as const
export type TrialId = (typeof TRIALS)[number]['id']
/** Key that opens lock N (1-based). */
export const LOCK_KEYS = ['copper-key', 'cobalt-key', 'prism-key'] as const

/** Light sequence used by the Arcade District secret. */
export const LIGHT_SEQUENCE = ['sun', 'sky', 'bloom'] as const
export const LIGHT_PADS: { id: string; label: string; color: string }[] = [
  { id: 'sky', label: 'SKY', color: '#00f0ff' },
  { id: 'bloom', label: 'BLOOM', color: '#ff2bd6' },
  { id: 'sun', label: 'SUN', color: '#ffe14d' },
  { id: 'leaf', label: 'LEAF', color: '#3dff8b' },
]
