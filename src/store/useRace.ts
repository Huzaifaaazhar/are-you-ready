import { create } from 'zustand'
import type { Vec3 } from '../data/content'
import { RACE_START } from '../game/world/race/layout'

export type RaceStatus = 'garage' | 'countdown' | 'racing' | 'finished'

interface RaceStore {
  status: RaceStatus
  countdownEnd: number
  startTime: number
  /** Index of the next checkpoint to reach. */
  cp: number
  respawn: { pos: Vec3; yaw: number }
  finishTime: number | null
  result: { best: boolean; unlocked: string[] } | null
  /** Incremented to reset the car and every hazard to its start state. */
  resetToken: number
  /** Debug/test: drive the car with the built-in waypoint follower. */
  autopilot: boolean
  start: () => void
  reset: () => void
}

/** Live vehicle telemetry (mutable, read by the HUD every animation frame). */
export const carState = {
  speed: 0,
  boost: 100,
  boosting: false,
  drifting: false,
  airborne: false,
  wheelsOnGround: 4,
  respawnRequest: false,
  /** Debug/test: place the car (set by the vehicle controller). */
  teleport: null as null | ((pos: Vec3, yaw: number) => void),
}

export const useRace = create<RaceStore>((set) => ({
  status: 'garage',
  countdownEnd: 0,
  startTime: 0,
  cp: 0,
  respawn: RACE_START,
  finishTime: null,
  result: null,
  resetToken: 0,
  autopilot: false,
  start: () =>
    set((s) => ({
      status: 'countdown',
      countdownEnd: performance.now() + 3000,
      startTime: performance.now() + 3000,
      cp: 0,
      respawn: RACE_START,
      finishTime: null,
      result: null,
      resetToken: s.resetToken + 1,
    })),
  reset: () => set((s) => ({ status: 'garage', cp: 0, respawn: RACE_START, finishTime: null, result: null, resetToken: s.resetToken + 1 })),
}))

if (typeof window !== 'undefined') (window as unknown as { __race: typeof useRace; __car: typeof carState }).__race = useRace
if (typeof window !== 'undefined') (window as unknown as { __car: typeof carState }).__car = carState
if (typeof window !== 'undefined')
  void import('../game/world/race/autopilot').then((m) => ((window as unknown as { __autopilotRoute: typeof m.setAutopilotRoute }).__autopilotRoute = m.setAutopilotRoute))
