import type { AvatarConfig } from './avatar'
import type { Vec3, WorldId } from './content'
import type { Progress } from '../store/useGame'

export type DAction =
  | { type: 'trade'; give?: string; giveCoins?: number; get?: string; getCoins?: number; flag?: string }
  | { type: 'flag'; flag: string }
  | { type: 'journal'; id: string }
  | { type: 'market' }
  | { type: 'close' }
  | { type: 'accept'; quest: string }
  | { type: 'turnin'; quest: string }

export interface DOption {
  label: string
  next?: string
  action?: DAction
  /** Only shown when this returns true. */
  if?: (p: Progress) => boolean
}

export interface DNode {
  text: string
  options: DOption[]
}

export interface NpcDef {
  id: string
  name: string
  title: string
  world: WorldId
  pos: Vec3
  /** How far the NPC strolls from home (0 = stays put). */
  wander: number
  color: string
  look: Partial<AvatarConfig>
  /** Dialogue nodes; 'start' is the entry point. Quest offers/turn-ins are added automatically. */
  nodes: (p: Progress) => Record<string, DNode>
}

const back: DOption = { label: 'Something else…', next: 'start' }
const bye: DOption = { label: 'See you around.', action: { type: 'close' } }

export const NPCS: NpcDef[] = [
  {
    id: 'glimmer',
    name: 'Glimmer',
    title: 'Plaza guide',
    world: 'hub',
    pos: [-3.5, 0, 28.5],
    wander: 1.5,
    color: '#00f0ff',
    look: { body: 'slim', head: 'round', face: 'bright', eyes: '#00f0ff', hair: 'bun', hairColor: '#ff2bd6', outfit: 'hoodie', primary: '#24124a', secondary: '#0b2a4a', accent: '#00f0ff', headGear: 'halo', backGear: 'wings' },
    nodes: (p) => ({
      start: {
        text: p.items.includes('founder-egg')
          ? 'You found the Egg! …and then the sky turned red. That’s the Consortium’s Null Protocol. The Null Citadel portal opened beside the south plaza — everyone’s counting on you.'
          : 'Hi hi! I’m Glimmer — I help new arrivals find their way. The OASIS just grew: three new worlds opened in the north and east of the plaza!',
        options: [
          { label: 'Tell me about the new worlds.', next: 'worlds' },
          { label: 'What are those red clouds?', next: 'null', if: (q) => q.items.includes('founder-egg') },
          { label: 'Any tips?', next: 'tips' },
          bye,
        ],
      },
      worlds: {
        text: 'Neon Heights is a vertical city — ride the lifts and jump pads, the best views are on the roofs. The Aether Isles float above the clouds, all castles and old magic. And the Null Sector… it’s where broken data goes to die. Bring patience.',
        options: [back, bye],
      },
      null: {
        text: 'The Null Protocol wipes everything that isn’t owned. Before you go in, remember what the trials taught you: the marks in order, the lights, the memories. The last door will ask.',
        options: [{ label: 'I’ll remember.', action: { type: 'journal', id: 'null-protocol' } }, back],
      },
      tips: {
        text: 'Press L for your quest log and J for your journal. Residents like me give quests — finish them and we’ll pay you back. Oh, and if the sky rains coins, run!',
        options: [back, bye],
      },
    }),
  },
  {
    id: 'mercer',
    name: 'Mercer',
    title: 'OASIS Exchange trader',
    world: 'hub',
    pos: [18.5, 0, 13],
    wander: 0,
    color: '#ffe14d',
    look: { body: 'bulky', head: 'angular', face: 'narrow', eyes: '#ffe14d', hair: 'swoop', hairColor: '#f2d16b', outfit: 'jacket', primary: '#4a3a10', secondary: '#141428', accent: '#ffe14d', armour: 'none', headGear: 'goggles', backGear: 'none' },
    nodes: () => ({
      start: {
        text: 'Mercer, at your service. Coins in, cosmetics out — earned coins only, I don’t take real money. Never have, never will.',
        options: [
          { label: 'Show me the Exchange.', action: { type: 'market' } },
          { label: 'Buy my Champion Ticket? (12 coins)', action: { type: 'trade', give: 'champion-ticket', getCoins: 12 }, if: (p) => p.items.includes('champion-ticket') },
          { label: 'Where do coins come from?', next: 'coins' },
          bye,
        ],
      },
      coins: { text: 'Coins lie around every world, quests pay well, arcade prizes too — and you level up with experience. Nobody ever got rich in here by buying.', options: [back, bye] },
    }),
  },
  {
    id: 'patch',
    name: 'Patch',
    title: 'Help-desk engineer',
    world: 'hub',
    pos: [-19, 0, -19],
    wander: 2,
    color: '#3dff8b',
    look: { body: 'standard', head: 'bot', face: 'pixel', eyes: '#3dff8b', hair: 'none', outfit: 'jumpsuit', primary: '#0f4038', secondary: '#141428', accent: '#3dff8b', headGear: 'antenna', backGear: 'none' },
    nodes: () => ({
      start: {
        text: 'Oh! A user! Sorry — I mean a player. I’m Patch. I keep the help-desk running. Well. Kept. The backup drifted into the Null Sector and I am… not brave.',
        options: [{ label: 'What’s the Null Sector like?', next: 'sector' }, bye],
      },
      sector: { text: 'Corrupted pools that bite, static storms that strike where the ground flashes red, floors that fall. Touch the green beacons — they remember where you were.', options: [back, bye] },
    }),
  },
  {
    id: 'oldbyte',
    name: 'Old Byte',
    title: 'Retired arcade champion',
    world: 'hub',
    pos: [5, 0, -30],
    wander: 1.5,
    color: '#ff9a4d',
    look: { body: 'bulky', head: 'round', face: 'narrow', eyes: '#ffffff', hair: 'crop', hairColor: '#f4f4f4', skin: '#c98e68', outfit: 'racer', primary: '#3a0d3f', secondary: '#7a1030', accent: '#ff9a4d', headGear: 'headphones', backGear: 'none' },
    nodes: (p) => ({
      start: {
        text: 'Heh. Another kid with quick thumbs. I held every high score on every cabinet in this plaza once. The Founder himself lost to me at Neon Serpent. Twice.',
        options: [
          { label: 'Did you know the Founder?', next: 'founder' },
          { label: 'Trade the Founder’s Quarter (15 coins + a story)', action: { type: 'trade', give: 'founder-quarter', getCoins: 15, flag: 'quarter-traded' }, if: (q) => q.items.includes('founder-quarter') && !q.flags.includes('quarter-traded') },
          { label: 'Any advice for the hunt?', next: 'hunt', if: () => p.glyphs.length < 6 },
          bye,
        ],
      },
      founder: { text: 'Quiet type. Always kept two controllers plugged in. Never said why. Everything he hid, he hid in order — numbered, dated, sequenced. Remember that.', options: [back, bye] },
      hunt: { text: 'The marks? Each one points to the next. And the cipher wants them in the order they’re numbered, not the order you find them.', options: [back, bye] },
    }),
  },
  {
    id: 'vex',
    name: 'Captain Vex',
    title: 'Grand Prix veteran',
    world: 'hub',
    pos: [8, 0, 39],
    wander: 2,
    color: '#ff2bd6',
    look: { body: 'slim', head: 'oval', face: 'visor', eyes: '#ff2bd6', hair: 'long', hairColor: '#101018', skin: '#3f2717', outfit: 'racer', primary: '#1a1a1a', secondary: '#7a1030', accent: '#ff2bd6', armour: 'pauldrons', headGear: 'none', backGear: 'none' },
    nodes: () => ({
      start: {
        text: 'Vex. I race. You look like you walk. Fix that.',
        options: [{ label: 'Any racing tips?', next: 'tips' }, bye],
      },
      tips: { text: 'Drift through the long bends — it charges your boost. Save the boost for the ramp. And never trust the left lane on the highway. Ever.', options: [back, bye] },
    }),
  },
  {
    id: 'dash',
    name: 'Dash',
    title: 'Rooftop courier',
    world: 'city',
    pos: [4, 0, 22],
    wander: 2,
    color: '#ffe14d',
    look: { body: 'slim', head: 'round', face: 'bright', eyes: '#ffe14d', hair: 'spikes', hairColor: '#ffe14d', skin: '#a0673f', outfit: 'jacket', primary: '#141428', secondary: '#4a3a10', accent: '#ffe14d', headGear: 'goggles', backGear: 'jetpack' },
    nodes: () => ({
      start: {
        text: 'Yo! Dash, fastest courier in Neon Heights. The lifts are for tourists — the jump pads are where it’s at.',
        options: [{ label: 'How do I get up high?', next: 'up' }, bye],
      },
      up: { text: 'Green pads launch you, blue platforms lift you. And that big billboard on the east tower? Look behind it. Just saying.', options: [back, bye] },
    }),
  },
  {
    id: 'ysolde',
    name: 'Dame Ysolde',
    title: 'Knight of the Aether Isles',
    world: 'fantasy',
    pos: [0, 0, 14],
    wander: 1,
    color: '#9fe8ff',
    look: { body: 'standard', head: 'angular', face: 'narrow', eyes: '#9fe8ff', hair: 'long', hairColor: '#f4f4f4', skin: '#e8b896', outfit: 'jumpsuit', primary: '#e8e8f0', secondary: '#0b2a4a', accent: '#9fe8ff', armour: 'full', headGear: 'none', backGear: 'blade' },
    nodes: (p) => ({
      start: {
        text: 'Hail, traveller. I am Ysolde, sworn to these isles since the Founder raised them from the clouds.',
        options: [
          { label: 'I have a package from Dash.', action: { type: 'trade', give: 'sealed-package', get: 'ysolde-token', flag: 'courier-delivered' }, if: (q) => q.items.includes('sealed-package') },
          { label: 'Tell me about the statues.', next: 'statues' },
          { label: 'What is this place?', next: 'lore' },
          bye,
        ],
      },
      statues: { text: 'Three guardians stand on the ruin island. Turn each to face the crystal obelisk and the old bridge will remember itself. Above, in the garden, the runes on the floor hide a door — step on them all.', options: [back, bye] },
      lore: { text: p.trials.includes('past') ? 'The Founder built these isles for a friend who loved castles. You have seen that memory, I think.' : 'The Founder built these isles for someone. He never said for whom.', options: [back, bye] },
    }),
  },
  {
    id: 'echo',
    name: 'Echo',
    title: 'A fading player',
    world: 'wasteland',
    pos: [-6, 0, 14],
    wander: 1,
    color: '#c8c8ff',
    look: { body: 'slim', head: 'oval', face: 'visor', eyes: '#c8c8ff', hair: 'none', skin: '#c7a6ff', outfit: 'hoodie', primary: '#24124a', secondary: '#1a1a1a', accent: '#c8c8ff', headGear: 'none', backGear: 'wings' },
    nodes: () => ({
      start: {
        text: '…you can see me? Most players walk straight through. I’m Echo. I logged off years ago and left this behind.',
        options: [{ label: 'What happened here?', next: 'what' }, bye],
      },
      what: { text: 'The Null Sector is where the Consortium dumps what it can’t sell. Walls here lie — some flicker because they aren’t really there. Look for the one that glitches.', options: [back, bye] },
    }),
  },
]

export const npcById = (id: string) => NPCS.find((n) => n.id === id)!
