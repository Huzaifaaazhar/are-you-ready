import { Vector3 } from 'three'

/** Live player transform, written by the controller every frame and read by triggers, map and HUD. */
export const playerState = {
  position: new Vector3(0, 1, 0),
  velocity: new Vector3(),
  grounded: true,
  heading: 0,
  cameraYaw: 0,
  /** Set by the controller; call to teleport the player. */
  teleport: null as null | ((p: [number, number, number], yaw?: number) => void),
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
