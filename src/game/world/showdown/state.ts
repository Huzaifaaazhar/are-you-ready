import { create } from 'zustand'
import type { Vec3 } from '../../../data/content'
import { useGame } from '../../../store/useGame'
import { playerState } from '../../systems/playerState'
import { sfx } from '../../systems/audio'
import { GLYPH_SOCKETS, MEMORY_PLINTHS, SD } from './layout'

export type Stage = 'prep' | 'infil' | 'puzzle' | 'boss' | 'choice'
export type Gift = 'aegis' | 'chronos' | 'beacon'

interface SdState {
  stage: Stage
  gift: Gift | null
  integrity: number
  invulnUntil: number
  titanHp: number
  charge: number[]
  spent: boolean[]
  stunUntil: number
  sockets: number[]
  plinths: number[]
  padStep: number
  lightsDone: boolean
  doorOpen: boolean
  lastCheck: { glyphs: boolean; memories: boolean } | null
}
export const fresh = (): SdState => ({
  stage: 'prep',
  gift: null,
  integrity: 3,
  invulnUntil: 0,
  titanHp: 3,
  charge: [0, 0, 0],
  spent: [false, false, false],
  stunUntil: 0,
  sockets: GLYPH_SOCKETS.map((s) => s.start),
  plinths: MEMORY_PLINTHS.map((s) => s.start),
  padStep: 0,
  lightsDone: false,
  doorOpen: false,
  lastCheck: null,
})
export const useShowdown = create<SdState>(() => fresh())
if (typeof window !== 'undefined') (window as unknown as { __showdown: typeof useShowdown }).__showdown = useShowdown

export const maxIntegrity = (gift: Gift | null) => (gift === 'aegis' ? 5 : 3)
/** Hazards run slower with the Chronos gift. */
export const tempo = () => (useShowdown.getState().gift === 'chronos' ? 0.75 : 1)

export const STAGE_START: Record<Stage, { pos: Vec3; yaw: number }> = {
  prep: { pos: SD.spawn, yaw: 0 },
  infil: SD.infilStart,
  puzzle: SD.puzzleStart,
  boss: SD.bossStart,
  choice: SD.coreStart,
}

/** Begin a stage: full integrity, checkpoint at its start. */
export function beginStage(stage: Stage, teleport = true) {
  const s = useShowdown.getState()
  const patch: Partial<SdState> = { stage, integrity: maxIntegrity(s.gift), invulnUntil: performance.now() + 1000 }
  if (stage === 'boss') Object.assign(patch, { titanHp: 3, charge: [0, 0, 0], spent: [false, false, false], stunUntil: 0 })
  useShowdown.setState(patch)
  playerState.checkpoint = { pos: STAGE_START[stage].pos, yaw: STAGE_START[stage].yaw }
  if (teleport) playerState.teleport?.(STAGE_START[stage].pos, STAGE_START[stage].yaw)
}

/** Damage from a hazard. Respawn sends you to the last checkpoint; at zero integrity the stage restarts. */
export function sdHit(reason: string, respawn: boolean) {
  const s = useShowdown.getState()
  const g = useGame.getState()
  if (performance.now() < s.invulnUntil || playerState.phasing || g.overlay) return
  const integrity = s.integrity - 1
  sfx('hurt')
  useShowdown.setState({ integrity, invulnUntil: performance.now() + 1500 })
  if (integrity <= 0) {
    g.openOverlay({
      type: 'sd-fail',
      title: 'Integrity lost',
      body: [`${reason} Your avatar’s integrity collapsed.`, s.stage === 'boss' ? 'The Null Titan resets. Watch the rings and the red circles, and charge the pylons between attacks.' : 'This stage restarts from its beginning.'],
    })
    return
  }
  g.toast({ kind: 'error', title: reason, body: `Integrity ${integrity}/${maxIntegrity(s.gift)}` })
  if (respawn) {
    const cp = playerState.checkpoint ?? STAGE_START[s.stage]
    playerState.teleport?.(cp.pos, cp.yaw)
  }
}

export function retryStage() {
  const s = useShowdown.getState()
  beginStage(s.stage === 'prep' ? 'infil' : s.stage)
}

