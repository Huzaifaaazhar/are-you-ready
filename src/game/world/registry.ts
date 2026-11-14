import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { WorldId, WorldLayout } from '../../data/content'
import { HUB_LAYOUT } from './hub/layout'
import { ARCADE_LAYOUT } from './arcade/layout'

export interface WorldVisuals {
  fog: string
  fogNear: number
  fogFar: number
  background: string
  ambient: string
  ambientIntensity: number
  /** Ambient music preset name. */
  music: 'hub' | 'arcade'
}

export interface WorldDefinition {
  layout: WorldLayout
  visuals: WorldVisuals
  /** Heavy 3D content is code-split and only loaded when the player travels there. */
  Component: LazyExoticComponent<ComponentType>
  preload: () => Promise<unknown>
}

const hubImport = () => import('./hub/HubWorld')
const arcadeImport = () => import('./arcade/ArcadeWorld')

export const WORLDS: Record<WorldId, WorldDefinition> = {
  hub: {
    layout: HUB_LAYOUT,
    visuals: { fog: '#0a0420', fogNear: 40, fogFar: 230, background: '#05010f', ambient: '#6a5cff', ambientIntensity: 0.55, music: 'hub' },
    Component: lazy(hubImport),
    preload: hubImport,
  },
  arcade: {
    layout: ARCADE_LAYOUT,
    visuals: { fog: '#12021c', fogNear: 25, fogFar: 110, background: '#07010d', ambient: '#ff5cd6', ambientIntensity: 0.45, music: 'arcade' },
    Component: lazy(arcadeImport),
    preload: arcadeImport,
  },
}

export const WORLD_ORDER: WorldId[] = ['hub', 'arcade']

export const TOTAL_COINS = WORLD_ORDER.reduce((n, id) => n + WORLDS[id].layout.coins.length, 0)
