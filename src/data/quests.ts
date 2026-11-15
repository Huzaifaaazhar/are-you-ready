import type { Progress } from '../store/useGame'

/** Objective progress is derived purely from saved progress, so it can never drift out of sync. */
export interface ObjectiveDef {
  text: string
  target: number
  count: (p: Progress) => number
}

export interface QuestDef {
  id: string
  title: string
  kind: 'main' | 'side'
  /** NPC who offers and receives the quest (null = automatic). */
  giver: string | null
  summary: string
  objectives: ObjectiveDef[]
  reward: { coins: number; xp: number; items?: string[]; journal?: string }
  /** Item granted when the quest is accepted. */
  grants?: string
  /** Items taken back on turn-in. */
  consumes?: string[]
  available?: (p: Progress) => boolean
}

const flag = (f: string) => (p: Progress) => (p.flags.includes(f) ? 1 : 0)
const has = (i: string) => (p: Progress) => (p.items.includes(i) ? 1 : 0)
const relics = (prefix: string) => (p: Progress) => p.relics.filter((r) => r.startsWith(prefix)).length

export const QUESTS: QuestDef[] = [
  {
    id: 'q-null',
    title: 'The Null Protocol',
    kind: 'main',
    giver: null,
    summary: 'The Consortium answered your victory with the Null Protocol — a program that will erase the OASIS. Breach the Null Citadel and decide what the OASIS becomes.',
    objectives: [
      { text: 'Enter the Null Citadel (portal in OASIS Prime)', target: 1, count: flag('sd-entered') },
      { text: 'Break through the firewall', target: 1, count: flag('sd-infil') },
      { text: 'Open the Founder’s last door', target: 1, count: flag('sd-puzzle') },
      { text: 'Defeat the Null Titan', target: 1, count: flag('sd-boss') },
      { text: 'Make your choice at the Core', target: 1, count: (p) => (p.endings.length > 0 ? 1 : 0) },
    ],
    reward: { coins: 100, xp: 500 },
    available: (p) => p.items.includes('founder-egg'),
  },
  {
    id: 'q-explorer',
    title: 'Beyond the Plaza',
    kind: 'side',
    giver: 'glimmer',
    summary: 'Glimmer wants a first-hand report from the three new worlds: Neon Heights, the Aether Isles and the Null Sector.',
    objectives: [{ text: 'Visit Neon Heights, the Aether Isles and the Null Sector', target: 3, count: (p) => ['city', 'fantasy', 'wasteland'].filter((w) => p.visited.includes(w as never)).length }],
    reward: { coins: 30, xp: 150 },
  },
  {
    id: 'q-rooftop',
    title: 'Rooftop Runner',
    kind: 'side',
    giver: 'dash',
    summary: 'Dash says only real couriers have stood in the Skyline Garden — a hidden rooftop above Neon Heights. Find it, and grab the city’s Neon Sigils on the way.',
    objectives: [
      { text: 'Reach the hidden Skyline Garden', target: 1, count: flag('city-rooftop') },
      { text: 'Collect the Neon Sigils', target: 6, count: relics('sigil-') },
    ],
    reward: { coins: 20, xp: 200, items: ['hoverboard'] },
  },
  {
    id: 'q-courier',
    title: 'Special Delivery',
    kind: 'side',
    giver: 'dash',
    summary: 'Dash has a sealed package for Dame Ysolde in the Aether Isles. Deliver it and bring back her token as a receipt.',
    grants: 'sealed-package',
    objectives: [
      { text: 'Hand the package to Dame Ysolde', target: 1, count: flag('courier-delivered') },
      { text: 'Bring Ysolde’s token back to Dash', target: 1, count: has('ysolde-token') },
    ],
    consumes: ['ysolde-token'],
    reward: { coins: 30, xp: 150 },
  },
  {
    id: 'q-artefact',
    title: 'The Aether Crystal',
    kind: 'side',
    giver: 'ysolde',
    summary: 'A crystal of pure memory is hidden somewhere above the Aether Isles. The old statues and a secret portal guard the way.',
    objectives: [
      { text: 'Turn the three guardian statues toward the obelisk', target: 1, count: flag('fantasy-bridge') },
      { text: 'Discover the secret portal', target: 1, count: flag('fantasy-secret') },
      { text: 'Recover the Aether Crystal', target: 1, count: has('aether-crystal') },
    ],
    reward: { coins: 25, xp: 200, items: ['aura-frost'] },
  },
  {
    id: 'q-lostdata',
    title: 'Lost Data',
    kind: 'side',
    giver: 'patch',
    summary: 'Patch lost a backup of the OASIS help-desk in the Null Sector. Three data shards would be enough to restore it.',
    objectives: [{ text: 'Recover data shards in the Null Sector', target: 3, count: relics('shard-') }],
    reward: { coins: 25, xp: 180, items: ['aura-glitch'] },
  },
  {
    id: 'q-ghost',
    title: 'The Last Save',
    kind: 'side',
    giver: 'echo',
    summary: 'Echo is what is left of a player who logged off for good. Somewhere behind a glitched wall is their last saved state.',
    objectives: [
      { text: 'Find the hidden passage in the Null Sector', target: 1, count: flag('waste-passage') },
      { text: 'Recover the Ghost Byte', target: 1, count: has('ghost-byte') },
    ],
    consumes: ['ghost-byte'],
    reward: { coins: 30, xp: 150, journal: 'last-door' },
  },
  {
    id: 'q-legend',
    title: 'Arcade Legend',
    kind: 'side',
    giver: 'oldbyte',
    summary: 'Old Byte will hand down his jacket to anyone who beats the target on three different Pixel Palace cabinets.',
    objectives: [{ text: 'Beat the target on three different cabinets', target: 3, count: (p) => p.claimedCabinets.length }],
    reward: { coins: 20, xp: 200, items: ['legend-jacket'] },
  },
  {
    id: 'q-timetrial',
    title: 'Against the Clock',
    kind: 'side',
    giver: 'vex',
    summary: 'Captain Vex wants to see real speed: under 50 seconds on the plaza’s Velocity Circuit, or under 60 in the Grand Prix.',
    objectives: [{ text: 'Velocity Circuit under 50s or Grand Prix under 60s', target: 1, count: (p) => ((p.bestRace !== null && p.bestRace < 50) || (p.gpBest !== null && p.gpBest < 60) ? 1 : 0) }],
    reward: { coins: 20, xp: 150, items: ['paint-chrome'] },
  },
]

export const questById = (id: string) => QUESTS.find((q) => q.id === id)!

export function objectiveProgress(q: QuestDef, p: Progress) {
  return q.objectives.map((o) => Math.min(o.target, o.count(p)))
}

export function questComplete(q: QuestDef, p: Progress) {
  return q.objectives.every((o) => o.count(p) >= o.target)
}
