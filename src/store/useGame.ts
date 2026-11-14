import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { type AvatarConfig, DEFAULT_AVATAR, sanitizeAvatar } from '../data/avatar'
import { useCreator } from './useCreator'
import { ACHIEVEMENTS, CABINETS, ITEMS, PRIZES, RACE_FAST_TIME, SECRETS, type WorldId } from '../data/content'
import { TOTAL_COINS, WORLDS } from '../game/world/registry'
import { sfx } from '../game/systems/audio'

export type Phase = 'boot' | 'title' | 'creator' | 'world'

export type Overlay =
  | { type: 'pause' }
  | { type: 'settings' }
  | { type: 'inventory' }
  | { type: 'profile' }
  | { type: 'achievements' }
  | { type: 'map' }
  | { type: 'shop' }
  | { type: 'gate' }
  | { type: 'scores' }
  | { type: 'arcade'; game: 'serpent' | 'lancer' }
  | { type: 'info'; title: string; body: string[]; accent?: string }

export interface Toast {
  id: number
  title: string
  body?: string
  kind: 'coin' | 'achievement' | 'item' | 'secret' | 'info' | 'error'
}

export interface Settings {
  /** 'mouse' uses pointer-lock mouse look. 'assist' never locks the pointer: drag or arrow keys turn the camera, which also auto-follows. */
  controlMode: 'mouse' | 'assist'
  sensitivity: number
  invertY: boolean
  quality: 'high' | 'low'
  muted: boolean
  volume: number
  touch: 'auto' | 'on' | 'off'
  reducedMotion: boolean
}

export interface Progress {
  wallet: number
  collected: string[]
  items: string[]
  achievements: string[]
  secrets: string[]
  visited: WorldId[]
  bestRace: number | null
  highScores: Record<string, number>
  claimedCabinets: string[]
  gateOpened: boolean
  oracleIndex: number
}

export interface RaceState {
  status: 'idle' | 'countdown' | 'running'
  countdownEnd: number
  startedAt: number
  next: number
  lastTime: number | null
}

const initialProgress = (): Progress => ({
  wallet: 0,
  collected: [],
  items: [],
  achievements: [],
  secrets: [],
  visited: [],
  bestRace: null,
  highScores: {},
  claimedCabinets: [],
  gateOpened: false,
  oracleIndex: 0,
})

const defaultSettings: Settings = {
  controlMode: 'mouse',
  sensitivity: 1,
  invertY: false,
  quality: 'high',
  muted: false,
  volume: 0.7,
  touch: 'auto',
  reducedMotion: false,
}

interface GameState {
  phase: Phase
  /** Where the avatar creator returns to. */
  creatorReturn: 'title' | 'world'
  avatar: AvatarConfig | null
  worldId: WorldId
  spawnId: string
  /** Increments every time the world (re)spawns, used as a React key. */
  worldEpoch: number
  transition: { active: boolean; label: string }
  overlay: Overlay | null
  prompt: { label: string; id: string } | null
  toasts: Toast[]
  locationBanner: number
  energy: number
  pointerLocked: boolean
  /** True while a world chunk / physics engine is still loading. */
  worldLoading: boolean
  race: RaceState
  progress: Progress
  settings: Settings

  setPhase: (p: Phase) => void
  openCreator: (from: 'title' | 'world') => void
  saveAvatar: (a: AvatarConfig) => void
  enterWorld: () => void
  travel: (world: WorldId, spawnId?: string) => void
  openOverlay: (o: Overlay) => void
  closeOverlay: () => void
  setPrompt: (p: GameState['prompt']) => void
  toast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  collectCoin: (id: string) => void
  grantItem: (id: string, silent?: boolean) => void
  discoverSecret: (id: string) => void
  unlock: (id: string) => void
  addWallet: (n: number) => void
  redeemPrize: (item: string) => boolean
  equipItem: (item: string) => void
  reportScore: (game: 'serpent' | 'lancer', score: number) => { best: boolean; reward: boolean }
  openGate: () => void
  nextOracle: () => number
  startRace: () => void
  raceCheckpoint: (index: number, total: number) => void
  cancelRace: () => void
  setEnergy: (e: number) => void
  setPointerLocked: (v: boolean) => void
  updateSettings: (s: Partial<Settings>) => void
  resetProgress: () => void
}

let toastId = 1

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      phase: 'boot',
      creatorReturn: 'title',
      avatar: null,
      worldId: 'hub',
      spawnId: 'default',
      worldEpoch: 0,
      transition: { active: false, label: '' },
      overlay: null,
      prompt: null,
      toasts: [],
      locationBanner: 0,
      energy: 100,
      pointerLocked: false,
      worldLoading: false,
      race: { status: 'idle', countdownEnd: 0, startedAt: 0, next: 0, lastTime: null },
      progress: initialProgress(),
      settings: defaultSettings,

      setPhase: (phase) => set({ phase }),

      openCreator: (from) => {
        if (document.pointerLockElement) document.exitPointerLock()
        useCreator.getState().setDraft({ ...(get().avatar ?? DEFAULT_AVATAR) })
        set({ phase: 'creator', creatorReturn: from, overlay: null, prompt: null })
      },

      saveAvatar: (a) => {
        const avatar = sanitizeAvatar(a, get().progress.items)
        set({ avatar })
        get().unlock('avatar')
      },

      enterWorld: () => {
        const { worldId } = get()
        set((s) => ({
          phase: 'world',
          overlay: null,
          worldEpoch: s.worldEpoch + 1,
          locationBanner: Date.now(),
          progress: s.progress.visited.includes(worldId) ? s.progress : { ...s.progress, visited: [...s.progress.visited, worldId] },
        }))
        get().unlock('logged-in')
        if (!get().progress.items.includes('holo-map')) get().grantItem('holo-map')
      },

      travel: (world, spawnId = 'default') => {
        if (get().transition.active) return
        const def = WORLDS[world]
        void def.preload()
        sfx('portal')
        set({ transition: { active: true, label: def.layout.name }, prompt: null })
        if (get().race.status !== 'idle') get().cancelRace()
        window.setTimeout(() => {
          set((s) => ({
            worldId: world,
            spawnId,
            worldEpoch: s.worldEpoch + 1,
            locationBanner: Date.now(),
            progress: s.progress.visited.includes(world) ? s.progress : { ...s.progress, visited: [...s.progress.visited, world] },
          }))
          if (world !== 'hub') get().unlock('traveler')
          window.setTimeout(() => set({ transition: { active: false, label: '' } }), 700)
        }, 750)
      },

      openOverlay: (overlay) => {
        set({ overlay })
        if (document.pointerLockElement) document.exitPointerLock()
      },
      closeOverlay: () => set({ overlay: null }),

      setPrompt: (prompt) => set({ prompt }),

      toast: (t) => {
        const id = toastId++
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
        window.setTimeout(() => get().dismissToast(id), t.kind === 'achievement' ? 4200 : 3000)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      collectCoin: (id) => {
        const p = get().progress
        if (p.collected.includes(id)) return
        const collected = [...p.collected, id]
        set({ progress: { ...p, collected, wallet: p.wallet + 1 } })
        sfx('coin')
        get().toast({ kind: 'coin', title: '+1 OASIS Coin', body: `${collected.length} / ${TOTAL_COINS} found` })
        if (collected.length >= 10) get().unlock('coins-10')
        if (collected.length >= TOTAL_COINS) get().unlock('coins-all')
      },

      grantItem: (id, silent) => {
        const p = get().progress
        if (p.items.includes(id)) return
        set({ progress: { ...p, items: [...p.items, id] } })
        if (!silent) {
          sfx('unlock')
          get().toast({ kind: 'item', title: `Item acquired: ${ITEMS[id]?.name ?? id}`, body: 'Open your inventory with I' })
        }
        if (id === 'copper-key') get().unlock('key')
      },

      discoverSecret: (id) => {
        const p = get().progress
        if (p.secrets.includes(id)) return
        const secrets = [...p.secrets, id]
        set({ progress: { ...p, secrets } })
        sfx('secret')
        const def = SECRETS.find((s) => s.id === id)
        get().toast({ kind: 'secret', title: 'Secret discovered!', body: def?.name })
        get().unlock('secret-1')
        if (secrets.length >= SECRETS.length) get().unlock('secret-all')
      },

      unlock: (id) => {
        const p = get().progress
        if (p.achievements.includes(id)) return
        const def = ACHIEVEMENTS.find((a) => a.id === id)
        if (!def) return
        set({ progress: { ...p, achievements: [...p.achievements, id] } })
        window.setTimeout(() => sfx('achievement'), 250)
        get().toast({ kind: 'achievement', title: `Achievement: ${def.title}`, body: def.desc })
      },

      addWallet: (n) => set((s) => ({ progress: { ...s.progress, wallet: Math.max(0, s.progress.wallet + n) } })),

      redeemPrize: (item) => {
        const prize = PRIZES.find((p) => p.item === item)
        const p = get().progress
        if (!prize || p.items.includes(item) || p.wallet < prize.price) {
          sfx('error')
          return false
        }
        set({ progress: { ...p, wallet: p.wallet - prize.price } })
        get().grantItem(item)
        get().unlock('shopper')
        return true
      },

      equipItem: (item) => {
        const def = ITEMS[item]
        const a = get().avatar
        if (!def?.equip || !a || !get().progress.items.includes(item)) return
        const { slot, value } = def.equip
        const next = { ...a, [slot]: a[slot] === value ? 'none' : value } as AvatarConfig
        set({ avatar: next })
        sfx('select')
      },

      reportScore: (game, score) => {
        const p = get().progress
        const prev = p.highScores[game] ?? 0
        const best = score > prev
        const cab = CABINETS[game]
        const reward = score >= cab.target && !p.claimedCabinets.includes(game)
        set({
          progress: {
            ...p,
            highScores: best ? { ...p.highScores, [game]: score } : p.highScores,
            claimedCabinets: reward ? [...p.claimedCabinets, game] : p.claimedCabinets,
            wallet: reward ? p.wallet + 3 : p.wallet,
          },
        })
        if (reward) {
          get().toast({ kind: 'coin', title: '+3 OASIS Coins', body: `${cab.title} target beaten` })
          get().grantItem('champion-ticket')
          get().unlock('arcade-ace')
        }
        return { best, reward }
      },

      openGate: () => {
        const p = get().progress
        if (p.gateOpened || !p.items.includes('copper-key')) return
        set({ progress: { ...p, gateOpened: true, wallet: p.wallet + 5 } })
        sfx('unlock')
        get().toast({ kind: 'coin', title: '+5 OASIS Coins', body: 'The First Gate rewards you.' })
        get().unlock('gate')
      },

      nextOracle: () => {
        const p = get().progress
        const i = p.oracleIndex
        set({ progress: { ...p, oracleIndex: i + 1 } })
        return i
      },

      startRace: () => {
        const now = performance.now()
        set((s) => ({ race: { ...s.race, status: 'countdown', countdownEnd: now + 3000, startedAt: now + 3000, next: 0 } }))
      },

      raceCheckpoint: (index, total) => {
        const r = get().race
        if (r.status !== 'running' || index !== r.next) return
        if (index < total - 1) {
          sfx('checkpoint')
          set({ race: { ...r, next: index + 1 } })
          return
        }
        const time = (performance.now() - r.startedAt) / 1000
        const p = get().progress
        const best = p.bestRace === null || time < p.bestRace
        set({ race: { ...r, status: 'idle', next: 0, lastTime: time }, progress: best ? { ...p, bestRace: time } : p })
        sfx('achievement')
        get().toast({ kind: 'info', title: `Finish! ${time.toFixed(2)}s`, body: best ? 'New personal best' : `Best: ${p.bestRace?.toFixed(2)}s` })
        get().grantItem('race-badge')
        get().unlock('racer')
        if (time < RACE_FAST_TIME) get().unlock('racer-fast')
      },

      cancelRace: () => set((s) => ({ race: { ...s.race, status: 'idle', next: 0 } })),

      setEnergy: (energy) => set({ energy }),
      setPointerLocked: (pointerLocked) => set({ pointerLocked }),
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      resetProgress: () => {
        set({
          progress: initialProgress(),
          avatar: null,
          worldId: 'hub',
          spawnId: 'default',
          overlay: null,
          phase: 'title',
          race: { status: 'idle', countdownEnd: 0, startedAt: 0, next: 0, lastTime: null },
        })
      },
    }),
    {
      name: 'oasis-save-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ avatar: s.avatar, worldId: s.worldId, progress: s.progress, settings: s.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>
        const progress = { ...initialProgress(), ...(p.progress ?? {}) }
        return {
          ...current,
          progress,
          settings: { ...defaultSettings, ...(p.settings ?? {}) },
          worldId: p.worldId && p.worldId in WORLDS ? p.worldId : 'hub',
          avatar: p.avatar ? sanitizeAvatar(p.avatar, progress.items) : null,
        }
      },
    },
  ),
)

/** Debug/test handle. */
if (typeof window !== 'undefined') (window as unknown as { __oasis: typeof useGame }).__oasis = useGame

export function getObjective(p: Progress, race: RaceState): { title: string; detail: string } {
  if (race.status !== 'idle') return { title: 'Velocity Circuit', detail: 'Pass through every checkpoint ring' }
  if (!p.visited.includes('arcade')) return { title: 'Explore OASIS Prime', detail: 'Find the portal to the Arcade District (north)' }
  if (!p.items.includes('copper-key')) return { title: 'The Founder’s Trail', detail: 'Find the machine that will not play' }
  if (!p.gateOpened) return { title: 'The Founder’s Trail', detail: 'Bring the Copper Key to the Founder’s Gate' }
  if (p.bestRace === null) return { title: 'Prove your speed', detail: 'Set a time on the Velocity Circuit (east)' }
  if (p.secrets.length < SECRETS.length) return { title: 'Hidden signals', detail: `Discover every secret (${p.secrets.length}/${SECRETS.length})` }
  if (p.collected.length < TOTAL_COINS) return { title: 'Treasure hunter', detail: `Collect every coin (${p.collected.length}/${TOTAL_COINS})` }
  return { title: 'Trial I complete', detail: 'The Founder’s next lock awaits a new signal' }
}
