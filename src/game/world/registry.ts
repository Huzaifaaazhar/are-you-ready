import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { WorldId, WorldLayout } from '../../data/content'
import type { AmbiencePreset } from '../systems/ambience'
import { HUB_LAYOUT } from './hub/layout'
import { ARCADE_LAYOUT } from './arcade/layout'
import { RACE_LAYOUT } from './race/layout'
import { PAST_LAYOUT } from './trials/past/layout'
import { PRESENT_LAYOUT } from './trials/present/layout'
import { FUTURE_LAYOUT } from './trials/future/layout'
import { CITY_LAYOUT } from './city/layout'
import { FANTASY_LAYOUT } from './fantasy/layout'
import { WASTELAND_LAYOUT } from './wasteland/layout'
import { SHOWDOWN_LAYOUT } from './showdown/layout'

export interface WorldVisuals {
  fog: string
  fogNear: number
  fogFar: number
  background: string
  ambient: string
  ambientIntensity: number
  /** Ambient music preset name. */
  music: 'hub' | 'arcade' | 'race' | 'past' | 'present' | 'future' | 'city' | 'fantasy' | 'wasteland' | 'showdown'
  /** Ambient sound-bed preset. */
  ambience: AmbiencePreset
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
const cityImport = () => import('./city/CityWorld')
const fantasyImport = () => import('./fantasy/FantasyWorld')
const wastelandImport = () => import('./wasteland/WastelandWorld')
const showdownImport = () => import('./showdown/ShowdownWorld')

export const WORLDS: Record<WorldId, WorldDefinition> = {
  hub: {
    layout: HUB_LAYOUT,
    visuals: { fog: '#0a0420', fogNear: 40, fogFar: 230, background: '#05010f', ambient: '#6a5cff', ambientIntensity: 0.55, music: 'hub', ambience: 'hub' },
    Component: lazy(hubImport),
    preload: hubImport,
    onFoot: true,
    travel: true,
  },
  arcade: {
    layout: ARCADE_LAYOUT,
    visuals: { fog: '#12021c', fogNear: 25, fogFar: 110, background: '#07010d', ambient: '#ff5cd6', ambientIntensity: 0.45, music: 'arcade', ambience: 'arcade' },
    Component: lazy(arcadeImport),
    preload: arcadeImport,
    onFoot: true,
    travel: true,
  },
  race: {
    layout: RACE_LAYOUT,
    visuals: { fog: '#06102a', fogNear: 80, fogFar: 420, background: '#03000c', ambient: '#5c8cff', ambientIntensity: 0.6, music: 'race', gravity: -18, ambience: 'race' },
    Component: lazy(raceImport),
    preload: raceImport,
    onFoot: false,
    travel: true,
  },
  past: {
    layout: PAST_LAYOUT,
    visuals: { fog: '#1a0e08', fogNear: 18, fogFar: 70, background: '#0c0604', ambient: '#ffb070', ambientIntensity: 0.55, music: 'past', ambience: 'trial' },
    Component: lazy(pastImport),
    preload: pastImport,
    onFoot: true,
    travel: false,
  },
  present: {
    layout: PRESENT_LAYOUT,
    visuals: { fog: '#06101c', fogNear: 25, fogFar: 90, background: '#03070f', ambient: '#9ec4ff', ambientIntensity: 0.6, music: 'present', ambience: 'trial' },
    Component: lazy(presentImport),
    preload: presentImport,
    onFoot: true,
    travel: false,
  },
  future: {
    layout: FUTURE_LAYOUT,
    visuals: { fog: '#0a1420', fogNear: 30, fogFar: 140, background: '#050a12', ambient: '#c8f4ff', ambientIntensity: 0.7, music: 'future', ambience: 'trial' },
    Component: lazy(futureImport),
    preload: futureImport,
    onFoot: true,
    travel: false,
  },
  city: {
    layout: CITY_LAYOUT,
    visuals: { fog: '#140a28', fogNear: 30, fogFar: 170, background: '#05020f', ambient: '#8a6cff', ambientIntensity: 0.6, music: 'city', ambience: 'city' },
    Component: lazy(cityImport),
    preload: cityImport,
    onFoot: true,
    travel: true,
  },
  fantasy: {
    layout: FANTASY_LAYOUT,
    visuals: { fog: '#ffd8b8', fogNear: 70, fogFar: 260, background: '#9cc0ff', ambient: '#fff0d8', ambientIntensity: 0.45, music: 'fantasy', ambience: 'fantasy' },
    Component: lazy(fantasyImport),
    preload: fantasyImport,
    onFoot: true,
    travel: true,
  },
  wasteland: {
    layout: WASTELAND_LAYOUT,
    visuals: { fog: '#12020a', fogNear: 12, fogFar: 85, background: '#040102', ambient: '#ff6a7a', ambientIntensity: 0.35, music: 'wasteland', ambience: 'wasteland' },
    Component: lazy(wastelandImport),
    preload: wastelandImport,
    onFoot: true,
    travel: true,
  },
  showdown: {
    layout: SHOWDOWN_LAYOUT,
    visuals: { fog: '#0c0004', fogNear: 30, fogFar: 140, background: '#000000', ambient: '#ff4060', ambientIntensity: 0.5, music: 'showdown', ambience: 'showdown' },
    Component: lazy(showdownImport),
    preload: showdownImport,
    onFoot: true,
    travel: false,
  },
}

export const WORLD_ORDER: WorldId[] = ['hub', 'arcade', 'race', 'city', 'fantasy', 'wasteland']

export const TOTAL_COINS = WORLD_ORDER.reduce((n, id) => n + WORLDS[id].layout.coins.length, 0)
