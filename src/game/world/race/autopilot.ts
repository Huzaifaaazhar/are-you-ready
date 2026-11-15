import { Quaternion, Vector3 } from 'three'
import type { RapierRigidBody } from '@react-three/rapier'
import { PATHS } from './layout'
import { samplePath } from './track'
import type { ControlInput } from './Vehicle'

/**
 * Debug/test waypoint follower. It drives through the same control inputs a player uses
 * (throttle, steering, boost) so automated tests exercise the real vehicle physics.
 */
const route = (() => {
  const byId = (id: string) => PATHS.find((p) => p.id === id)!
  const pts: Vector3[] = [new Vector3(0, 0, 14)]
  pts.push(...samplePath(byId('highway')).map((p) => p.setX(p.x + 2.25)))
  pts.push(new Vector3(6, 0, 280))
  pts.push(
    ...samplePath(byId('skyway')).map((p) => {
      // keep to the open (west) side where the tower falls
      if (p.z > 375 && p.z < 425) p.x -= 4.5
      return p
    }),
  )
  pts.push(new Vector3(0, 0, 540))
  pts.push(...samplePath(byId('approach')))
  pts.push(...samplePath(byId('landing')))
  pts.push(new Vector3(0, 0, 820))
  return pts
})()

const undercity = (() => {
  const byId = (id: string) => PATHS.find((p) => p.id === id)!
  const pts: Vector3[] = samplePath(byId('undercity')).slice(1)
  pts.push(new Vector3(0, 0, 540))
  pts.push(...samplePath(byId('approach')))
  pts.push(...samplePath(byId('landing')))
  pts.push(new Vector3(0, 0, 820))
  return pts
})()

let active = route
let idx = 0

/** Debug/test: choose which line the autopilot follows. */
export function setAutopilotRoute(name: 'main' | 'undercity') {
  active = name === 'main' ? route : undercity
  idx = 0
}
const q = new Quaternion()
const fwd = new Vector3()

export function resetAutopilot() {
  idx = 0
}

export function autopilotControls(b: RapierRigidBody): ControlInput {
  const t = b.translation()
  const pos = new Vector3(t.x, t.y, t.z)
  // advance along the route
  let best = idx
  let bestD = Infinity
  for (let i = idx; i < Math.min(active.length, idx + 12); i++) {
    const d = active[i].distanceToSquared(pos)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  idx = best
  const target = active[Math.min(active.length - 1, idx + 3)]
  const r = b.rotation()
  q.set(r.x, r.y, r.z, r.w)
  fwd.set(0, 0, 1).applyQuaternion(q)
  const yaw = Math.atan2(fwd.x, fwd.z)
  const want = Math.atan2(target.x - pos.x, target.z - pos.z)
  let diff = want - yaw
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  // A positive yaw difference means the target is to the left (+x when facing +z) → steer left (negative).
  const steer = Math.max(-1, Math.min(1, -diff * 2.5))
  const lin = b.linvel()
  const speed = Math.hypot(lin.x, lin.z)
  const sharp = Math.abs(diff) > 0.35
  return { throttle: sharp && speed > 22 ? 0 : 1, steer, handbrake: false, boost: !sharp && Math.abs(diff) < 0.12 }
}
