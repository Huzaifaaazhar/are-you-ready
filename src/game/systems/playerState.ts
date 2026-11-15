import { Vector3 } from 'three'

/** Live player transform, written by the controller every frame and read by triggers, map and HUD. */
export const playerState = {
  position: new Vector3(0, 1, 0),
  velocity: new Vector3(),
  grounded: true,
  heading: 0,
  cameraYaw: 0,
  /** True while phase-dashing: hazards that check it let the player pass. */
  phasing: false,
  dashCooldownUntil: 0,
  /** World checkpoint used when the player falls or hits a hazard (null = world spawn). */
  checkpoint: null as null | { pos: [number, number, number]; yaw: number },
  /** Active ballistic launch from a jump pad. */
  launchVel: new Vector3(),
  launchUntil: 0,
  /** Set by the controller; call to teleport the player. */
  teleport: null as null | ((p: [number, number, number], yaw?: number) => void),
}

const GRAVITY = 22

/** Launch the player in an arc that lands on `target`, peaking `apex` metres above the higher end. */
export function launchTo(target: [number, number, number], apex = 3) {
  const p = playerState.position
  const footY = p.y - 0.85
  const dy = target[1] - footY
  const H = Math.max(dy, 0) + apex
  const vy = Math.sqrt(2 * GRAVITY * H)
  const tUp = vy / GRAVITY
  const tDown = Math.sqrt((2 * (H - dy)) / GRAVITY)
  const T = tUp + tDown
  playerState.launchVel.set((target[0] - p.x) / T, vy, (target[2] - p.z) / T)
  playerState.launchUntil = performance.now() + T * 1000 + 150
}

export function distanceTo(x: number, y: number, z: number) {
  const p = playerState.position
  const dx = p.x - x
  const dy = p.y - y
  const dz = p.z - z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/** Debug/test handle (read-only use from the console or automated tests). */
if (typeof window !== 'undefined') (window as unknown as { __player: typeof playerState }).__player = playerState
