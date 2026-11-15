import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { WorldId, WorldLayout } from '../../data/content'
import { HUB_LAYOUT } from './hub/layout'
import { ARCADE_LAYOUT } from './arcade/layout'
import { RACE_LAYOUT } from './race/layout'
import { PAST_LAYOUT } from './trials/past/layout'
import { PRESENT_LAYOUT } from './trials/present/layout'
import { FUTURE_LAYOUT } from './trials/future/layout'

export interface WorldVisuals {
  fog: string
  fogNear: number
  fogFar: number
  background: string
  ambient: string
  ambientIntensity: number
  /** Ambient music preset name. */
  music: 'hub' | 'arcade' | 'race' | 'past' | 'present' | 'future'
  gravity?: number
}

export interface WorldDefinition {
  layout: WorldLayout
  visuals: WorldVisuals
  /** Heavy 3D content is code-split and only loaded when the player travels there. */
  Component: LazyExoticComponent<ComponentType>
  preload: () => Promise<unknown>
  /** On-foot worlds spawn the avatar controller; the race world spawns a vehicle itself. */
  onFoot: boolean
  /** Listed in the atlas for fast travel once visited. */
  travel: boolean
}

const hubImport = () => import('./hub/HubWorld')
const arcadeImport = () => import('./arcade/ArcadeWorld')
const raceImport = () => import('./race/RaceWorld')
const pastImport = () => import('./trials/past/PastWorld')
const presentImport = () => import('./trials/present/PresentWorld')
const futureImport = () => import('./trials/future/FutureWorld')

export const WORLDS: Record<WorldId, WorldDefinition> = {
  hub: {
    layout: HUB_LAYOUT,
    visuals: { fog: '#0a0420', fogNear: 40, fogFar: 230, background: '#05010f', ambient: '#6a5cff', ambientIntensity: 0.55, music: 'hub' },
    Component: lazy(hubImport),
    preload: hubImport,
    onFoot: true,
    travel: true,
  },
  arcade: {
    layout: ARCADE_LAYOUT,
    visuals: { fog: '#12021c', fogNear: 25, fogFar: 110, background: '#07010d', ambient: '#ff5cd6', ambientIntensity: 0.45, music: 'arcade' },
    Component: lazy(arcadeImport),
    preload: arcadeImport,
    onFoot: true,
    travel: true,
  },
  race: {
    layout: RACE_LAYOUT,
    visuals: { fog: '#06102a', fogNear: 80, fogFar: 420, background: '#03000c', ambient: '#5c8cff', ambientIntensity: 0.6, music: 'race', gravity: -18 },
    Component: lazy(raceImport),
    preload: raceImport,
    onFoot: false,
    travel: true,
  },
  past: {
    layout: PAST_LAYOUT,
    visuals: { fog: '#1a0e08', fogNear: 18, fogFar: 70, background: '#0c0604', ambient: '#ffb070', ambientIntensity: 0.55, music: 'past' },
    Component: lazy(pastImport),
    preload: pastImport,
    onFoot: true,
    travel: false,
  },
  present: {
    layout: PRESENT_LAYOUT,
    visuals: { fog: '#06101c', fogNear: 25, fogFar: 90, background: '#03070f', ambient: '#9ec4ff', ambientIntensity: 0.6, music: 'present' },
    Component: lazy(presentImport),
    preload: presentImport,
    onFoot: true,
    travel: false,
  },
  future: {
    layout: FUTURE_LAYOUT,
    visuals: { fog: '#0a1420', fogNear: 30, fogFar: 140, background: '#050a12', ambient: '#c8f4ff', ambientIntensity: 0.7, music: 'future' },
    Component: lazy(futureImport),
    preload: futureImport,
    onFoot: true,
    travel: false,
  },
}

export const WORLD_ORDER: WorldId[] = ['hub', 'arcade', 'race']

export const TOTAL_COINS = WORLD_ORDER.reduce((n, id) => n + WORLDS[id].layout.coins.length, 0)
